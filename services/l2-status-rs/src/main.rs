use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Duration as ChronoDuration, Utc};
use redis::AsyncCommands;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{postgres::PgPoolOptions, Row};
use std::{collections::{HashMap, HashSet}, env, net::SocketAddr, sync::{Arc, OnceLock}, time::{Duration, SystemTime, UNIX_EPOCH}};
use tokio::sync::RwLock;

const ODPT_BASE_URL_STANDARD: &str = "https://api.odpt.org/api/v4";
const ODPT_BASE_URL_CHALLENGE: &str = "https://api.odpt.org/api/v4";

#[derive(Clone)]
struct AppState {
    pool: sqlx::PgPool,
    redis: Option<redis::Client>,
    memory: Arc<MemoryCache>,
    http: reqwest::Client,
    config: Arc<Config>,
}

#[derive(Clone)]
struct Config {
    database_url: String,
    redis_url: Option<String>,
    odpt_key_standard: Option<String>,
    odpt_key_challenge: Option<String>,
}

#[derive(Clone)]
struct MemoryCache {
    inner: RwLock<HashMap<String, CacheEntry>>,
}

#[derive(Clone)]
struct CacheEntry {
    value: Value,
    expires_at_ms: u64,
}

impl MemoryCache {
    fn new() -> Self {
        Self { inner: RwLock::new(HashMap::new()) }
    }

    async fn get(&self, key: &str) -> Option<Value> {
        let now = now_ms();
        let guard = self.inner.read().await;
        guard.get(key).and_then(|entry| {
            if entry.expires_at_ms > now {
                Some(entry.value.clone())
            } else {
                None
            }
        })
    }

    async fn set(&self, key: String, value: Value, ttl: Duration) {
        let expires_at_ms = now_ms().saturating_add(ttl.as_millis() as u64);
        let mut guard = self.inner.write().await;
        guard.insert(key, CacheEntry { value, expires_at_ms });
    }
}

#[derive(Deserialize)]
struct StatusQuery {
    station_id: Option<String>,
    stationId: Option<String>,
}

#[derive(Serialize, Clone)]
struct LocalizedText {
    ja: String,
    en: String,
    zh: String,
}

#[derive(Serialize, Clone)]
struct LineStatus {
    line: String,
    name: LocalizedText,
    line_name: LocalizedText,
    operator: String,
    color: String,
    railway_id: Option<String>,
    status: String,
    status_detail: String,
    delay_minutes: Option<i64>,
    severity: String,
    message: Option<LocalizedText>,
}

#[derive(Serialize, Clone)]
struct CrowdInfo {
    level: i64,
    trend: String,
    userVotes: CrowdVotes,
}

#[derive(Serialize, Clone)]
struct CrowdVotes {
    total: i64,
    distribution: Vec<i64>,
}

#[derive(Serialize, Clone)]
struct WeatherInfo {
    temp: f64,
    condition: String,
    wind: f64,
}

#[derive(Serialize, Clone)]
struct L2Status {
    congestion: i64,
    crowd: CrowdInfo,
    line_status: Vec<LineStatus>,
    weather: WeatherInfo,
    updated_at: String,
    is_stale: bool,
    disruption_history: Vec<Value>,
}

#[derive(Clone)]
struct LineDef {
    id: String,
    name: LocalizedText,
    operator: String,
    color: String,
}

#[derive(Clone)]
struct Disruption {
    railway_id: String,
    status_text: String,
    message_ja: String,
    message_en: String,
    delay_minutes: Option<i64>,
    detail: String,
    severity: String,
    source: String,
}

#[derive(Clone)]
struct YahooStatus {
    name: String,
    status: String,
}

#[derive(Clone)]
struct JrEastSnapshot {
    fetched_at: String,
    line_status_text_map_ja: HashMap<String, String>,
}

static YAHOO_TO_ODPT_MAP: OnceLock<HashMap<String, String>> = OnceLock::new();
static JR_EAST_RAILWAY_HINT_JA: OnceLock<HashMap<String, String>> = OnceLock::new();

