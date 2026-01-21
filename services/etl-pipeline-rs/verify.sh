#!/bin/bash
# A simple wrapper to run the ETL in dry-run mode
# Requires DATABASE_URL to be set, or we can mock it if we just want to check binary startup 
# (though it will fail at DB connection).

# Assuming the user has a valid DATABASE_URL in their environment or .env file.
# For this verification, we mainly want to see the CLI help or partial execution if DB is accessible.

export RUST_LOG=info

echo "Running cargo build --release..."
cargo build --release

echo "Running dry-run..."
# We use a very small radius (10m) and 1 worker to minimize impact if it were to connect real DB
# Note: This will likely fail if DATABASE_URL is missing.
./target/release/lutagu-etl fill-toilets --radius 10 --workers 1 --delay 1000 --dry-run
