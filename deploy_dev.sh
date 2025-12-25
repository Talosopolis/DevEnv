#!/bin/bash
set -e

# Configuration
PROJECT_ID=${1:-"talos-dev-480518"}
REGION="us-central1"
REPO_NAME="talosopolis-repo"
BACKEND_SERVICE="talos-dev-backend"
FRONTEND_SERVICE="talos-dev-frontend"
GCS_BUCKET="${PROJECT_ID}-talos-data"

echo "🚀 Deploying Talosopolis to GCP Project: $PROJECT_ID"

# 1. Enable APIs
echo "Enable APIs..."
gcloud services enable run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    firestore.googleapis.com \
    storage.googleapis.com \
    aiplatform.googleapis.com \
    generativelanguage.googleapis.com \
    --project $PROJECT_ID

# 2. Create Storage Bucket
echo "Creating GCS Bucket..."
gsutil mb -p $PROJECT_ID -l $REGION gs://$GCS_BUCKET || echo "Bucket exists or error"

# 3. Create Artifact Registry
echo "Creating Artifact Registry..."
gcloud artifacts repositories create $REPO_NAME \
    --repository-format=docker \
    --location=$REGION \
    --description="Talosopolis Repository" \
    --project=$PROJECT_ID || echo "Repo exists"

# 3b. Create Firestore Database
echo "Creating Firestore Database..."
gcloud firestore databases create --location=$REGION --project=$PROJECT_ID || echo "Database likely exists"

# 4. Build & Push Backend
echo "Building Backend..."
gcloud builds submit services/ai-backend \
    --tag $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/backend:latest \
    --project $PROJECT_ID

# 5. Deploy Backend (Internal)
echo "Deploying Backend (Internal)..."
gcloud run deploy $BACKEND_SERVICE \
    --image $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/backend:latest \
    --region $REGION \
    --project $PROJECT_ID \
    --ingress internal \
    --allow-unauthenticated \
    --set-env-vars GCP_PROJECT=$PROJECT_ID,GCS_BUCKET_NAME=$GCS_BUCKET,GOOGLE_API_KEY="CHANGE_ME" \
    --memory 2Gi

# Get Backend URL
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region $REGION --project $PROJECT_ID --format 'value(status.url)')
echo "Backend URL: $BACKEND_URL"

# 6. Build & Push Frontend
echo "Building Frontend..."
gcloud builds submit services/frontend \
    --tag $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/frontend:latest \
    --project $PROJECT_ID

# 7. Deploy Frontend (Public)
echo "Deploying Frontend (Public)..."
gcloud run deploy $FRONTEND_SERVICE \
    --image $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/frontend:latest \
    --region $REGION \
    --project $PROJECT_ID \
    --allow-unauthenticated \
    --set-env-vars BACKEND_URL=$BACKEND_URL

echo "✅ Deployment Complete!"
echo "Frontend URL: $(gcloud run services describe $FRONTEND_SERVICE --region $REGION --project $PROJECT_ID --format 'value(status.url)')"
