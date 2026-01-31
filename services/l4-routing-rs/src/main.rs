use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use ordered_float::NotNan;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::{
    cmp::Reverse,
    collections::{BinaryHeap, HashMap, HashSet},
    env,
    fs,
    net::SocketAddr,
    path::PathBuf,
    sync::{Arc, OnceLock},
};

mod resolver;
use resolver::{StationResolver, ResolvedStation};

#[derive(Deserialize)]
struct GraphData {
    adj: HashMap<String, HashMap<String, EdgeRaw>>,
}

#[derive(Deserialize)]
struct EdgeRaw {
    cost: f64,
    #[serde(rename = "railwayId")]
    railway_id: String,
}

#[derive(Clone)]
struct Edge {
    to: String,
    cost: f64,
    railway_id: String,
}

#[derive(Clone)]
struct Graph {
    adj: HashMap<String, Vec<Edge>>,
}

#[derive(Clone)]
struct AppState {
    graph: Arc<Graph>,
    resolver: Arc<StationResolver>,
}

#[derive(Deserialize)]
struct RouteQuery {
    from: Option<String>,
    to: Option<String>,
    from_ids: Option<String>,
    to_ids: Option<String>,
    max_hops: Option<usize>,
    locale: Option<String>,
}

#[derive(Serialize, Clone)]
struct RouteCosts {
    time: f64,
    transfers: i64,
    hops: i64,
    transfer_distance: f64,
    crowding: f64,
}

#[derive(Clone)]
struct PrevStep {
    prev: String,
    via_railway_id: String,
}

#[derive(Serialize)]
struct RouteResult {
    key: String,
    path: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    path_localized: Option<Vec<String>>,
    edge_railways: Vec<String>,
    costs: RouteCosts,
}

#[derive(Serialize)]
struct ResolvedInfo {
    from: Option<ResolvedStation>,
    to: Option<ResolvedStation>,
}

#[derive(Serialize)]
struct RouteResponse {
    routes: Vec<RouteResult>,
    #[serde(skip_serializing_if = "Option::is_none")]
    resolved: Option<ResolvedInfo>,
    error: Option<String>,
}

#[derive(Clone)]
struct TransferInfo {
    walking_distance_meters: f64,
    base_tpi: f64,
    floor_difference: f64,
}

#[derive(Deserialize)]
struct TransferInfoJson {
    walking_distance_meters: Option<f64>,
    base_tpi: Option<f64>,
    floor_difference: Option<f64>,
}