fn yahoo_to_odpt_map() -> &'static HashMap<String, String> {
    YAHOO_TO_ODPT_MAP.get_or_init(|| {
        let mut map = HashMap::new();
        map.insert("ＪＲ山手線".to_string(), "odpt.Railway:JR-East.Yamanote".to_string());
        map.insert("ＪＲ京浜東北根岸線".to_string(), "odpt.Railway:JR-East.KeihinTohoku".to_string());
        map.insert("ＪＲ京浜東北線".to_string(), "odpt.Railway:JR-East.KeihinTohoku".to_string());
        map.insert("ＪＲ中央線快速電車".to_string(), "odpt.Railway:JR-East.ChuoKaisoku".to_string());
        map.insert("ＪＲ中央・総武各駅停車".to_string(), "odpt.Railway:JR-East.ChuoSobu".to_string());
        map.insert("ＪＲ総武線快速電車".to_string(), "odpt.Railway:JR-East.SobuKaisoku".to_string());
        map.insert("ＪＲ埼京川越線".to_string(), "odpt.Railway:JR-East.Saikyo".to_string());
        map.insert("ＪＲ埼京線".to_string(), "odpt.Railway:JR-East.Saikyo".to_string());
        map.insert("ＪＲ湘南新宿ライン".to_string(), "odpt.Railway:JR-East.ShonanShinjuku".to_string());
        map.insert("東京メトロ銀座線".to_string(), "odpt.Railway:TokyoMetro.Ginza".to_string());
        map.insert("東京メトロ丸ノ內線".to_string(), "odpt.Railway:TokyoMetro.Marunouchi".to_string());
        map.insert("東京メトロ日比谷線".to_string(), "odpt.Railway:TokyoMetro.Hibiya".to_string());
        map.insert("東京メトロ東西線".to_string(), "odpt.Railway:TokyoMetro.Tozai".to_string());
        map.insert("東京メトロ千代田線".to_string(), "odpt.Railway:TokyoMetro.Chiyoda".to_string());
        map.insert("東京メトロ有楽町線".to_string(), "odpt.Railway:TokyoMetro.Yurakucho".to_string());
        map.insert("東京メトロ半蔵門線".to_string(), "odpt.Railway:TokyoMetro.Hanzomon".to_string());
        map.insert("東京メトロ南北線".to_string(), "odpt.Railway:TokyoMetro.Namboku".to_string());
        map.insert("東京メトロ副都心線".to_string(), "odpt.Railway:TokyoMetro.Fukutoshin".to_string());
        map.insert("都営浅草線".to_string(), "odpt.Railway:Toei.Asakusa".to_string());
        map.insert("都営三田線".to_string(), "odpt.Railway:Toei.Mita".to_string());
        map.insert("都営新宿線".to_string(), "odpt.Railway:Toei.Shinjuku".to_string());
        map.insert("都営大江戸線".to_string(), "odpt.Railway:Toei.Oedo".to_string());
        map.insert("ゆりかもめ".to_string(), "odpt.Railway:Yurikamome.Yurikamome".to_string());
        map.insert("りんかい線".to_string(), "odpt.Railway:TWR.Rinkai".to_string());
        map
    })
}

fn jr_east_railway_hint_ja() -> &'static HashMap<String, String> {
    JR_EAST_RAILWAY_HINT_JA.get_or_init(|| {
        let mut map = HashMap::new();
        map.insert("odpt.Railway:JR-East.Yamanote".to_string(), "山手線".to_string());
        map.insert("odpt.Railway:JR-East.KeihinTohoku".to_string(), "京浜東北線".to_string());
        map.insert("odpt.Railway:JR-East.ChuoKaisoku".to_string(), "中央線快速".to_string());
        map.insert("odpt.Railway:JR-East.ChuoSobu".to_string(), "中央・総武各駅停車".to_string());
        map.insert("odpt.Railway:JR-East.SobuKaisoku".to_string(), "総武快速線".to_string());
        map.insert("odpt.Railway:JR-East.Saikyo".to_string(), "埼京線".to_string());
        map.insert("odpt.Railway:JR-East.ShonanShinjuku".to_string(), "湘南新宿ライン".to_string());
        map.insert("odpt.Railway:JR-East.Tokaido".to_string(), "東海道線".to_string());
        map.insert("odpt.Railway:JR-East.Keiyo".to_string(), "京葉線".to_string());
        map.insert("odpt.Railway:JR-East.Joban".to_string(), "常磐線".to_string());
        map
    })
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = Config {
        database_url: env::var("DATABASE_URL").unwrap_or_default(),
        redis_url: env::var("REDIS_URL").ok(),
        odpt_key_standard: env::var("ODPT_API_KEY").ok().or_else(|| env::var("ODPT_API_TOKEN").ok()),
        odpt_key_challenge: env::var("ODPT_API_TOKEN_BACKUP").ok(),
    };

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&config.database_url)
        .await?;

    let redis = match &config.redis_url {
        Some(url) if !url.is_empty() => redis::Client::open(url.as_str()).ok(),
        _ => None,
    };

    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()?;

    let state = AppState {
        pool,
        redis,
        memory: Arc::new(MemoryCache::new()),
        http,
        config: Arc::new(config),
    };

    let app = Router::new()
        .route("/health", get(health))
        .route("/l2/status", get(l2_status))
        .with_state(state);

    let port = env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8081);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    axum::serve(tokio::net::TcpListener::bind(addr).await?, app).await?;
    Ok(())
}

