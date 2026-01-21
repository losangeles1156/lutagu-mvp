use reqwest::Client;
use serde_json::json;
use std::env;
use anyhow::{Result, anyhow};

// Voyage AI API endpoint
const EMBEDDING_API_URL: &str = "https://api.voyageai.com/v1/embeddings";

#[derive(serde::Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingData>,
}

#[derive(serde::Deserialize)]
struct EmbeddingData {
    embedding: Vec<f32>,
}

pub async fn generate_embedding(text: &str, input_type: Option<&str>) -> Result<Vec<f32>> {
    let api_key = env::var("VOYAGE_API_KEY")
        .map_err(|_| anyhow!("VOYAGE_API_KEY not set"))?;
    
    let client = Client::new();
    
    let response = client.post(EMBEDDING_API_URL)
        .bearer_auth(&api_key)
        .json(&json!({
            "model": "voyage-4",
            "input": [text],
            "input_type": input_type
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(anyhow!("Voyage AI API error: {}", error_text));
    }

    let result: EmbeddingResponse = response.json().await?;
    
    result.data.first()
        .map(|d| d.embedding.clone())
        .ok_or_else(|| anyhow!("No embedding returned from Voyage AI"))
}