fn load_json_file<T: DeserializeOwned>(path: &str) -> Option<T> {
    let content = fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

fn transfer_db_overrides() -> Option<HashMap<String, HashMap<String, TransferInfo>>> {
    static OVERRIDES: OnceLock<Option<HashMap<String, HashMap<String, TransferInfo>>>> =
        OnceLock::new();
    OVERRIDES
        .get_or_init(|| {
            let path = env::var("L4_TRANSFER_DB_PATH").ok()?;
            let raw: HashMap<String, HashMap<String, TransferInfoJson>> = load_json_file(&path)?;
            let mut mapped: HashMap<String, HashMap<String, TransferInfo>> = HashMap::new();
            for (station, lines) in raw {
                let station_id = normalize_station_id(&station);
                let mut line_map: HashMap<String, TransferInfo> = HashMap::new();
                for (line, info) in lines {
                    let line_id = normalize_line_id(&line);
                    line_map.insert(
                        line_id,
                        TransferInfo {
                            walking_distance_meters: info.walking_distance_meters.unwrap_or(0.0),
                            base_tpi: info.base_tpi.unwrap_or(0.0),
                            floor_difference: info.floor_difference.unwrap_or(0.0),
                        },
                    );
                }
                let entry = mapped.entry(station_id).or_insert_with(HashMap::new);
                for (line_id, info) in line_map {
                    entry.insert(line_id, info);
                }
            }
            Some(mapped)
        })
        .clone()
}

fn preset_tpi_overrides() -> Option<HashMap<String, HashMap<String, f64>>> {
    static OVERRIDES: OnceLock<Option<HashMap<String, HashMap<String, f64>>>> = OnceLock::new();
    OVERRIDES
        .get_or_init(|| {
            let path = env::var("L4_PRESET_TPI_PATH").ok()?;
            let raw: HashMap<String, HashMap<String, f64>> = load_json_file(&path)?;
            let mut mapped: HashMap<String, HashMap<String, f64>> = HashMap::new();
            for (station, lines) in raw {
                let station_id = normalize_station_id(&station);
                let entry = mapped.entry(station_id).or_insert_with(HashMap::new);
                for (line, value) in lines {
                    entry.insert(normalize_line_id(&line), value);
                }
            }
            Some(mapped)
        })
        .clone()
}

fn transfer_db() -> &'static HashMap<String, HashMap<String, TransferInfo>> {
    static DB: OnceLock<HashMap<String, HashMap<String, TransferInfo>>> = OnceLock::new();
    DB.get_or_init(|| {
        let mut db: HashMap<String, HashMap<String, TransferInfo>> = HashMap::new();

        let mut kuramae_asakusa = HashMap::new();
        kuramae_asakusa.insert(
            "odpt.Railway:Toei.Oedo".to_string(),
            TransferInfo {
                walking_distance_meters: 270.0,
                base_tpi: 60.0,
                floor_difference: 2.0,
            },
        );
        db.insert(
            "odpt.Station:Toei.Asakusa.Kuramae".to_string(),
            kuramae_asakusa,
        );

        let mut kuramae_oedo = HashMap::new();
        kuramae_oedo.insert(
            "odpt.Railway:Toei.Asakusa".to_string(),
            TransferInfo {
                walking_distance_meters: 270.0,
                base_tpi: 60.0,
                floor_difference: 2.0,
            },
        );
        db.insert(
            "odpt.Station:Toei.Oedo.Kuramae".to_string(),
            kuramae_oedo,
        );

        let mut ueno = HashMap::new();
        ueno.insert(
            "odpt.Railway:TokyoMetro.Ginza".to_string(),
            TransferInfo {
                walking_distance_meters: 180.0,
                base_tpi: 30.0,
                floor_difference: 1.0,
            },
        );
        ueno.insert(
            "odpt.Railway:TokyoMetro.Hibiya".to_string(),
            TransferInfo {
                walking_distance_meters: 250.0,
                base_tpi: 45.0,
                floor_difference: 2.0,
            },
        );
        db.insert(
            "odpt.Station:JR-East.Yamanote.Ueno".to_string(),
            ueno,
        );

        let mut shinjuku = HashMap::new();
        shinjuku.insert(
            "odpt.Railway:Toei.Oedo".to_string(),
            TransferInfo {
                walking_distance_meters: 350.0,
                base_tpi: 70.0,
                floor_difference: 4.0,
            },
        );
        db.insert(
            "odpt.Station:JR-East.Yamanote.Shinjuku".to_string(),
            shinjuku,
        );

        let mut tokyo = HashMap::new();
        tokyo.insert(
            "odpt.Railway:JR-East.Keiyo".to_string(),
            TransferInfo {
                walking_distance_meters: 550.0,
                base_tpi: 80.0,
                floor_difference: 3.0,
            },
        );
        db.insert(
            "odpt.Station:JR-East.Tokaido.Tokyo".to_string(),
            tokyo,
        );

        let mut kanda = HashMap::new();
        kanda.insert(
            "odpt.Railway:JR-East.ChuoRapid".to_string(),
            TransferInfo {
                walking_distance_meters: 30.0,
                base_tpi: 10.0,
                floor_difference: 0.0,
            },
        );
        db.insert(
            "odpt.Station:JR-East.Yamanote.Kanda".to_string(),
            kanda,
        );
        if let Some(overrides) = transfer_db_overrides() {
            for (station, lines) in overrides {
                let entry = db.entry(station).or_insert_with(HashMap::new);
                for (line, info) in lines {
                    entry.insert(line, info);
                }
            }
        }
        db
    })
}

