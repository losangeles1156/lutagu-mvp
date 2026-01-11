# AI Tools Guide - LUTAGU MVP

## 1. Trae (Primary IDE)
- Use **SOLO Mode** for rapid development.
- Refer to `.trae/documents/` for project context.
- Keep the `project_rules.md` updated.

## 2. Dify (AI Orchestration)
- Use Dify for managing complex RAG flows.
- Keep tool definitions (OpenAPI specs) in `dify/`.
- Test prompts in the Dify studio before integration.

## 3. n8n (ETL & Automation)
- Use n8n for scheduled data synchronization.
- Monitor workflow logs for failures in ODPT/Weather sync.

## 4. Supabase (Backend)
- Use Supabase CLI for migrations.
- Monitor database performance in the Supabase dashboard.
