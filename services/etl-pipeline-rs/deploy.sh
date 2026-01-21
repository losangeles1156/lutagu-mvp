#!/bin/bash
set -e

PROJECT_ID="lutagu"
REGION="asia-northeast1"
SERVICE_NAME="etl-pipeline-rs"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Ensure we are in the script directory
cd "$(dirname "$0")"

echo "🚀 Deploying $SERVICE_NAME to Cloud Run..."

# Build and Push
gcloud builds submit --tag $IMAGE_NAME .

# Deploy as Cloud Run Job
echo "🔄 Creating/Updating Cloud Run Job..."

gcloud run jobs create $SERVICE_NAME \
  --image $IMAGE_NAME \
  --region $REGION \
  --set-env-vars DATABASE_URL=$DATABASE_URL \
  --memory 512Mi \
  --max-retries 0 \
  --task-timeout 600s \
  --command "lutagu-etl" \
  --args "fill-toilets","--radius","150","--workers","20" \
  || \
gcloud run jobs update $SERVICE_NAME \
  --image $IMAGE_NAME \
  --region $REGION \
  --set-env-vars DATABASE_URL=$DATABASE_URL \
  --memory 512Mi \
  --max-retries 0 \
  --task-timeout 600s \
  --command "lutagu-etl" \
  --args "fill-toilets","--radius","150","--workers","20"

echo "✅ Deployment complete! Run the job with: gcloud run jobs execute $SERVICE_NAME --region $REGION"