fn preset_tpi() -> &'static HashMap<String, HashMap<String, f64>> {
    static DB: OnceLock<HashMap<String, HashMap<String, f64>>> = OnceLock::new();
    DB.get_or_init(|| {
        let mut db: HashMap<String, HashMap<String, f64>> = HashMap::new();

        let mut tokyo = HashMap::new();
        tokyo.insert("odpt.Railway:JR-East.Keiyo".to_string(), 85.0);
        tokyo.insert("odpt.Railway:TokyoMetro.Marunouchi".to_string(), 30.0);
        db.insert("odpt.Station:JR-East.Tokaido.Tokyo".to_string(), tokyo);

        let mut shinjuku = HashMap::new();
        shinjuku.insert("odpt.Railway:Toei.Oedo".to_string(), 70.0);
        shinjuku.insert("odpt.Railway:TokyoMetro.Marunouchi".to_string(), 35.0);
        shinjuku.insert("odpt.Railway:Odakyu.Odawara".to_string(), 25.0);
        db.insert("odpt.Station:JR-East.Yamanote.Shinjuku".to_string(), shinjuku);

        let mut shibuya = HashMap::new();
        shibuya.insert("odpt.Railway:TokyoMetro.Fukutoshin".to_string(), 65.0);
        shibuya.insert("odpt.Railway:TokyoMetro.Ginza".to_string(), 40.0);
        shibuya.insert("odpt.Railway:Tokyu.Toyoko".to_string(), 50.0);
        db.insert("odpt.Station:JR-East.Yamanote.Shibuya".to_string(), shibuya);

        let mut ikebukuro = HashMap::new();
        ikebukuro.insert("odpt.Railway:TokyoMetro.Yurakucho".to_string(), 50.0);
        ikebukuro.insert("odpt.Railway:TokyoMetro.Marunouchi".to_string(), 35.0);
        ikebukuro.insert("odpt.Railway:Seibu.Ikebukuro".to_string(), 30.0);
        db.insert("odpt.Station:JR-East.Yamanote.Ikebukuro".to_string(), ikebukuro);

        let mut ueno = HashMap::new();
        ueno.insert("odpt.Railway:TokyoMetro.Ginza".to_string(), 40.0);
        ueno.insert("odpt.Railway:TokyoMetro.Hibiya".to_string(), 45.0);
        db.insert("odpt.Station:JR-East.Yamanote.Ueno".to_string(), ueno);

        let mut akihabara = HashMap::new();
        akihabara.insert("odpt.Railway:TokyoMetro.Hibiya".to_string(), 25.0);
        akihabara.insert("odpt.Railway:TX.TsukubaExpress".to_string(), 35.0);
        db.insert("odpt.Station:JR-East.Yamanote.Akihabara".to_string(), akihabara);
        if let Some(overrides) = preset_tpi_overrides() {
            for (station, lines) in overrides {
                let entry = db.entry(station).or_insert_with(HashMap::new);
                for (line, value) in lines {
                    entry.insert(line, value);
                }
            }
        }
        db
    })
}

fn get_hub_buffer_minutes(station_id: &str) -> f64 {
    let hubs = [
        ("Shinjuku", 4.0),
        ("Tokyo", 5.0),
        ("Shibuya", 4.0),
        ("Ikebukuro", 3.0),
        ("Shinagawa", 3.0),
        ("Ueno", 3.0),
        ("Omiya", 3.0),
        ("Yokohama", 3.0),
        ("Chiba", 3.0),
        ("NaritaAirport", 8.0),
        ("HanedaAirport", 6.0),
    ];

    for (key, minutes) in hubs {
        if station_id.contains(key) {
            return minutes;
        }
    }
    0.0
}

fn station_to_line_id(station_id: &str) -> Option<String> {
    let parts: Vec<&str> = station_id.split(':').collect();
    if parts.len() < 2 {
        return None;
    }
    let line_and_station = parts[1];
    let line_parts: Vec<&str> = line_and_station.split('.').collect();
    if line_parts.len() < 2 {
        return None;
    }
    let operator = line_parts[0];
    let line = line_parts[1];
    Some(format!("odpt.Railway:{}.{}", operator, line))
}

fn operator_from_station_id(station_id: &str) -> Option<String> {
    let parts: Vec<&str> = station_id.split(':').collect();
    if parts.len() < 2 {
        return None;
    }
    let line_and_station = parts[1];
    let line_parts: Vec<&str> = line_and_station.split('.').collect();
    if line_parts.is_empty() {
        return None;
    }
    Some(line_parts[0].to_string())
}

fn operator_from_line_id(line_id: &str) -> Option<String> {
    let parts: Vec<&str> = line_id.split(':').collect();
    if parts.len() < 2 {
        return None;
    }
    let line_parts: Vec<&str> = parts[1].split('.').collect();
    if line_parts.is_empty() {
        return None;
    }
    Some(line_parts[0].to_string())
}

