use qdrant_client::prelude::*;
use qdrant_client::qdrant::{SearchPointsBuilder, value::Kind, PointStruct};
use std::sync::Arc;
use crate::embedding::generate_embedding;

pub struct VectorSearchService {
    qdrant: Arc<QdrantClient>,
}

impl VectorSearchService {
    pub fn new(qdrant: Arc<QdrantClient>) -> Self {
        Self { qdrant }
    }

    pub async fn search_internal(
        &self,
        query: &str,
        limit: usize,
        threshold: Option<f32>,
    ) -> anyhow::Result<Vec<crate::http::SearchResult>> {
        // Generate embedding
        let embedding = generate_embedding(query, Some("query"))
            .await?;

        // Search in Qdrant
        let mut search_builder = SearchPointsBuilder::new("expert_knowledge", embedding, limit as u64)
            .with_payload(true);
            
        if let Some(t) = threshold {
            search_builder = search_builder.score_threshold(t);
        }

        let search_result = self
            .qdrant
            .search_points(&search_builder.build())
            .await?;

        let results: Vec<crate::http::SearchResult> = search_result
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

                let node_id = point.payload.get("node_id")
                    .and_then(|v| v.kind.as_ref())
                    .and_then(|k| match k {
                        Kind::StringValue(s) => Some(s.clone()),
                        _ => None,
                    });

                crate::http::SearchResult {
                    id,
                    score: point.score,
                    content,
                    tags,
                    node_id,
                }
            })
            .collect();

        Ok(results)
    }

    pub async fn upsert_internal(
        &self,
        id: &str,
        content: &str,
        tags: Vec<String>,
    ) -> anyhow::Result<()> {
        use qdrant_client::qdrant::Value;
        use qdrant_client::Payload;
        use std::collections::HashMap;

        // 1. Generate Embedding
        let embedding = generate_embedding(content, Some("document"))
            .await?;

        // 2. Prepare Payload
        let mut payload = HashMap::new();
        payload.insert("content".to_string(), Value::from(content.to_string()));
        payload.insert("tags".to_string(), Value::from(tags));

        let point = PointStruct::new(
            id.to_string(),
            embedding,
            Payload::from(payload)
        );

        // 3. Upsert to Qdrant
        self.qdrant
            .upsert_points(
                "expert_knowledge",
                None,
                vec![point],
                None,
            )
            .await?;

        Ok(())
    }
}

