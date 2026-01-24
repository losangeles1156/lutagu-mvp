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
    
    // Conditional initialization: Only create if collection doesn't exist (Persistent Mode)
    info!("Checking collection: {}", collection_name);
    
    let collection_exists = client_arc.collection_info(collection_name).await.is_ok();
    
    if !collection_exists {
        info!("Collection '{}' not found, creating...", collection_name);
        let create_request = CreateCollectionBuilder::new(collection_name)
            .vectors_config(VectorParamsBuilder::new(1024, Distance::Cosine))
            .build();
        
        match client_arc.create_collection(&create_request).await {
            Ok(_) => info!("Collection '{}' created successfully!", collection_name),
            Err(e) => tracing::error!("Failed to create collection: {}", e),
        }
    } else {
        info!("Collection '{}' already exists, skipping creation.", collection_name);
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

