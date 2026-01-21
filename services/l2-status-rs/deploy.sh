#!/bin/bash
set -e

SERVICE_NAME="l2-status-rs"
PROJECT_ID="lutagu"
REGION="asia-northeast1"
IMAGE_TAG="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"

echo "[Deploy] Deploying $SERVICE_NAME..."

# Build & Push
gcloud builds submit --tag $IMAGE_TAG --project $PROJECT_ID

# Deploy
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_TAG \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --project $PROJECT_ID \
  --set-env-vars "DATABASE_URL=${DATABASE_URL},REDIS_URL=${REDIS_URL},ODPT_API_KEY=${ODPT_API_KEY}"