async fn health() -> impl IntoResponse {
    let body = serde_json::json!({"status":"ok","service":"l2-status-rs","timestamp":Utc::now().to_rfc3339()});
    (StatusCode::OK, Json(body))
}

async fn l2_status(State(state): State<AppState>, Query(query): Query<StatusQuery>) -> impl IntoResponse {
    let station_id = query.station_id.or(query.stationId).unwrap_or_default();
    let station_id = station_id.trim().to_string();
    if station_id.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"Missing station_id"})));
    }

    let cache_key = format!("l2:{}", station_id);

    if let Some(cached) = state.memory.get(&cache_key).await {
        return (StatusCode::OK, Json(cached));
    }

    if let Some(redis) = &state.redis {
        if let Ok(Some(cached)) = redis_get_json(redis, &cache_key).await {
            state.memory.set(cache_key.clone(), cached.clone(), Duration::from_secs(20)).await;
            return (StatusCode::OK, Json(cached));
        }
    }

    if let Ok(Some(cached)) = load_l2_cache(&state.pool, &cache_key).await {
        state.memory.set(cache_key.clone(), cached.clone(), Duration::from_secs(20)).await;
        if let Some(redis) = &state.redis {
            let _ = redis_set_json(redis, &cache_key, &cached, 60).await;
        }
        return (StatusCode::OK, Json(cached));
    }

    let (snapshot, node, crowd) = tokio::join!(
        load_snapshot(&state.pool, &station_id),
        load_node(&state.pool, &station_id),
        load_crowd_reports(&state.pool, &station_id)
    );

    let snapshot = snapshot.unwrap_or_default();
    let node = node.unwrap_or_default();
    let crowd_reports = crowd.unwrap_or_default();

    let lines = derive_lines(node.transit_lines.clone());
    let disruptions = build_disruptions(&state, &lines).await;
    let line_status = build_line_status(lines.clone(), disruptions);

    let has_suspension = line_status.iter().any(|l| l.status_detail == "halt" || l.status_detail == "canceled" || l.status == "suspended");
    let has_delay = line_status.iter().any(|l| l.status_detail == "delay_major" || l.status_detail == "delay_minor" || l.status == "delay");

    let mut final_status_code = "NORMAL";
    if has_suspension { final_status_code = "SUSPENDED"; }
    else if has_delay { final_status_code = "DELAY"; }

    let (crowd_level, crowd_votes) = compute_crowd(crowd_reports, final_status_code != "NORMAL");
    let weather = build_weather(snapshot.weather_info);

    let l2_status = L2Status {
        congestion: crowd_level,
        crowd: CrowdInfo { level: crowd_level, trend: "stable".to_string(), userVotes: crowd_votes },
        line_status,
        weather,
        updated_at: Utc::now().to_rfc3339(),
        is_stale: false,
        disruption_history: vec![],
    };

    let value = serde_json::to_value(&l2_status).unwrap_or(Value::Null);
    state.memory.set(cache_key.clone(), value.clone(), Duration::from_secs(20)).await;
    if let Some(redis) = &state.redis {
        let _ = redis_set_json(redis, &cache_key, &value, 60).await;
    }
    let _ = upsert_l2_cache(&state.pool, &cache_key, &value).await;

    (StatusCode::OK, Json(value))
}

async fn redis_get_json(client: &redis::Client, key: &str) -> anyhow::Result<Option<Value>> {
    let mut conn = client.get_multiplexed_async_connection().await?;
    let val: Option<String> = conn.get(key).await?;
    Ok(val.and_then(|v| serde_json::from_str(&v).ok()))
}

async fn redis_set_json(client: &redis::Client, key: &str, value: &Value, ttl_secs: usize) -> anyhow::Result<()> {
    let mut conn = client.get_multiplexed_async_connection().await?;
    let payload = serde_json::to_string(value)?;
    let _: () = conn.set_ex(key, payload, ttl_secs).await?;
    Ok(())
}

async fn load_l2_cache(pool: &sqlx::PgPool, key: &str) -> anyhow::Result<Option<Value>> {
    let row = sqlx::query("select value from l2_cache where key = $1 and expires_at > now() limit 1")
        .bind(key)
        .fetch_optional(pool)
        .await?;
    Ok(row.and_then(|r| r.try_get::<Value, _>("value").ok()))
}

async fn upsert_l2_cache(pool: &sqlx::PgPool, key: &str, value: &Value) -> anyhow::Result<()> {
    let expires_at = Utc::now() + ChronoDuration::minutes(20);
    let _ = sqlx::query("insert into l2_cache (key, value, expires_at) values ($1, $2, $3) on conflict (key) do update set value = excluded.value, expires_at = excluded.expires_at")
        .bind(key)
        .bind(sqlx::types::Json(value))
        .bind(expires_at)
        .execute(pool)
        .await?;
    Ok(())
}

