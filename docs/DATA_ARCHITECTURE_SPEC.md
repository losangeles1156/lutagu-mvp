# LUTAGU L1~L4 Data Architecture & ETL Specification

This document outlines the tiered data architecture and the ETL (Extract, Transform, Load) processes used in the LUTAGU project.

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
*   **Primary Table**: `l4_knowledge_embeddings` (and `l4_knowledge_v2`)
*   **Schema Highlights**:
    *   `entity_id`: Associated station or location ID (ODPT format).
    *   `knowledge_type`: 'hub_station', 'railway_line', 'general'.
    *   `category`: e.g., 'tip', 'warning', 'transfer'.
    *   `content`: Detailed text in UTF-8.
    *   `embedding`: Vector data for semantic search (pgvector, 1024 dimensions for Mistral).
    *   `source`: URL of the original article.
*   **Data Source**: Scraped articles from Tokyo LetsgoJP and Matcha JP, expert markdown files.

---

## 2. ETL Processing Flow

### 2.1 L1 Pipeline (POI Ingestion)
1.  **Extract**: Queries OpenStreetMap via Overpass API for POIs within a radius of major stations.
2.  **Transform**: Standardizes OSM tags into LUTAGU's category system.
3.  **Load**: Upserts into `l1_places`.
*   *Script*: `scripts/l1_pipeline/run.ts`

### 2.2 L2/L3 Pipeline (Transport & Facilities)
1.  **Extract**: Fetches station, route, and facility data from ODPT API.
2.  **Transform**: Merges facility data (toilets/elevators) from OSM if ODPT data is incomplete.
3.  **Load**: Stores into `stations_static` and `routes`.
*   *Scripts*: `scripts/etl_odpt_knowledge.ts`, `scripts/l3_fill_toilets.ts`, `scripts/l3_fill_accessibility.ts`.

### 2.3 L4 Crawler & Ingestion Pipeline
1.  **Crawl**: Uses Puppeteer for dynamic rendering of travel articles.
2.  **Extract**: Identifies station entities using a predefined mapping (`STATION_MAPPING`).
3.  **Transform**:
    *   L1: Stores raw page structure and metadata.
    *   L4: Summarizes content and categorizes it (tip, warning, transfer).
4.  **Load**: Upserts into `l4_knowledge_embeddings` with source URL for incremental updates.
*   *Main Script*: `scripts/crawler/main.ts`
*   *Crawlers*: `tokyo_letsgojp.ts`, `matcha_jp.ts`

---

## 3. Data Integrity & Quality Standards

*   **Encoding**: All text data MUST be stored in **UTF-8** format.
*   **Incremental Updates**: 
    *   Based on `source` URL in `l4_knowledge_embeddings`.
    *   Uses `upsert` logic to prevent duplicates while allowing content updates.
*   **Validation**:
    *   Entity Mapping: Ensures `entity_id` matches standard ODPT station IDs.
    *   Language: Primary storage in `zh-TW` and `ja`.
    *   Deduplication: Prevents re-crawling the same URL via `isAlreadyCrawled` check.
*   **Error Handling**: Failed crawls or database insertions are logged, and partial successes are tracked.
