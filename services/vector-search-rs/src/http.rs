use axum::{
    extract::State,
    http::StatusCode,
    routing::post,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use qdrant_client::prelude::*;
use qdrant_client::qdrant::{SearchPointsBuilder, value::Kind};
use tower_http::cors::{Any, CorsLayer};

use crate::embedding::generate_embedding;

#[derive(Clone)]
pub struct AppState {
    pub qdrant: Arc<QdrantClient>,
}

#[derive(Deserialize)]
pub struct SearchFilter {
    pub node_id: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Deserialize)]
pub struct SearchRequest {
    query: String,
    #[serde(default = "default_limit")]
    limit: u32,
    #[serde(default = "default_threshold")]
    threshold: f32,
    pub filter: Option<SearchFilter>,
}

fn default_limit() -> u32 { 5 }
fn default_threshold() -> f32 { 0.5 }

#[derive(Serialize)]
pub struct SearchResult {
    pub id: String,
    pub score: f32,
    pub content: String,
    pub tags: Vec<String>,
    pub node_id: Option<String>,
}

#[derive(Serialize)]
pub struct SearchResponse {
    results: Vec<SearchResult>,
}

#[derive(Serialize)]
pub struct ErrorResponse {
    error: String,
}

pub async fn search_handler(
    State(state): State<AppState>,
    Json(payload): Json<SearchRequest>,
) -> Result<Json<SearchResponse>, (StatusCode, Json<ErrorResponse>)> {
    use qdrant_client::qdrant::{Filter, FieldCondition, Condition, condition::ConditionOneOf, Filter as QFilter};

    // Generate embedding
    let embedding = generate_embedding(&payload.query, Some("query"))
        .await
        .map_err(|e| (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Embedding failed: {}", e) })
        ))?;

    // Build Qdrant Filter
    let mut filter_conditions = vec![];

    if let Some(ref f) = payload.filter {
        // Filter by node_id
        if let Some(node_id) = &f.node_id {
             filter_conditions.push(Condition {
                condition_one_of: Some(ConditionOneOf::Field(FieldCondition {
                    key: "node_id".to_string(),
                    r#match: Some(qdrant_client::qdrant::Match {
                        match_value: Some(qdrant_client::qdrant::r#match::MatchValue::Keyword(node_id.clone())),
                    }),
                    ..Default::default()
                })),
            });
        }

        // Filter by tags (Any match)
        if let Some(tags) = &f.tags {
            if !tags.is_empty() {
                // Should match ANY of the tags? Or ALL?
                // Context Pruning usually means "Content MUST have at least one relevant tag"
                // So using 'tags' field (List) and checking if any tag in list matches any tag in query?
                // Qdrant 'match' on keyword list checks if array contains value.
                // We want: Document.tags INTERSECT Query.tags > 0.
                // This is multiple 'should' conditions wrapped in a filter.
                
                let mut tag_conditions = vec![];
                for tag in tags {
                     tag_conditions.push(Condition {
                        condition_one_of: Some(ConditionOneOf::Field(FieldCondition {
                            key: "tags".to_string(),
                            r#match: Some(qdrant_client::qdrant::Match {
                                match_value: Some(qdrant_client::qdrant::r#match::MatchValue::Keyword(tag.clone())),
                            }),
                            ..Default::default()
                        })),
                    });
                }
                
                // Wrap in Filter with 'should' (OR logic)
                filter_conditions.push(Condition {
                    condition_one_of: Some(ConditionOneOf::Filter(QFilter {
                        should: tag_conditions,
                        ..Default::default()
                    })),
                });
            }
        }
    }

    let filter = if filter_conditions.is_empty() {
        None
    } else {
        Some(Filter {
            must: filter_conditions,
            ..Default::default()
        })
    };

    if let Some(_) = filter {
        tracing::info!("🔍 [Context Pruning] Filter Active: NodeID={:?}, Tags={:?}", 
            payload.filter.as_ref().and_then(|f| f.node_id.as_ref()),
            payload.filter.as_ref().map(|f| f.tags.as_ref().map(|t| t.len()).unwrap_or(0))
        );
    } else {
        tracing::debug!("🔍 Naked Search (No Filter)");
    }

    // Search in Qdrant
    let search_result = state.qdrant
        .search_points(
            &SearchPointsBuilder::new("expert_knowledge", embedding, payload.limit as u64)
                .score_threshold(payload.threshold)
                .filter(filter.unwrap_or_default())
                .with_payload(true)
                .build(),
        )
        .await
        .map_err(|e| (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Qdrant error: {}", e) })
        ))?;

    let results: Vec<SearchResult> = search_result
        .result
        .into_iter()
        .map(|point| {
            let id = point.id.map(|i| format!("{:?}", i)).unwrap_or_default();
            
            let content = point.payload.get("content")
                .and_then(|v| v.kind.as_ref())
                .and_then(|k| match k {
                    Kind::StringValue(s) => Some(s.clone()),
                    _ => None,
                })
                .unwrap_or_default();
            
            let node_id = point.payload.get("node_id")
                .and_then(|v| v.kind.as_ref())
                .and_then(|k| match k {
                    Kind::StringValue(s) => Some(s.clone()),
                    _ => None,
                });

            let tags = point.payload.get("tags")
                .and_then(|v| v.kind.as_ref())
                .and_then(|k| match k {
                    Kind::ListValue(l) => Some(l.values.iter().filter_map(|iv| {
                         match &iv.kind {
                             Some(Kind::StringValue(s)) => Some(s.clone()),
                             _ => None
                         }
                    }).collect()),
                    _ => None,
                })
                .unwrap_or_default();

            SearchResult {
                id,
                score: point.score,
                content,
                tags,
                node_id,
            }
        })
        .collect();

    Ok(Json(SearchResponse { results }))
}