fn get_transfer_distance(from_station_id: &str, to_line_id: &str) -> f64 {
    if let Some(station_info) = transfer_db().get(from_station_id) {
        if let Some(info) = station_info.get(to_line_id) {
            return info.walking_distance_meters;
        }
    }

    let from_parts: Vec<&str> = from_station_id.split('.').collect();
    let to_parts: Vec<&str> = to_line_id.split('.').collect();
    if from_parts.len() > 2 && to_parts.len() > 2 && from_parts[2] == to_parts[2] {
        100.0
    } else {
        250.0
    }
}

fn is_out_of_station_transfer(from_station_id: &str, to_line_id: &str, distance: f64) -> bool {
    if from_station_id.contains("Kuramae") {
        return true;
    }
    if let Some(station_info) = transfer_db().get(from_station_id) {
        if station_info.contains_key(to_line_id) {
            return distance > 200.0;
        }
    }
    distance > 200.0
}

fn normalize_station_id(input: &str) -> String {
    input.trim().replace("odpt:Station:", "odpt.Station:")
}

fn normalize_line_id(input: &str) -> String {
    input.trim().replace("odpt:Railway:", "odpt.Railway:")
}

fn parse_ids(param: Option<String>) -> Vec<String> {
    param
        .unwrap_or_default()
        .split(',')
        .map(|s| normalize_station_id(s))
        .filter(|s| !s.is_empty())
        .collect()
}

fn load_graph(path: &str) -> anyhow::Result<Graph> {
    let content = fs::read_to_string(path)?;
    let data: GraphData = serde_json::from_str(&content)?;
    let mut adj: HashMap<String, Vec<Edge>> = HashMap::new();
    for (from, edges) in data.adj {
        let mut list = Vec::new();
        for (to, raw) in edges {
            list.push(Edge {
                to,
                cost: raw.cost,
                railway_id: raw.railway_id,
            });
        }
        adj.insert(from, list);
    }
    Ok(Graph { adj })
}

fn resolve_graph_path() -> String {
    if let Ok(path) = env::var("ROUTING_GRAPH_PATH") {
        return path;
    }

    let base = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let candidate = base.join("../../public/data/routing_graph.json");
    if candidate.exists() {
        candidate.to_string_lossy().to_string()
    } else {
        "public/data/routing_graph.json".to_string()
    }
}

fn score_smart(costs: &RouteCosts) -> f64 {
    let time_score = costs.time * 0.65;
    let transfer_score = costs.transfers as f64 * 6.0 * 0.15;
    let distance_penalty = if costs.transfer_distance > 150.0 {
        (costs.transfer_distance - 150.0) * 1.5
    } else {
        0.0
    };
    let distance_score = (costs.transfer_distance / 100.0 * 5.0 + distance_penalty) * 0.15;
    let crowd_score = (costs.crowding / 10.0) * 0.05;
    time_score + transfer_score + distance_score + crowd_score
}

fn score_fastest(costs: &RouteCosts) -> f64 {
    costs.time + costs.transfers as f64 * 3.0
}

fn score_fewest_transfers(costs: &RouteCosts) -> f64 {
    costs.transfers as f64 * 1000.0 + costs.time
}

fn score_comfort(costs: &RouteCosts) -> f64 {
    costs.transfers as f64 * 60.0 + costs.transfer_distance * 0.3 + costs.time
}

