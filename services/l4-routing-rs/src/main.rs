use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use ordered_float::NotNan;
use serde::{Deserialize, Serialize};
use std::{
    cmp::Reverse,
    collections::{BinaryHeap, HashMap, HashSet},
    env,
    fs,
    net::SocketAddr,
    path::PathBuf,
    sync::{Arc, OnceLock},
};

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
}

#[derive(Deserialize)]
struct RouteQuery {
    from: Option<String>,
    to: Option<String>,
    from_ids: Option<String>,
    to_ids: Option<String>,
    max_hops: Option<usize>,
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
    edge_railways: Vec<String>,
    costs: RouteCosts,
}

#[derive(Serialize)]
struct RouteResponse {
    routes: Vec<RouteResult>,
    error: Option<String>,
}

#[derive(Clone)]
struct TransferInfo {
    walking_distance_meters: f64,
    base_tpi: f64,
    floor_difference: f64,
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
    if from_parts.len() > 2 && to_parts.len() > 1 && from_parts[2] == to_parts[1] {
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

                if let Some(station_info) = transfer_db().get(from_station_id) {
                    if let Some(info) = station_info.get(&to_line_id) {
                        transfer_time += info.base_tpi / 10.0;
                        transfer_time += info.floor_difference * 0.5;
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
    let mut origins = if query.from_ids.is_some() {
        parse_ids(query.from_ids)
    } else {
        parse_ids(query.from)
    };
    let mut dests = if query.to_ids.is_some() {
        parse_ids(query.to_ids)
    } else {
        parse_ids(query.to)
    };

    origins.retain(|s| !s.is_empty());
    dests.retain(|s| !s.is_empty());

    if origins.is_empty() || dests.is_empty() {
        let body = RouteResponse {
            routes: Vec::new(),
            error: Some("missing from/to".to_string()),
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
            signature_set.insert(signature);
            routes.push(result);
        }
    }

    (StatusCode::OK, Json(RouteResponse { routes, error: None }))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let graph_path = resolve_graph_path();
    let graph = load_graph(&graph_path)?;
    let state = AppState {
        graph: Arc::new(graph),
    };

    let app = Router::new()
        .route("/l4/route", get(route_handler))
        .with_state(state);

    let port: u16 = env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8787);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;
    Ok(())
}