#[derive(Deserialize)]
pub struct UpsertRequest {
    id: String,
    content: String,
    tags: Vec<String>,
    node_id: Option<String>,
}

#[derive(Serialize)]
pub struct UpsertResponse {
    id: String,
    success: bool,
}

pub async fn upsert_handler(
    State(state): State<AppState>,
    Json(payload): Json<UpsertRequest>,
) -> Result<Json<UpsertResponse>, (StatusCode, Json<ErrorResponse>)> {
    use qdrant_client::qdrant::{PointStruct, Value};
    use qdrant_client::Payload;
    use std::collections::HashMap;

    // 1. Generate Embedding
    let embedding = generate_embedding(&payload.content, Some("document"))
        .await
        .map_err(|e| (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Embedding failed: {}", e) })
        ))?;

    // 2. Prepare Payload
    let mut qdraft_payload = HashMap::new();
    qdraft_payload.insert("content".to_string(), Value::from(payload.content));
    qdraft_payload.insert("tags".to_string(), Value::from(payload.tags));
    if let Some(nid) = payload.node_id {
        qdraft_payload.insert("node_id".to_string(), Value::from(nid));
    }

    let point = PointStruct::new(
        payload.id.clone(),
        embedding,
        Payload::from(qdraft_payload)
    );

    // 3. Upsert to Qdrant
    state.qdrant
        .upsert_points(
            "expert_knowledge",
            None, // shard key
            vec![point],
            None, // ordering
        )
        .await
        .map_err(|e| (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Qdrant error: {}", e) })
        ))?;

    Ok(Json(UpsertResponse {
        id: payload.id,
        success: true,
    }))
}

pub fn create_router(qdrant: Arc<QdrantClient>) -> Router {
    let state = AppState { qdrant };
    
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/search", post(search_handler))
        .route("/upsert", post(upsert_handler))
        .route("/health", axum::routing::get(|| async { "OK" }))
        .layer(cors)
        .with_state(state)
}

