# AI Chat Service (Cloud Run)

This is the standalone AI Chat microservice for LUTAGU, designed to run on GCP Cloud Run.

## Purpose
- Handles all AI/LLM-related processing
- Isolates compute-intensive operations from Vercel
- Scales independently based on chat traffic

## Architecture
```
┌─────────────────────────────────────────┐
│           Vercel (BFF/Proxy)            │
│   /api/chat → fetch(CHAT_API_URL)       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│        GCP Cloud Run (chat-api)         │
│   - HybridEngine                        │
│   - StrategyEngine                      │
│   - LLM Client (Zeabur/Mistral)         │
└─────────────────────────────────────────┘
```

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build
npm run build
```

## Deployment

```bash
# Build & Push to GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/chat-api

# Deploy to Cloud Run
gcloud run deploy chat-api \
  --image gcr.io/PROJECT_ID/chat-api \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --concurrency 80 \
  --timeout 60s \
  --set-env-vars "SUPABASE_URL=xxx,ZEABUR_API_KEY=xxx"
```

## Environment Variables
See `.env.example` for required configuration.
