#!/bin/bash
export VECTOR_SEARCH_SERVICE_URL="https://vector-search-rs-147810667713.asia-northeast1.run.app"
echo "🚀 Starting Data Ingestion to Cloud Run ($VECTOR_SEARCH_SERVICE_URL)..."
echo "⚠️  Ensure you have set VOYAGE_API_KEY in the Cloud Run service configuration first!"
npx tsx scripts/ingest_l4_markdown.ts
echo "✅ Ingestion process finished."
