# LUTAGU(ルタグ) System Architecture Review & Resource Inventory

## 1. System Architecture Overview

The system is a Next.js application acting as a backend for an AI Agent (likely integrated with Dify). It handles data ingestion, processing, and serves an API for accessibility information.

- **Frontend/API**: Next.js (App Router)
- **Database**: Supabase (PostgreSQL)
- **Agent Framework**: Dify (DSL configuration) + Local Agent Logic (`src/lib/agent/`)
- **Data Processing**: TypeScript scripts in `scripts/` (ETL, Scraping)

## 2. Resource Inventory

### Data Assets
| Asset Name | Source | Path/Table | Update Frequency | Access |
|------------|--------|------------|------------------|--------|
| Station Registry | ODPT/Wikipedia | `scripts/data/jr_station_ids.json`, DB: `stations` | Static/Manual | Read-only |
| Pedestrian Network | Hokonavi/ODPT | DB: `pedestrian_links`, `pedestrian_nodes` | Batch (ETL) | Read/Write |
| Station Wisdom | Manual/Generated | `src/data/tokyo_transit_knowledge_base.md` | Manual | Read-only |
| Facility Data | Scrapers | `scripts/l3-scraper/` | Daily/Weekly | Read/Write |

### Tools (API & Local)
| Tool Name | Type | Implementation | Description |
|-----------|------|----------------|-------------|
| `get_weather` | API | `src/app/api/weather/live/route.ts` | Real-time weather data |
| `get_train_status` | API | `src/app/api/odpt/train-status/route.ts` | Train operation status |
| `get_accessibility` | API | `src/app/api/station/accessibility/route.ts` | Station barrier-free stats |
| `Pedestrian Scanner` | Local | `src/lib/agent/tools/pedestrianTools.ts` | Spatial query for paths |

## 3. Architecture Gaps & Recommendations

1.  **Tagging System**: Currently missing a dedicated tag association engine.
2.  **Knowledge Graph**: No graph database; relies on relational tables (`pedestrian_links`). Recommendation: Implement graph traversal logic in PostgreSQL (recursive CTEs) or use `pg_routing`.
3.  **Dynamic Permissions**: API endpoints currently lack fine-grained RBAC/ABAC beyond basic Supabase auth.
4.  **Performance Monitoring**: No automated performance reporting detected in the codebase.

## 4. Upgrade Plan (Executed)

1.  **Role Enhancement**: Updated `lutagu_agent_dsl.yml` with "Intelligent Navigator" prompt.
2.  **API Enhancement**: Upgraded `get_accessibility` to return traceability and confidence metrics.
3.  **Tag Engine**: Implemented `TagEngine` in `src/lib/tagging/`.
4.  **Testing**: Added regression test suite.
