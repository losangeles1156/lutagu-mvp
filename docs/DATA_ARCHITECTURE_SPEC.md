# BambiGO L1~L4 Data Architecture & ETL Specification

This document outlines the tiered data architecture and the ETL (Extract, Transform, Load) processes used in the BambiGO project.

## 1. Data Layer Architecture (L1~L4)

### L1: Points of Interest (POI) & Environment
*   **Purpose**: Provides information about the surroundings of a station (What's nearby?).
*   **Primary Table**: `l1_places`
*   **Schema Highlights**:
    *   `id`: Unique identifier (UUID).
    *   `station_id`: Foreign key to `nodes.id`.
    *   `name` / `name_i18n`: POI name and multilingual support.
    *   `category` / `subcategory`: e.g., 'food', 'shopping', 'tourism'.
    *   `location`: PostGIS geometry point.
*   **Storage**: PostgreSQL (Supabase) with PostGIS.

### L2: Operational & Dynamic Transport
*   **Purpose**: Real-time and static transport data for routing and scheduling.
*   **Primary Tables**: `routes`, `l2_connections`, `l2_disruption_history`.
*   **Schema Highlights**:
    *   `routes`: Standard GTFS-like route definitions.
    *   `l2_disruption_history`: Historical records of train delays and cancellations.
*   **Data Source**: ODPT (Open Data for Public Transportation) API.

### L3: Station Facilities & Accessibility
*   **Purpose**: Detailed internal station data (Does it have an elevator?).
*   **Primary Table**: `stations_static`
*   **Schema Highlights**:
    *   `station_id`: Standard ODPT station ID.
    *   `facilities`: JSONB column containing detailed facility info (toilets, elevators, escalators).
    *   `operator`: e.g., 'JR-East', 'TokyoMetro'.
*   **Data Source**: ODPT API supplemented with OpenStreetMap (OSM) data.

### L4: Expert Knowledge & Insights
*   **Purpose**: Human-curated tips, warnings, and complex transfer guides for RAG.
*   **Primary Table**: `l4_knowledge_v2`
*   **Schema Highlights**:
    *   `node_id`: Associated station or location ID.
    *   `knowledge_type`: 'hub_station', 'railway_line', 'general'.
    *   `tag_category`: e.g., 'tip', 'warning', 'transfer'.
    *   `content`: Detailed text in UTF-8.
    *   `embedding`: Vector data for semantic search (pgvector).
*   **Data Source**: Scraped articles, expert markdown files, and manual entries.

---

## 2. ETL Processing Flow

### 2.1 L1 Pipeline (POI Ingestion)
1.  **Extract**: Queries OpenStreetMap via Overpass API for POIs within a radius of major stations.
2.  **Transform**: Standardizes OSM tags into BambiGO's category system.
3.  **Load**: Upserts into `l1_places`.
*   *Script*: `scripts/l1_pipeline/run.ts`

### 2.2 L2/L3 Pipeline (Transport & Facilities)
1.  **Extract**: Fetches station, route, and facility data from ODPT API.
2.  **Transform**: Merges facility data (toilets/elevators) from OSM if ODPT data is incomplete.
3.  **Load**: Stores into `stations_static` and `routes`.
*   *Scripts*: `scripts/etl_odpt_knowledge.ts`, `scripts/l3_fill_toilets.ts`, `scripts/l3_fill_accessibility.ts`.

### 2.3 L4 Pipeline (Knowledge Ingestion)
1.  **Extract**: Scrapes travel websites or reads local markdown files.
2.  **Transform**: Extracts entities (stations), categorizes content, and generates vector embeddings using OpenAI/Cohere models.
3.  **Load**: Upserts into `l4_knowledge_v2`.
*   *Scripts*: `scripts/ingest_l4_markdown.ts`, `scripts/crawler/` (New crawler framework).

---

## 3. Data Integrity & Quality Standards

*   **Encoding**: All text data MUST be stored in **UTF-8** format.
*   **Incremental Updates**: Use `UPSERT` logic based on unique identifiers (e.g., URL for scraped data, Station ID for facilities) to avoid duplication.
*   **Validation**:
    *   Coordinate bounds check (must be within Tokyo/Greater Tokyo area).
    *   Multilingual completeness check (ensure at least `ja` and `zh-TW` names exist for L1/L4).
    *   Source tracking: Every record must have a `source` or `url` field.
