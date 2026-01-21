use anyhow::Result;
use futures::stream::{self, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;
use tracing::{info, warn};
use sqlx::FromRow; // Import FromRow

use crate::db::supabase::SupabaseClient;
use crate::utils::http::HttpClient;
use crate::utils::rate_limit::RateLimiter;

const OVERPASS_URL: &str = "https://overpass-api.de/api/interpreter";

#[derive(Debug, Deserialize)]
struct OverpassResponse {
    elements: Vec<OverpassElement>,
}

#[derive(Debug, Deserialize)]
struct OverpassElement {
    #[serde(rename = "type")]
    element_type: String,
    id: i64,
    lat: Option<f64>,
    lon: Option<f64>,
    center: Option<LatLon>,
    tags: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct LatLon {
    lat: f64,
    lon: f64,
}

// Added FromRow to support direct Type-Safe fetching from DB
#[derive(Debug, Deserialize, FromRow)] 
struct StationRecord {
    id: String,
    coordinates: serde_json::Value,
    name: serde_json::Value,
}

#[derive(Debug, Serialize)]
struct FacilityInsert {
    station_id: String,
    #[serde(rename = "type")]
    facility_type: String,
    name_i18n: serde_json::Value,
    location_coords: Option<String>,
    attributes: serde_json::Value,
    source_url: String,
    updated_at: String,
}

pub async fn run(radius: u32, delay_ms: u64, workers: usize, dry_run: bool) -> Result<()> {
    info!("🚀 Starting L3 Toilets ETL (Rust)");
    info!("   Radius: {}m, Delay: {}ms, Workers: {}, DryRun: {}", radius, delay_ms, workers, dry_run);

    let db = SupabaseClient::from_env()?;
    let http = HttpClient::new(Duration::from_secs(30));
    let rate_limiter = RateLimiter::new(workers, Duration::from_millis(delay_ms));

    // Fetch active stations using the specialized method
    let stations: Vec<StationRecord> = db.fetch_active_stations().await?;

    info!("📍 Found {} active stations", stations.len());

    let total = stations.len();
    let mut processed = 0;
    let mut total_inserted = 0;

    // Parallel processing with Tokio streams
    let results: Vec<_> = stream::iter(stations)
        .map(|station| {
            let http = http.clone();
            let db = db.clone();
            let rate_limiter = rate_limiter.clone();

            async move {
                // Rate limiting
                rate_limiter.wait().await;
                
                // Helper to just return 0 if coords are invalid
                let coords = match extract_coords(&station) {
                    Ok(c) => c,
                    Err(_) => return Ok::<_, anyhow::Error>(0),
                };

                let elements = fetch_overpass_toilets(&http, coords.0, coords.1, radius).await?;

                if elements.is_empty() {
                    return Ok::<_, anyhow::Error>(0);
                }

                let facilities: Vec<FacilityInsert> = elements
                    .into_iter()
                    .map(|el| transform_toilet(el, &station.id))
                    .collect();

                // Check existing OSM IDs
                let existing_ids = db.get_existing_osm_ids(&station.id, "toilet").await?;
                let new_facilities: Vec<_> = facilities
                    .into_iter()
                    .filter(|f| {
                        if let Some(attrs) = f.attributes.as_object() {
                            if let Some(osm_id) = attrs.get("osm_id").and_then(|v| v.as_i64()) {
                                return !existing_ids.contains(&osm_id);
                            }
                        }
                        true
                    })
                    .collect();

                if !new_facilities.is_empty() {
                    if dry_run {
                        info!("  [DRY RUN] {} - Would add {} new toilets", station.id, new_facilities.len());
                    } else {
                        db.insert_facilities(&new_facilities).await?;
                        info!("  ✅ {} - Added {} new toilets", station.id, new_facilities.len());
                    }
                    Ok(new_facilities.len())
                } else {
                    // info!("  ✨ {} - All toilets already exist", station.id);
                    Ok(0)
                }
            }
        })
        .buffer_unordered(workers) // Concurrent execution
        .collect()
        .await;

    // Aggregate results
    for result in results {
        processed += 1;
        match result {
            Ok(count) => total_inserted += count,
            Err(e) => warn!("Error processing station: {}", e),
        }
    }

    info!("============================================");
    if dry_run {
        info!("🚧 DRY RUN COMPLETE 🚧");
    } else {
        info!("📊 Toilet Supplement Complete!");
    }
    info!("   Processed: {}/{}", processed, total);
    info!("   Total Toilets Found/Added: {}", total_inserted);

    Ok(())
}

async fn fetch_overpass_toilets(
    http: &HttpClient,
    lat: f64,
    lon: f64,
    radius: u32,
) -> Result<Vec<OverpassElement>> {
    let query = format!(
        r#"
        [out:json][timeout:25];
        (
            node["amenity"="toilets"](around:{},{},{});
            way["amenity"="toilets"](around:{},{},{});
        );
        out center tags;
        "#,
        radius, lat, lon, radius, lat, lon
    );

    let body = format!("data={}", urlencoding::encode(&query));

    let response = http
        .post(OVERPASS_URL)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .await?;

    if response.status() == 429 {
        warn!("Overpass 429 (Too Many Requests)");
        // Backoff slightly
        tokio::time::sleep(Duration::from_secs(5)).await;
        return Ok(vec![]);
    }

    if !response.status().is_success() {
        warn!("Overpass returned {}", response.status());
        return Ok(vec![]);
    }

    let data: OverpassResponse = response.json().await?;
    Ok(data.elements)
}

fn extract_coords(station: &StationRecord) -> Result<(f64, f64)> {
    let coords = station.coordinates.as_object()
        .ok_or_else(|| anyhow::anyhow!("Invalid coordinates format"))?;

    let coords_array = coords.get("coordinates")
        .and_then(|c| c.as_array())
        .ok_or_else(|| anyhow::anyhow!("Missing coordinates array"))?;

    let lon = coords_array.get(0).and_then(|v| v.as_f64()).unwrap_or(0.0);
    let lat = coords_array.get(1).and_then(|v| v.as_f64()).unwrap_or(0.0);

    Ok((lat, lon))
}

fn transform_toilet(element: OverpassElement, station_id: &str) -> FacilityInsert {
    let tags = element.tags.as_ref();

    let name_en = tags
        .and_then(|t| t.get("name:en").or(t.get("name")))
        .and_then(|v| v.as_str())
        .unwrap_or("Public Restroom");

    let name_ja = tags
        .and_then(|t| t.get("name:ja").or(t.get("name")))
        .and_then(|v| v.as_str())
        .unwrap_or("公衆トイレ");

    let attributes = json!({
        "osm_id": element.id,
        "source": "OpenStreetMap",
        "fee": tags.and_then(|t| t.get("fee")).and_then(|v| v.as_str()) == Some("yes"),
        "wheelchair": tags.and_then(|t| t.get("wheelchair"))
            .and_then(|v| v.as_str())
            .map(|s| s == "yes" || s == "designated")
            .unwrap_or(false),
        "changing_table": tags.and_then(|t| t.get("changing_table").or(t.get("diaper")))
            .and_then(|v| v.as_str()) == Some("yes"),
        "unisex": tags.and_then(|t| t.get("unisex")).and_then(|v| v.as_str()) == Some("yes"),
        "operator": tags.and_then(|t| t.get("operator")).and_then(|v| v.as_str()),
    });

    let (lat, lon) = if let Some(center) = &element.center {
        (center.lat, center.lon)
    } else {
        (element.lat.unwrap_or(0.0), element.lon.unwrap_or(0.0))
    };

    FacilityInsert {
        station_id: station_id.to_string(),
        facility_type: "toilet".to_string(),
        name_i18n: json!({
            "en": name_en,
            "ja": name_ja,
        }),
        location_coords: if lat != 0.0 && lon != 0.0 {
            Some(format!("POINT({} {})", lon, lat))
        } else {
            None
        },
        attributes,
        source_url: format!(
            "https://www.openstreetmap.org/{}/{}",
            element.element_type, element.id
        ),
        updated_at: chrono::Utc::now().to_rfc3339(),
    }
}
