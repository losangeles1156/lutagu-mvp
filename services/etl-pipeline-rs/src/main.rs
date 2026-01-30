use clap::{Parser, Subcommand};
use tracing_subscriber;

mod cli;
mod modules;
mod db;
mod utils;

#[derive(Parser)]
#[command(name = "lutagu-etl")]
#[command(about = "LUTAGU ETL Pipeline - Rust Edition", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Fill L3 toilet facilities from OpenStreetMap
    FillToilets {
        /// Radius in meters
        #[arg(short, long, default_value_t = 150)]
        radius: u32,

        /// Delay between requests (ms)
        #[arg(short, long, default_value_t = 100)]
        delay: u64,

        /// Number of concurrent workers
        #[arg(short, long, default_value_t = 10)]
        workers: usize,

        /// Dry run mode (no DB writes)
        #[arg(long, default_value_t = false)]
        dry_run: bool,
    },

    /// Fill L3 facilities from OSM (generic)
    FillOsm {
        /// OSM amenity type (e.g., "cafe", "restaurant")
        #[arg(short, long)]
        amenity: String,

        #[arg(short, long, default_value_t = 150)]
        radius: u32,

        #[arg(short, long, default_value_t = 10)]
        workers: usize,
    },

    /// Fetch ODPT station data
    FetchOdpt {
        /// Operators (comma-separated)
        #[arg(short, long)]
        operators: String,

        /// Output JSON file path
        #[arg(short, long)]
        output: Option<String>,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let cli = Cli::parse();

    match cli.command {
        Commands::FillToilets { radius, delay, workers, dry_run } => {
            modules::l3_toilets::run(radius, delay, workers, dry_run).await?;
        }
        Commands::FillOsm { amenity, radius, workers } => {
            // Placeholder for future implementation
            tracing::info!("Running FillOsm (Not implemented yet): {}, r={}, w={}", amenity, radius, workers);
            modules::l3_osm::run(&amenity, radius, workers).await?;
        }
        Commands::FetchOdpt { operators, output } => {
            // Placeholder for future implementation
            tracing::info!("Running FetchOdpt: {}, out={:?}", operators, output);
            modules::odpt_client::fetch_stations(&operators, output.as_deref()).await?;
        }
    }

    Ok(())
}
