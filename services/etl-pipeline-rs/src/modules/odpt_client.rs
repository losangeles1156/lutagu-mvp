use anyhow::Result;
use odpt_client::OdptClient;
use std::env;
use std::fs::File;
use std::io::BufWriter;
use tracing::info;

pub async fn fetch_stations(operators: &str, output: Option<&str>) -> Result<()> {
    info!("🚄 Fetching ODPT Stations...");

    let api_key = env::var("ODPT_API_KEY").expect("ODPT_API_KEY must be set");
    let client = OdptClient::new(api_key, false)?;

    let operator_list: Vec<&str> = operators.split(',').collect();
    
    let mut all_stations = Vec::new();

    for op in operator_list {
        info!("   Fetching for operator: {}", op);
        let stations = client.get_stations(Some(op), None).await?;
        info!("   Found {} stations", stations.len());
        all_stations.extend(stations);
    }

    if let Some(path) = output {
        let file = File::create(path)?;
        let writer = BufWriter::new(file);
        serde_json::to_writer_pretty(writer, &all_stations)?;
        info!("✅ Saved {} stations to {}", all_stations.len(), path);
    } else {
        info!("✅ Fetched {} stations (no output file specified)", all_stations.len());
    }

    Ok(())
}