fn find_best_route(
    graph: &Graph,
    origins: &[String],
    dests: &HashSet<String>,
    max_hops: usize,
    score_fn: fn(&RouteCosts) -> f64,
) -> Option<RouteResult> {
    let mut dist: HashMap<String, f64> = HashMap::new();
    let mut prev: HashMap<String, PrevStep> = HashMap::new();
    let mut costs_map: HashMap<String, RouteCosts> = HashMap::new();
    let mut heap: BinaryHeap<(Reverse<NotNan<f64>>, String)> = BinaryHeap::new();

    for origin in origins {
        let costs = RouteCosts {
            time: 0.0,
            transfers: 0,
            hops: 0,
            transfer_distance: 0.0,
            crowding: 20.0,
        };
        let score = score_fn(&costs);
        dist.insert(origin.clone(), score);
        costs_map.insert(origin.clone(), costs);
        if let Ok(score_val) = NotNan::new(score) {
            heap.push((Reverse(score_val), origin.clone()));
        }
    }

    while let Some((Reverse(score_val), node)) = heap.pop() {
        let best_score = dist.get(&node).copied().unwrap_or(f64::INFINITY);
        if score_val.into_inner() > best_score {
            continue;
        }
        if dests.contains(&node) {
            let costs = costs_map.get(&node).cloned()?;
            let mut path = vec![node.clone()];
            let mut edge_railways: Vec<String> = Vec::new();
            let mut current = node.clone();
            while let Some(step) = prev.get(&current) {
                edge_railways.insert(0, step.via_railway_id.clone());
                path.insert(0, step.prev.clone());
                current = step.prev.clone();
            }
            return Some(RouteResult {
                key: String::new(),
                path,
                path_localized: None,
                edge_railways,
                costs,
            });
        }

        let current_costs = match costs_map.get(&node) {
            Some(c) => c.clone(),
            None => continue,
        };

        if current_costs.hops as usize >= max_hops {
            continue;
        }

        let edges = match graph.adj.get(&node) {
            Some(e) => e,
            None => continue,
        };

        for edge in edges {
            let mut next_costs = current_costs.clone();
            next_costs.hops += 1;

            if edge.railway_id == "transfer" {
                let from_station_id = node.as_str();
                let to_line_id = match station_to_line_id(&edge.to) {
                    Some(id) => id,
                    None => {
                        continue;
                    }
                };
                let distance = get_transfer_distance(from_station_id, &to_line_id);
                let out_station = is_out_of_station_transfer(from_station_id, &to_line_id, distance);

                let mut transfer_time = distance / 60.0;
                if out_station {
                    transfer_time += 2.0;
                }

                let from_op = operator_from_station_id(from_station_id);
                let to_op = operator_from_line_id(&to_line_id);
                if from_op.is_some() && to_op.is_some() && from_op != to_op {
                    transfer_time += 1.5;
                }

                let mut hub_buffer = get_hub_buffer_minutes(from_station_id);
                if current_costs.hops < 4 {
                    hub_buffer *= 0.4;
                } else if current_costs.hops < 8 {
                    hub_buffer *= 0.7;
                }
                transfer_time += hub_buffer;

                let mut tpi_applied = false;
                if let Some(station_info) = transfer_db().get(from_station_id) {
                    if let Some(info) = station_info.get(&to_line_id) {
                        transfer_time += info.base_tpi / 10.0;
                        transfer_time += info.floor_difference * 0.5;
                        tpi_applied = true;
                    }
                }
                if !tpi_applied {
                    if let Some(station_info) = preset_tpi().get(from_station_id) {
                        if let Some(base_tpi) = station_info.get(&to_line_id) {
                            transfer_time += base_tpi / 10.0;
                        }
                    }
                }

                next_costs.time += transfer_time;
                next_costs.transfers += 1;
                next_costs.transfer_distance += distance;
            } else {
                next_costs.time += edge.cost;
                if edge.railway_id.contains("Yamanote") || edge.railway_id.contains("Chuo") {
                    next_costs.crowding = (next_costs.crowding + 5.0).min(100.0);
                }
            }

            let new_score = score_fn(&next_costs);
            let best = dist.get(&edge.to).copied();
            if best.map_or(true, |v| new_score < v) {
                dist.insert(edge.to.clone(), new_score);
                costs_map.insert(edge.to.clone(), next_costs.clone());
                prev.insert(
                    edge.to.clone(),
                    PrevStep {
                        prev: node.clone(),
                        via_railway_id: edge.railway_id.clone(),
                    },
                );
                if let Ok(score_val) = NotNan::new(new_score) {
                    heap.push((Reverse(score_val), edge.to.clone()));
                }
            }
        }
    }

    None
}

