#!/bin/bash
set -e

SERVICE_NAME="l4-routing-rs"
PROJECT_ID="lutagu"
REGION="asia-northeast1"
IMAGE_TAG="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"

echo "[Deploy] Deploying $SERVICE_NAME..."

# Ensure data file exists
if [ ! -f "routing_graph.json" ]; then
    echo "Copying routing_graph.json..."
    cp ../../public/data/routing_graph.json .
fi

# Build & Push
gcloud builds submit --tag $IMAGE_TAG --project $PROJECT_ID

# Deploy
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_TAG \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --project $PROJECT_ID
