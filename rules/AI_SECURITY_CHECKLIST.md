# AI Security Checklist - LUTAGU MVP

## 1. Data Privacy
- NEVER hardcode API keys or secrets in the codebase.
- Use environment variables (`.env.local`) for sensitive information.
- Ensure personal identifiable information (PII) is not logged or sent to AI unless necessary.

## 2. AI Prompt Security
- Sanitize user inputs before passing them to Dify/Gemini to prevent prompt injection.
- Monitor AI outputs for hallucinated or malicious links.

## 3. Database Security
- Use Row Level Security (RLS) in Supabase.
- Validate all database queries to prevent SQL injection.

## 4. Third-Party Integration
- Validate responses from ODPT, GBFS, and other APIs.
- Use rate-limiting for external API calls to avoid cost spikes.
