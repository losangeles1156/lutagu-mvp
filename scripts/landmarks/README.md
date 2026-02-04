# Landmark Pipeline (Reusable)

This pipeline expands city landmark datasets (e.g., Tokyo 23 wards) into `places_<city>.json` with provenance and station candidates.

## Stages
1. **Fetch OSM** (`fetch_osm.ts`)
2. **Fetch Wikidata** (`fetch_wikidata.ts`) for fallback/coverage
3. **Normalize** (`normalize_landmarks.ts`) to internal schema
4. **Assign stations** (`assign_stations.ts`) using nearest 3 stations
5. **Merge output** (`merge_output.ts`) into `src/data/places_<city>.json`

## Example (Tokyo Phase)
```bash
# 1) Fetch OSM (tourism core) - adjust limit per batch
npx tsx scripts/landmarks/fetch_osm.ts --city=tokyo_23wards --limit=60 --out=tmp/osm_tokyo.json

# 2) Fetch Wikidata fallback (optional)
npx tsx scripts/landmarks/fetch_wikidata.ts --city=tokyo_23wards --limit=60 --out=tmp/wd_tokyo.json

# 3) Normalize (prepare a combined raw list file first)
# NOTE: You should merge OSM/Wikidata results into tmp/landmarks_raw.json
npx tsx scripts/landmarks/normalize_landmarks.ts tmp/landmarks_raw.json tmp/landmarks_normalized.json

# 4) Assign station candidates
npx tsx scripts/landmarks/assign_stations.ts tmp/landmarks_normalized.json tmp/landmarks_with_stations.json

# 5) Merge into places file
npx tsx scripts/landmarks/merge_output.ts tmp/landmarks_with_stations.json src/data/places_tokyo.json
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