async fn route_handler(State(state): State<AppState>, Query(query): Query<RouteQuery>) -> impl IntoResponse {
    let locale = query.locale.as_deref().unwrap_or("ja");
    
    // Step 1: Resolve station names
    let (origins, from_resolved) = resolve_station_query(&state.resolver, &query.from, &query.from_ids);
    let (dests, to_resolved) = resolve_station_query(&state.resolver, &query.to, &query.to_ids);

    if origins.is_empty() || dests.is_empty() {
        let body = RouteResponse {
            routes: Vec::new(),
            resolved: Some(ResolvedInfo {
                from: from_resolved,
                to: to_resolved,
            }),
            error: Some("Could not resolve stations. Please provide valid station names or IDs.".to_string()),
        };
        return (StatusCode::BAD_REQUEST, Json(body));
    }

    let dest_set: HashSet<String> = dests.into_iter().collect();
    let max_hops = query.max_hops.unwrap_or(35);
    let profiles: Vec<(&str, fn(&RouteCosts) -> f64)> = vec![
        ("smart", score_smart),
        ("fastest", score_fastest),
        ("fewest_transfers", score_fewest_transfers),
        ("comfort", score_comfort),
    ];

    let mut routes: Vec<RouteResult> = Vec::new();
    let mut signature_set: HashSet<String> = HashSet::new();

    for (key, score_fn) in profiles {
        if let Some(mut result) = find_best_route(&state.graph, &origins, &dest_set, max_hops, score_fn) {
            let signature = format!("{}|{}", result.path.join(">"), result.edge_railways.join(","));
            if signature_set.contains(&signature) {
                continue;
            }
            result.key = key.to_string();
            // Localize path names
            result.path_localized = Some(state.resolver.localize_path(&result.path, locale));
            signature_set.insert(signature);
            routes.push(result);
        }
    }

    (StatusCode::OK, Json(RouteResponse { 
        routes, 
        resolved: Some(ResolvedInfo {
            from: from_resolved,
            to: to_resolved,
        }),
        error: None 
    }))
}

/// Helper to resolve station names from query parameters
fn resolve_station_query(
    resolver: &StationResolver,
    name_param: &Option<String>,
    id_param: &Option<String>,
) -> (Vec<String>, Option<ResolvedStation>) {
    // If explicit IDs provided, use them directly
    if let Some(ids) = id_param {
        let parsed = parse_ids(Some(ids.clone()));
        if !parsed.is_empty() {
            return (parsed, None);
        }
    }
    
    // Otherwise, try to resolve from name
    if let Some(name) = name_param {
        let name_trimmed = name.trim();
        if name_trimmed.is_empty() {
            return (Vec::new(), None);
        }
        
        // Check if this looks like an ODPT ID already
        if name_trimmed.starts_with("odpt.Station:") {
            return (vec![name_trimmed.to_string()], None);
        }
        
        // Resolve using fuzzy matching
        let resolved = resolver.resolve(name_trimmed, 3);
        if !resolved.is_empty() {
            let first = resolved[0].clone();
            let ids: Vec<String> = resolved.iter().map(|r| r.matched_id.clone()).collect();
            return (ids, Some(first));
        }
    }
    
    (Vec::new(), None)
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let graph_path = resolve_graph_path();
    let graph = load_graph(&graph_path)?;
    
    // Load station dictionary for fuzzy name resolution
    let dict_path = resolve_dict_path();
    let resolver = match StationResolver::from_file(std::path::Path::new(&dict_path)) {
        Ok(r) => {
            eprintln!("✅ Loaded station dictionary from: {}", dict_path);
            r
        }
        Err(e) => {
            eprintln!("⚠️ Failed to load station dictionary ({}): {}", dict_path, e);
            eprintln!("   Fuzzy matching will be limited. Creating empty resolver.");
            StationResolver::new(Vec::new())
        }
    };

    let state = AppState {
        graph: Arc::new(graph),
        resolver: Arc::new(resolver),
    };

    let app = Router::new()
        .route("/l4/route", get(route_handler))
        .route("/health", get(health_handler))
        .with_state(state);

    let port: u16 = env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8787);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    eprintln!("🚀 L4 Routing Service starting on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

fn resolve_dict_path() -> String {
    if let Ok(path) = env::var("STATION_DICT_PATH") {
        return path;
    }

    let base = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let candidate = base.join("../../public/data/station_dictionary.json");
    if candidate.exists() {
        candidate.to_string_lossy().to_string()
    } else {
        "public/data/station_dictionary.json".to_string()
    }
}

async fn health_handler() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "service": "l4-routing-rs",
        "features": ["fuzzy_matching", "i18n"]
    }))
}
