# Landmark Pipeline (Reusable)

This pipeline expands city landmark datasets (e.g., Tokyo 23 wards) into `places_<city>.json` with provenance and station candidates.

## Stages
1. **Fetch OSM** (`fetch_osm.ts`)
2. **Fetch Wikidata** (`fetch_wikidata.ts`) for fallback/coverage
3. **Normalize** (`normalize_landmarks.ts`) to internal schema
4. **Assign stations** (`assign_stations.ts`) using nearest 3 stations
5. **Merge output** (`merge_output.ts`) into `src/data/places_<city>.json`

## Example (Tokyo Phase) - Node JS pipeline (no tsx)
```bash
# 1) Fetch OSM (tourism core) - adjust limit per batch
node scripts/landmarks/fetch_osm.js --city=tokyo_23wards --limit=60 --out=tmp/osm_tokyo.json

# 2) Fetch Wikidata fallback (optional)
node scripts/landmarks/fetch_wikidata.js --city=tokyo_23wards --limit=60 --out=tmp/wd_tokyo.json

# 3) Merge raw sources (OSM + Wikidata)
node scripts/landmarks/merge_raw.js tmp/osm_tokyo.json tmp/wd_tokyo.json tmp/landmarks_raw.json

# 4) Normalize
node scripts/landmarks/normalize_landmarks.js tmp/landmarks_raw.json tmp/landmarks_normalized.json

# 5) Assign station candidates
node scripts/landmarks/assign_stations.js tmp/landmarks_normalized.json tmp/landmarks_with_stations.json

# 6) Select a batch (30)
node scripts/landmarks/select_batch.js tmp/landmarks_with_stations.json src/data/places_tokyo.json tmp/landmarks_batch.json 30

# 7) Merge into places file
node scripts/landmarks/merge_output.js tmp/landmarks_batch.json src/data/places_tokyo.json
```

## Schema
Each place entry must include:
- `id`
- `category`
- `name` (en/ja/zh-TW)
- `aliases` (array)
- `coordinates` (lat/lng)
- `candidateStations` (3)
- `source` (`osm` | `wikidata` | `manual`)
- `source_id`
- `last_verified` (ISO)

## Notes
- `scripts/data/stations_by_ward.json` is used for nearest-station calculations.
- For other cities, add a bbox and station dataset, then reuse scripts.
