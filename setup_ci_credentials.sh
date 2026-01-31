#!/bin/bash
set -e

# Configuration
PROJECT_ID="lutagu"
SERVICE_ACCOUNT_NAME="github-actions-deployer"
KEY_FILE="gcp-key.json"

echo "🚀 Setting up CI Credentials for project: $PROJECT_ID"

# 1. Enable Services (if not already enabled)
echo "Enable required services..."
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    iam.googleapis.com \
    cloudbuild.googleapis.com \
    --project "$PROJECT_ID"

# 2. Create Service Account
if gcloud iam service-accounts describe "${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" --project "$PROJECT_ID" > /dev/null 2>&1; then
    echo "✅ Service account $SERVICE_ACCOUNT_NAME already exists."
else
    echo "Creating service account..."
    gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
        --description="Service account for GitHub Actions deployment" \
        --display-name="GitHub Actions Deployer" \
        --project "$PROJECT_ID"
fi

SA_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# 3. Grant Permissions
echo "Granting IAM roles..."
ROLES=(
    "roles/run.admin"
    "roles/iam.serviceAccountUser"
    "roles/artifactregistry.writer"
    "roles/storage.admin"
)

for role in "${ROLES[@]}"; do
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${SA_EMAIL}" \
        --role="$role" \
        --condition=None
done

# 4. Generate Key
echo "Generating JSON Key..."
if [ -f "$KEY_FILE" ]; then
    echo "⚠️  Key file $KEY_FILE already exists. Skipping generation to avoid overwriting."
else
    gcloud iam service-accounts keys create "$KEY_FILE" \
        --iam-account="$SA_EMAIL" \
        --project "$PROJECT_ID"
fi

echo "✅ Setup Complete!"
echo "==================================================="
echo "PLEASE COPY THE CONTENT BELOW TO GITHUB SECRETS"
echo "Secret Name: GCP_CREDENTIALS"
echo "==================================================="
cat "$KEY_FILE"
echo ""
echo "==================================================="
echo "⚠️  After copying, delete $KEY_FILE for security!"
