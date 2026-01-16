#!/bin/bash
set -e

SERVICE_NAME="chat-api"
PROJECT_ID="bambigo-mvp" # Replace with actual Project ID
REGION="asia-northeast1"
IMAGE_TAG="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"

echo "[Build] Building Docker Image: $SERVICE_NAME"
docker build -t $SERVICE_NAME .

echo "[Build] Done. To deploy, tag and push:"
echo "  docker tag $SERVICE_NAME $IMAGE_TAG"
echo "  docker push $IMAGE_TAG"
echo "  gcloud run deploy $SERVICE_NAME --image $IMAGE_TAG --region $REGION --platform managed --allow-unauthenticated"
