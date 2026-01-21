use qdrant_client::prelude::*;
use qdrant_client::qdrant::{CreateCollectionBuilder, Distance, VectorParamsBuilder};
use std::env;
use std::sync::Arc;
use tokio;
use tracing::info;

mod embedding;
mod search;
mod http;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    // Load .env if exists
    dotenv::dotenv().ok();

    let qdrant_url = env::var("QDRANT_URL").unwrap_or_else(|_| "http://localhost:6334".to_string());
    let qdrant_api_key = env::var("QDRANT_API_KEY").ok();
    
    // Connect to Qdrant
    let mut config = QdrantClient::from_url(&qdrant_url);
    if let Some(key) = qdrant_api_key {
        config = config.with_api_key(key);
    }
    let client = config.build()?;
    
    // Wrap in Arc for sharing
    let client_arc = Arc::new(client);
    // Check Key Collection (Synchronous Initialization)
    let collection_name = "expert_knowledge";
    
    // For migration: Always delete and recreate to ensure dimension matches (1024)
    info!("Syncing collection: {}", collection_name);
    let _ = client_arc.delete_collection(collection_name).await;
    
    let create_request = CreateCollectionBuilder::new(collection_name)
        .vectors_config(VectorParamsBuilder::new(1024, Distance::Cosine))
        .build();
    
    let res = client_arc.create_collection(&create_request).await;
    match res {
        Ok(_) => info!("Collection created successfully!"),
        Err(e) => tracing::error!("Failed to create collection: {}", e),
    }

    // Start HTTP Server (Cloud Run compatible)
    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string()).parse::<u16>().unwrap_or(8080);
    let addr = format!("0.0.0.0:{}", port);
    
    info!("🚀 Vector Search Service (HTTP) running on {}", addr);
    
    let router = http::create_router(client_arc);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, router).await?;

    Ok(())
}

