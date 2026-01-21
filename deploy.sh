#!/bin/bash
set -e

PROJECT_ID=$(gcloud config get-value project)
REGION="asia-northeast1"

deploy_service() {
    SERVICE_NAME=$1
    DIR_PATH=$2
    IS_JOB=$3

    echo "🚀 Deploying $SERVICE_NAME from $DIR_PATH..."

    # Determine Strategy
    if [ "$SERVICE_NAME" = "vector-search-rs" ]; then
        echo "Using cloudbuild_vector.yaml..."
        gcloud builds submit --config cloudbuild_vector.yaml .
    else
        # Standard build (assumes Dockerfile in root or handled otherwise)
        # Note: Previous services might have Dockerfile in root or work differently.
        # But for new structure, let's keep simple.
        gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME .
    fi

    if [ "$IS_JOB" = "true" ]; then
        echo "Updating Cloud Run Job..."
        gcloud run jobs update $SERVICE_NAME \
            --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
            --region $REGION \
            --set-env-vars RUST_LOG=info
    else
        echo "Deploying Cloud Run Service..."
        gcloud run deploy $SERVICE_NAME \
            --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
            --region $REGION \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars RUST_LOG=info
    fi

    echo "✅ $SERVICE_NAME deployed successfully!"
}

case "$1" in
    "etl")
        deploy_service "etl-pipeline-rs" "services/etl-pipeline-rs" "true"
        ;;
    "l2")
        deploy_service "l2-status-rs" "services/l2-status-rs" "false"
        ;;
    "l4")
        deploy_service "l4-routing-rs" "services/l4-routing-rs" "false"
        ;;
    "vector")
        deploy_service "vector-search-rs" "services/vector-search-rs" "false"
        ;;
    "all")
        deploy_service "etl-pipeline-rs" "services/etl-pipeline-rs" "true"
        deploy_service "l2-status-rs" "services/l2-status-rs" "false"
        deploy_service "l4-routing-rs" "services/l4-routing-rs" "false"
        deploy_service "vector-search-rs" "services/vector-search-rs" "false"
        ;;
    *)
        echo "Usage: ./deploy.sh [etl|l2|l4|vector|all]"
        exit 1
        ;;
esac