#[derive(Default, Clone)]
struct SnapshotRow {
    status_code: Option<String>,
    reason_ja: Option<String>,
    reason_zh_tw: Option<String>,
    weather_info: Option<Value>,
    updated_at: Option<DateTime<Utc>>,
}

#[derive(Default, Clone)]
struct NodeRow {
    transit_lines: Option<Value>,
    coordinates: Option<Value>,
}

async fn load_snapshot(pool: &sqlx::PgPool, station_id: &str) -> anyhow::Result<SnapshotRow> {
    let row = sqlx::query("select status_code, reason_ja, reason_zh_tw, weather_info, updated_at from transit_dynamic_snapshot where station_id = $1 order by updated_at desc limit 1")
        .bind(station_id)
        .fetch_optional(pool)
        .await?;
    if let Some(r) = row {
        Ok(SnapshotRow {
            status_code: r.try_get("status_code").ok(),
            reason_ja: r.try_get("reason_ja").ok(),
            reason_zh_tw: r.try_get("reason_zh_tw").ok(),
            weather_info: r.try_get("weather_info").ok(),
            updated_at: r.try_get("updated_at").ok(),
        })
    } else {
        Ok(SnapshotRow::default())
    }
}

async fn load_node(pool: &sqlx::PgPool, station_id: &str) -> anyhow::Result<NodeRow> {
    let row = sqlx::query("select transit_lines, coordinates from nodes where id = $1 limit 1")
        .bind(station_id)
        .fetch_optional(pool)
        .await?;
    if let Some(r) = row {
        Ok(NodeRow {
            transit_lines: r.try_get("transit_lines").ok(),
            coordinates: r.try_get("coordinates").ok(),
        })
    } else {
        Ok(NodeRow::default())
    }
}

async fn load_crowd_reports(pool: &sqlx::PgPool, station_id: &str) -> anyhow::Result<Vec<i64>> {
    let rows = sqlx::query("select crowd_level from transit_crowd_reports where station_id = $1 and created_at > now() - interval '30 minutes'")
        .bind(station_id)
        .fetch_all(pool)
        .await?;
    Ok(rows.into_iter().filter_map(|r| r.try_get::<i64, _>("crowd_level").ok()).collect())
}

fn compute_crowd(reports: Vec<i64>, station_has_delay: bool) -> (i64, CrowdVotes) {
    let mut distribution = vec![0, 0, 0, 0, 0];
    let mut sum = 0;
    let mut count = 0;
    for lvl in reports {
        if (1..=5).contains(&lvl) {
            distribution[(lvl - 1) as usize] += 1;
            sum += lvl;
            count += 1;
        }
    }
    let mut final_level = 2;
    if station_has_delay { final_level = 4; }
    else if count >= 3 { final_level = (sum as f64 / count as f64).round() as i64; }

    let votes = CrowdVotes { total: count, distribution };
    (final_level, votes)
}

fn build_weather(snapshot_weather: Option<Value>) -> WeatherInfo {
    let temp = snapshot_weather.as_ref().and_then(|v| v.get("temp")).and_then(|v| v.as_f64()).unwrap_or(0.0);
    let condition = snapshot_weather.as_ref().and_then(|v| v.get("condition")).and_then(|v| v.as_str()).unwrap_or("Unknown");
    let wind = snapshot_weather.as_ref().and_then(|v| v.get("wind")).and_then(|v| v.as_f64()).unwrap_or(0.0);
    WeatherInfo { temp, condition: condition.to_string(), wind }
}

fn derive_lines(transit_lines: Option<Value>) -> Vec<LineDef> {
    let mut lines = Vec::new();
    let Some(Value::Array(list)) = transit_lines else { return lines; };
    for item in list {
        if let Some(raw) = item.as_str() {
            let operator = infer_operator(raw);
            let color = operator_color(&operator);
            let base = clean_line_name(raw);
            let name = LocalizedText {
                ja: format!("{}線", base),
                en: format!("{} Line", base),
                zh: format!("{}線", base),
            };
            lines.push(LineDef { id: raw.to_string(), name: name.clone(), operator, color });
        }
    }
    lines
}

