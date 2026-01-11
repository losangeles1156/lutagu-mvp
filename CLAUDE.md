# LUTAGU Tokyo MVP - Claude Rules (CLAUDE.md)

This file serves as the primary rule set for AI development across different tools (Trae, Cursor, Claude Code, etc.).

---

## 1. Project Overview
LUTAGU is a PWA-based **Urban Sensibility Navigation Service**.
Core Value: Translate raw open data (ODPT, GTFS, OSM) into empathetic action suggestions (Nudges).

## 2. Prime Directives
- **Guest-First**: 90% of features must work without login.
- **Commercial Reality**: Prioritize actionable alternatives (Uber, LUUP) when transit is congested.
- **Inheritance Efficiency**: Strict limit of 10-15 Hub nodes; Spokes inherit personality.
- **One Recommendation**: Output must converge to a single "Primary Card".

## 3. Technical Stack
- **Reasoning Engine**: Google Gemini 3 Pro (via Dify)
- **Orchestration**: Dify (RAG Engine)
- **Database**: Supabase (PostgreSQL)
- **ETL**: n8n
- **Frontend**: Next.js PWA

## 4. Coding Standards
- **File Names**: kebab-case (`city-adapter.ts`)
- **Variables/Functions**: camelCase (`resolveNodePersona`)
- **Constants**: UPPER_SNAKE_CASE (`ODPT_API_KEY`)
- **Types/Interfaces**: PascalCase (`NodePersona`)
- **I18n**: Traditional Chinese (zh-TW) is default; Support English (en) and Japanese (ja).

## 5. Data Layers (L1-L4)
- **L1 (DNA)**: Static properties (ODPT, OSM).
- **L2 (Live)**: Real-time variables (ODPT API, Weather).
- **L3 (Micro)**: Facilities & Suitability tags.
- **L4 (Action)**: AI-generated mobility strategies.

---
*For detailed rules, refer to [project_rules.md](file:///Users/zhuangzixian/Documents/BambiGO_MVP/rules/project_rules.md)*
