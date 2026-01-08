---
description: "How to populate curated L1 (POI) data for a specific Ward"
---

This workflow guides the process of identifying key stations in a ward, selecting representative POIs, and injecting them into the `l1_custom_places` table.

## 1. Identify Target Stations
- List all major hubs and tourist-heavy stations in the target Ward.
- Reference `stationLines.ts` or the database `nodes` table.

## 2. Curate Points of Interest (POIs)
For each target station, select 3-5 high-quality spots that represent the station's "Vibe".
- **Primary Categories**: Dining, Shopping, Culture, Nature, Leisure, etc.
- **Criteria**:
    - "Must-visit" status (Landmarks)
    - High utility (key shopping malls, convenient dining)
    - Cultural significance (shrines, historic sites)

## 3. Prepare Data Payload
Format the data for the `l1_custom_places` table.
- **Station ID**: Ensure exact ID match (e.g., `odpt:Station:JR-East.Shibuya`).
- **Name**: JSONB `{"ja": "...", "en": "...", "zh": "..."}`.
- **Vibe Tags**: JSON array of keywords (e.g., `["historic", "quiet"]`).
- **AI Description**: Short, context-rich description for the Agent (in Traditional Chinese).
- **Location**: GeoJSON Point `{"type": "Point", "coordinates": [lon, lat]}`.

## 4. Generate & Apply Migration
- Create a SQL migration file in `supabase/migrations`.
- Use `INSERT INTO l1_custom_places ... VALUES ...`.
- Apply via `apply_migration` tool.

## 5. Verification
- Query `v_l1_agent_context` to verify count and content.
- Check Frontend `L1_DNA` component (via `notify_user` asking for review or checking artifacts).
