use anyhow::Result;
use odpt_client::OdptClient;
use std::env;
use std::fs::File;
use std::io::BufWriter;
use tracing::info;

pub async fn fetch_stations(operators: &str, output: Option<&str>) -> Result<()> {
    info!("🚄 Fetching ODPT Data (Stations + Timetables)...");

    let api_key = env::var("ODPT_API_KEY").expect("ODPT_API_KEY must be set");
    let mut client = OdptClient::new(api_key, false)?;

    if let Ok(redis_url) = env::var("REDIS_URL") {
        info!("🔌 Connecting to Redis cache at {}...", redis_url);
        client = client.with_redis_cache(&redis_url)?;
    }

    let operator_list: Vec<&str> = operators.split(',').collect();
    
    let mut all_stations = Vec::new();
    let mut all_timetables = Vec::new();

    for op in operator_list {
        info!("   Fetching for operator: {}", op);
        
        // 1. Fetch Stations
        let stations = client.get_stations(Some(op), None).await?;
        info!("   Found {} stations", stations.len());
        
        // Filter stations (Data Cleaning)
        let clean_stations: Vec<_> = stations.into_iter().filter(|s| {
            // Must have valid ID, Title, and Geo
            !s.id.is_empty() && !s.title.is_empty() && s.lat.is_some() && s.long.is_some()
        }).collect();
        info!("   Kept {} valid stations after cleaning", clean_stations.len());
        all_stations.extend(clean_stations);

        // 2. Fetch Timetables
        info!("   Fetching timetables for operator: {}", op);
        let timetables = client.get_station_timetables(Some(op), None, None).await?;
        info!("   Found {} timetables", timetables.len());
        
        // Filter timetables (Must have objects)
        let clean_timetables: Vec<_> = timetables.into_iter().filter(|t| {
            !t.timetable_objects.is_empty()
        }).collect();
         info!("   Kept {} valid timetables", clean_timetables.len());
        all_timetables.extend(clean_timetables);
    }

    if let Some(path) = output {
        // Save Stations
        let file_stations = File::create(path)?;
        let writer_stations = BufWriter::new(file_stations);
        serde_json::to_writer_pretty(writer_stations, &all_stations)?;
        info!("✅ Saved {} stations to {}", all_stations.len(), path);

        // Save Timetables (Append _timetables.json suffix)
        let tt_path = path.replace(".json", "_timetables.json");
        let file_tt = File::create(&tt_path)?;
        let writer_tt = BufWriter::new(file_tt);
        serde_json::to_writer_pretty(writer_tt, &all_timetables)?;
        info!("✅ Saved {} timetables to {}", all_timetables.len(), tt_path);
    } else {
        info!("✅ Fetched {} stations and {} timetables (no output file)", all_stations.len(), all_timetables.len());
    }

    Ok(())
}