fn infer_operator(line_id: &str) -> String {
    if line_id.contains("TokyoMetro") { return "Metro".to_string(); }
    if line_id.contains("Toei") { return "Toei".to_string(); }
    if line_id.contains("JR") || line_id.contains("JR-East") { return "JR".to_string(); }
    if line_id.contains("Keikyu") { return "Private".to_string(); }
    if line_id.contains("Odakyu") { return "Private".to_string(); }
    if line_id.contains("Keio") { return "Private".to_string(); }
    if line_id.contains("Seibu") { return "Private".to_string(); }
    if line_id.contains("Tobu") { return "Private".to_string(); }
    if line_id.contains("Tokyu") { return "Private".to_string(); }
    if line_id.contains("Yurikamome") { return "Private".to_string(); }
    if line_id.contains("TWR") { return "Private".to_string(); }
    if line_id.contains("TokyoMonorail") { return "Private".to_string(); }
    "Other".to_string()
}

fn operator_color(operator: &str) -> String {
    match operator {
        "Metro" => "#3B82F6",
        "Toei" => "#14B8A6",
        "JR" => "#22C55E",
        "Private" => "#F97316",
        _ => "#9CA3AF",
    }.to_string()
}

fn clean_line_name(id: &str) -> String {
    let mut s = id.replace("odpt.Railway:", "").replace("odpt.Station:", "");
    if let Some(pos) = s.rfind('.') {
        s = s[(pos + 1)..].to_string();
    }
    s = s.replace("Line", "");
    s = s.replace(['.', '_'], " ");
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn operator_id_from_line(line_id: &str) -> Option<String> {
    if line_id.contains("TokyoMetro") { return Some("odpt.Operator:TokyoMetro".to_string()); }
    if line_id.contains("Toei") { return Some("odpt.Operator:Toei".to_string()); }
    if line_id.contains("JR-East") || line_id.contains("JR") { return Some("odpt.Operator:JR-East".to_string()); }
    if line_id.contains("Keio") { return Some("odpt.Operator:Keio".to_string()); }
    if line_id.contains("Keikyu") { return Some("odpt.Operator:Keikyu".to_string()); }
    if line_id.contains("Odakyu") { return Some("odpt.Operator:Odakyu".to_string()); }
    if line_id.contains("Seibu") { return Some("odpt.Operator:Seibu".to_string()); }
    if line_id.contains("Tobu") { return Some("odpt.Operator:Tobu".to_string()); }
    if line_id.contains("Tokyu") { return Some("odpt.Operator:Tokyu".to_string()); }
    if line_id.contains("Yurikamome") { return Some("odpt.Operator:Yurikamome".to_string()); }
    if line_id.contains("TWR") { return Some("odpt.Operator:TWR".to_string()); }
    if line_id.contains("TokyoMonorail") { return Some("odpt.Operator:TokyoMonorail".to_string()); }
    None
}

fn requires_challenge(operator_id: &str) -> bool {
    operator_id.contains("JR-East") || operator_id.contains("Keikyu") || operator_id.contains("Seibu") || operator_id.contains("Tobu") || operator_id.contains("Tokyu")
}

async fn build_disruptions(state: &AppState, lines: &Vec<LineDef>) -> Vec<Disruption> {
    let (odpt, yahoo_list, jr_east_snapshot) = tokio::join!(
        fetch_odpt_disruptions(state, lines),
        fetch_yahoo_status_cached(state),
        fetch_jr_east_snapshot_cached(state)
    );

    let mut disruptions = odpt;
    let mut odpt_railways: HashSet<String> = disruptions.iter().map(|d| d.railway_id.clone()).collect();

    let mut yahoo_by_railway: HashMap<String, YahooStatus> = HashMap::new();
    for y in yahoo_list {
        if let Some(mapped) = yahoo_to_odpt_map().get(&y.name) {
            yahoo_by_railway.entry(mapped.clone()).or_insert(y.clone());
        }
    }

    for (railway_id, yahoo) in yahoo_by_railway.into_iter() {
        if odpt_railways.contains(&railway_id) {
            continue;
        }

        let (ok, derived) = should_inject_yahoo(&railway_id, jr_east_snapshot.as_ref());
        if !ok { continue; }

        let derived_tag = derived.as_deref().filter(|v| *v != "unknown").map(|v| format!(" [JR-East: {}]", v)).unwrap_or_default();
        let message = format!("[Yahoo] {}: {}{}", yahoo.name, yahoo.status, derived_tag);
        let combined = format!("{} {}", yahoo.status, derived.clone().unwrap_or_default());
        let (mut detail, delay_minutes) = classify_status_detail(&combined, &combined, &combined);
        if detail == "unknown" {
            detail = match derived.as_deref() {
                Some("suspended") => "halt".to_string(),
                Some("delay") => "delay_minor".to_string(),
                _ => "delay_minor".to_string(),
            };
        }
        let severity = if detail == "halt" || detail == "canceled" { "critical" } else if detail == "delay_major" { "major" } else if detail == "delay_minor" { "minor" } else { "minor" };

        disruptions.push(Disruption {
            railway_id: railway_id.clone(),
            status_text: "Service Update".to_string(),
            message_ja: message.clone(),
            message_en: message.clone(),
            delay_minutes,
            detail,
            severity: severity.to_string(),
            source: "yahoo".to_string(),
        });
        odpt_railways.insert(railway_id);
    }

    disruptions
}

async fn fetch_yahoo_status_cached(state: &AppState) -> Vec<YahooStatus> {
    let cache_key = "external:yahoo:status:v1";
    if let Some(cached) = state.memory.get(cache_key).await {
        if let Ok(list) = serde_json::from_value::<Vec<YahooStatus>>(cached) {
            return list;
        }
    }

    if let Some(redis) = &state.redis {
        if let Ok(Some(cached)) = redis_get_json(redis, cache_key).await {
            if let Ok(list) = serde_json::from_value::<Vec<YahooStatus>>(cached.clone()) {
                state.memory.set(cache_key.to_string(), cached, Duration::from_secs(30)).await;
                return list;
            }
        }
    }

    let list = fetch_yahoo_status(&state.http).await;
    let value = serde_json::to_value(&list).unwrap_or(Value::Null);
    state.memory.set(cache_key.to_string(), value.clone(), Duration::from_secs(30)).await;
    if let Some(redis) = &state.redis {
        let _ = redis_set_json(redis, cache_key, &value, 60).await;
    }
    list
}

async fn fetch_yahoo_status(client: &reqwest::Client) -> Vec<YahooStatus> {
    let url = "https://transit.yahoo.co.jp/diainfo/area/4";
    let res = client
        .get(url)
        .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .header("Accept-Language", "ja-JP,ja;q=0.9")
        .send()
        .await;

    let Ok(resp) = res else { return vec![]; };
    if !resp.status().is_success() { return vec![]; }
    let Ok(html) = resp.text().await else { return vec![]; };

    let mut results = Vec::new();
    let re = Regex::new(r"<a[^>]*>([^<]+)</a>[^<]*<span class=\"icnTrouble\">").ok();
    if let Some(regex) = re {
        for cap in regex.captures_iter(&html) {
            if let Some(name) = cap.get(1) {
                let name = name.as_str().trim().to_string();
                if !name.is_empty() {
                    results.push(YahooStatus { name, status: "Trouble (Delay/Suspension)".to_string() });
                }
            }
        }
    }
    results
}

async fn fetch_jr_east_snapshot_cached(state: &AppState) -> Option<JrEastSnapshot> {
    let cache_key = "external:jreast:kanto:snapshot:v1";
    if let Some(cached) = state.memory.get(cache_key).await {
        if let Ok(snapshot) = serde_json::from_value::<JrEastSnapshot>(cached) {
            return Some(snapshot);
        }
    }

    if let Some(redis) = &state.redis {
        if let Ok(Some(cached)) = redis_get_json(redis, cache_key).await {
            if let Ok(snapshot) = serde_json::from_value::<JrEastSnapshot>(cached.clone()) {
                state.memory.set(cache_key.to_string(), cached, Duration::from_secs(60)).await;
                return Some(snapshot);
            }
        }
    }

    let url = "https://traininfo.jreast.co.jp/train_info/kanto.aspx";
    let res = state.http
        .get(url)
        .header("user-agent", "Lutagu/l2-status")
        .header("accept", "text/html,application/xhtml+xml")
        .header("accept-language", "ja-JP,ja;q=0.9,en;q=0.5")
        .send()
        .await;

    let Ok(resp) = res else { return None; };
    let Ok(html) = resp.text().await else { return None; };

    let hints: HashSet<String> = jr_east_railway_hint_ja().values().cloned().collect();
    let mut line_status_text_map_ja: HashMap<String, String> = HashMap::new();
    let tag_re = Regex::new(r"<[^>]+>").ok();

    for hint in hints {
        if let Some(idx) = html.find(&hint) {
            let start = idx.saturating_sub(200);
            let end = usize::min(html.len(), idx + 400);
            let window = &html[start..end];
            let cleaned = if let Some(re) = &tag_re {
                re.replace_all(window, " ").to_string()
            } else {
                window.to_string()
            };
            let cleaned = cleaned.split_whitespace().collect::<Vec<_>>().join(" ");
            line_status_text_map_ja.insert(hint, cleaned);
        }
    }

    let snapshot = JrEastSnapshot {
        fetched_at: Utc::now().to_rfc3339(),
        line_status_text_map_ja,
    };

    let value = serde_json::to_value(&snapshot).unwrap_or(Value::Null);
    state.memory.set(cache_key.to_string(), value.clone(), Duration::from_secs(60)).await;
    if let Some(redis) = &state.redis {
        let _ = redis_set_json(redis, cache_key, &value, 120).await;
    }
    Some(snapshot)
}

fn should_inject_yahoo(railway_id: &str, snapshot: Option<&JrEastSnapshot>) -> (bool, Option<String>) {
    if !railway_id.starts_with("odpt.Railway:JR-East.") {
        return (true, None);
    }

    let hint = jr_east_railway_hint_ja().get(railway_id).cloned();
    let Some(hint_ja) = hint else { return (true, None); };

    let snippet = snapshot.and_then(|s| s.line_status_text_map_ja.get(&hint_ja)).cloned();
    let derived = derive_official_status_from_text(snippet.as_deref());
    if derived == "normal" { return (false, Some(derived)); }
    let derived = if derived == "unknown" { None } else { Some(derived) };
    (true, derived)
}

fn derive_official_status_from_text(text: Option<&str>) -> String {
    let Some(raw) = text else { return "unknown".to_string(); };
    let lower = raw.to_lowercase();
    if lower.contains("平常") || lower.contains("通常") || lower.contains("normal") {
        return "normal".to_string();
    }
    if lower.contains("運休") || lower.contains("運転見合わせ") || lower.contains("見合わせ") || lower.contains("suspended") {
        return "suspended".to_string();
    }
    if lower.contains("遅延") || lower.contains("遅れ") || lower.contains("delay") {
        return "delay".to_string();
    }
    "unknown".to_string()
}

async fn fetch_odpt_disruptions(state: &AppState, lines: &Vec<LineDef>) -> Vec<Disruption> {
    let mut operators = Vec::new();
    for line in lines {
        if let Some(op) = operator_id_from_line(&line.id) {
            if !operators.contains(&op) { operators.push(op); }
        }
    }

    if operators.is_empty() { return vec![]; }
    let client = state.http.clone();
    let key_standard = state.config.odpt_key_standard.clone();
    let key_challenge = state.config.odpt_key_challenge.clone();

    let mut tasks = Vec::new();
    for op in operators {
        let client = client.clone();
        let token = if requires_challenge(&op) { key_challenge.clone() } else { key_standard.clone() };
        if token.is_none() { continue; }
        let base = if requires_challenge(&op) { ODPT_BASE_URL_CHALLENGE } else { ODPT_BASE_URL_STANDARD };
        tasks.push(tokio::spawn(async move {
            fetch_train_info_for_operator(&client, base, &op, token.unwrap()).await
        }));
    }

    let mut disruptions = Vec::new();
    for task in tasks {
        if let Ok(items) = task.await {
            for item in items {
                if let Some(d) = map_disruption_from_odpt(&item) {
                    disruptions.push(d);
                }
            }
        }
    }
    disruptions
}

async fn fetch_train_info_for_operator(client: &reqwest::Client, base: &str, operator_id: &str, token: String) -> Vec<Value> {
    let mut params = vec![("odpt:operator", operator_id), ("acl:consumerKey", token.as_str())];
    let url = format!("{}/odpt:TrainInformation", base);
    let res = client.get(url).query(&params).send().await;
    if let Ok(resp) = res {
        if let Ok(json) = resp.json::<Value>().await {
            if let Some(arr) = json.as_array() {
                return arr.clone();
            }
        }
    }
    vec![]
}

fn map_disruption_from_odpt(item: &Value) -> Option<Disruption> {
    let railway_id = item.get("odpt:railway").and_then(|v| v.as_str()).unwrap_or("").to_string();
    if railway_id.is_empty() { return None; }

    let status_text = match item.get("odpt:trainInformationStatus") {
        Some(Value::Object(obj)) => obj.get("ja").and_then(|v| v.as_str()).or_else(|| obj.get("en").and_then(|v| v.as_str())).unwrap_or("").to_string(),
        Some(Value::String(s)) => s.clone(),
        _ => "".to_string(),
    };

    let message_obj = item.get("odpt:trainInformationText");
    let message_ja = message_obj.and_then(|v| v.get("ja")).and_then(|v| v.as_str()).unwrap_or("").to_string();
    let message_en = message_obj.and_then(|v| v.get("en")).and_then(|v| v.as_str()).unwrap_or("").to_string();

    if looks_normal(&status_text, &message_ja, &message_en) { return None; }

    let (detail, delay_minutes) = classify_status_detail(&status_text, &message_ja, &message_en);
    let severity = if detail == "halt" || detail == "canceled" { "critical" } else if detail == "delay_major" { "major" } else if detail == "delay_minor" { "minor" } else { "minor" };

    Some(Disruption { railway_id, status_text, message_ja, message_en, delay_minutes, detail, severity: severity.to_string(), source: "odpt".to_string() })
}

fn looks_normal(status_text: &str, ja: &str, en: &str) -> bool {
    let combined = format!("{} {} {}", status_text, ja, en).to_lowercase();
    combined.contains("平常") || combined.contains("通常") || combined.contains("normal") || combined.contains("no delay")
}

fn classify_status_detail(status_text: &str, ja: &str, en: &str) -> (String, Option<i64>) {
    let combined = format!("{} {} {}", status_text, ja, en);
    if combined.contains("運休") || combined.contains("運転見合わせ") || combined.to_lowercase().contains("suspended") {
        return ("halt".to_string(), None);
    }
    if combined.contains("遅れ") || combined.contains("遅延") || combined.to_lowercase().contains("delay") {
        let delay = extract_delay_minutes(&combined);
        let detail = if delay.unwrap_or(0) >= 30 { "delay_major" } else { "delay_minor" };
        return (detail.to_string(), delay);
    }
    ("unknown".to_string(), None)
}

fn extract_delay_minutes(text: &str) -> Option<i64> {
    let re = regex::Regex::new(r"(\d{1,3})\s*分").ok()?;
    let mut max_val = None;
    for cap in re.captures_iter(text) {
        if let Some(m) = cap.get(1) {
            if let Ok(v) = m.as_str().parse::<i64>() {
                max_val = Some(max_val.map(|x| x.max(v)).unwrap_or(v));
            }
        }
    }
    max_val
}

fn build_line_status(lines: Vec<LineDef>, disruptions: Vec<Disruption>) -> Vec<LineStatus> {
    let mut result = Vec::new();
    for line in lines {
        let mut matched: Vec<Disruption> = disruptions.iter().filter(|d| match_line(&line, d)).cloned().collect();
        matched.sort_by(|a, b| {
            let score_b = disruption_match_score(&line, b);
            let score_a = disruption_match_score(&line, a);
            score_b.cmp(&score_a).then_with(|| rank_disruption(b).cmp(&rank_disruption(a)))
        });
        if let Some(primary) = matched.first() {
            let msg = LocalizedText { ja: primary.message_ja.clone(), en: primary.message_en.clone(), zh: primary.message_ja.clone() };
            result.push(LineStatus {
                line: line.name.en.clone(),
                name: line.name.clone(),
                line_name: line.name.clone(),
                operator: line.operator.clone(),
                color: line.color.clone(),
                railway_id: Some(primary.railway_id.clone()),
                status: if primary.detail == "halt" || primary.detail == "canceled" { "suspended".to_string() } else { "delay".to_string() },
                status_detail: primary.detail.clone(),
                delay_minutes: primary.delay_minutes,
                severity: primary.severity.clone(),
                message: Some(msg),
            });
        } else {
            result.push(LineStatus {
                line: line.name.en.clone(),
                name: line.name.clone(),
                line_name: line.name.clone(),
                operator: line.operator.clone(),
                color: line.color.clone(),
                railway_id: None,
                status: "normal".to_string(),
                status_detail: "normal".to_string(),
                delay_minutes: None,
                severity: "none".to_string(),
                message: None,
            });
        }
    }
    result
}

fn rank_disruption(d: &Disruption) -> i64 {
    let mut rank = source_rank(&d.source) * 100;
    if d.detail == "halt" || d.detail == "canceled" { rank += 30; }
    if d.detail == "delay_major" { rank += 20; }
    if d.detail == "delay_minor" { rank += 10; }
    if d.severity == "critical" { rank += 5; }
    rank
}

fn source_rank(source: &str) -> i64 {
    if source == "odpt" { return 3; }
    if source == "yahoo" { return 2; }
    1
}

fn match_line(line: &LineDef, disruption: &Disruption) -> bool {
    let line_token = normalize_token(&line.name.en);
    let rail_token = disruption.railway_id.split('.').last().map(normalize_token).unwrap_or_default();
    if !line_token.is_empty() && line_token == rail_token { return true; }
    let id_token = normalize_token(&line.id);
    if !id_token.is_empty() && id_token.contains(&rail_token) { return true; }
    false
}

fn disruption_match_score(line: &LineDef, disruption: &Disruption) -> i64 {
    let mut score = 0;
    if disruption.railway_id == line.id { score += 40; }
    if line.id.contains(&disruption.railway_id) || disruption.railway_id.contains(&line.id) { score += 30; }
    let line_token = normalize_token(&line.name.en);
    let rail_token = disruption.railway_id.split('.').last().map(normalize_token).unwrap_or_default();
    if !line_token.is_empty() && line_token == rail_token { score += 20; }
    let id_token = normalize_token(&line.id);
    if !id_token.is_empty() && id_token.contains(&rail_token) { score += 10; }
    score
}

fn normalize_token(s: &str) -> String {
    s.to_lowercase()
        .replace("line", "")
        .replace([' ', '-', '_', '.', ':'], "")
}

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or(Duration::from_secs(0)).as_millis() as u64
}
