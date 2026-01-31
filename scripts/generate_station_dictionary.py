#!/usr/bin/env python3
"""
Generate Station Dictionary for L4 Fuzzy Matching

This script extracts station names from:
1. routing_graph.json - All ODPT Station IDs
2. staticL1Data.ts - Multi-language station data (partial)

Output: public/data/station_dictionary.json
"""

import json
import re
import os
from datetime import datetime
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
ROUTING_GRAPH_PATH = PROJECT_ROOT / "public" / "data" / "routing_graph.json"
STATIC_L1_PATH = PROJECT_ROOT / "src" / "data" / "staticL1Data.ts"
OUTPUT_PATH = PROJECT_ROOT / "public" / "data" / "station_dictionary.json"

# Common Japanese station suffixes for alias generation
STATION_SUFFIXES = ["駅", "Station", "站", "Sta", "Sta."]

# Romanization mapping for common Japanese characters
ROMANIZATION_MAP = {
    "ō": "o", "ū": "u", "ā": "a", "ī": "i", "ē": "e",
    "Ō": "O", "Ū": "U", "Ā": "A", "Ī": "I", "Ē": "E",
}

def normalize_romanization(text: str) -> str:
    """Remove macrons and normalize romanization."""
    for k, v in ROMANIZATION_MAP.items():
        text = text.replace(k, v)
    return text.lower()

def extract_station_name_from_id(station_id: str) -> dict:
    """
    Extract station name from ODPT ID.
    Example: 'odpt.Station:JR-East.Yamanote.Tokyo' -> 'Tokyo'
    """
    # Pattern: odpt.Station:Operator.Line.StationName
    match = re.match(r"odpt\.Station:[^.]+\.[^.]+\.(.+)", station_id)
    if match:
        name = match.group(1)
        # Split CamelCase or handle special cases
        # e.g., "NaritaAirportTerminal1" -> "Narita Airport Terminal 1"
        spaced_name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
        spaced_name = re.sub(r'(\d)', r' \1', spaced_name).strip()
        return {
            "en": spaced_name,
            "ja": name,  # Will be overwritten if we have better data
            "zh": name,  # Will be overwritten if we have better data
        }
    return {"en": "", "ja": "", "zh": ""}

def generate_aliases(names: dict, station_id: str) -> list:
    """Generate common aliases for a station."""
    aliases = set()
    
    for lang, name in names.items():
        if not name:
            continue
        aliases.add(name)
        aliases.add(name.lower())
        aliases.add(normalize_romanization(name))
        
        # Add with/without station suffixes
        for suffix in STATION_SUFFIXES:
            aliases.add(f"{name}{suffix}")
            aliases.add(f"{name} {suffix}")
            if name.endswith(suffix):
                aliases.add(name[:-len(suffix)].strip())
    
    # Add the raw ID parts
    parts = station_id.split(".")
    if len(parts) >= 3:
        aliases.add(parts[-1])
        aliases.add(parts[-1].lower())
    
    return list(aliases)

def parse_static_l1_data(file_path: Path) -> dict:
    """
    Parse staticL1Data.ts to extract station names.
    Returns: {station_id: {ja, en, zh}}
    """
    station_names = {}
    
    if not file_path.exists():
        print(f"Warning: {file_path} not found")
        return station_names
    
    content = file_path.read_text(encoding="utf-8")
    
    # Find all station ID keys and their title/tagline objects
    # Pattern: "odpt.Station:..." : { ... "title": { "ja": "...", "en": "...", "zh": "..." } }
    pattern = r'"(odpt\.Station:[^"]+)":\s*\{[^}]*"title":\s*\{\s*"ja":\s*"([^"]*)",\s*"en":\s*"([^"]*)",\s*"zh":\s*"([^"]*)"'
    
    for match in re.finditer(pattern, content, re.DOTALL):
        station_id = match.group(1)
        station_names[station_id] = {
            "ja": match.group(2),
            "en": match.group(3),
            "zh": match.group(4),
        }
    
    print(f"Parsed {len(station_names)} stations from staticL1Data.ts")
    return station_names

def load_routing_graph(file_path: Path) -> set:
    """Load all station IDs from routing graph."""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    station_ids = set()
    adj = data.get("adj", {})
    
    for from_station in adj.keys():
        station_ids.add(from_station)
        for to_station in adj[from_station].keys():
            station_ids.add(to_station)
    
    print(f"Found {len(station_ids)} unique stations in routing graph")
    return station_ids

def main():
    print("=== Station Dictionary Generator ===\n")
    
    # 1. Load all station IDs from routing graph
    all_station_ids = load_routing_graph(ROUTING_GRAPH_PATH)
    
    # 2. Parse existing multi-language data from staticL1Data.ts
    l1_names = parse_static_l1_data(STATIC_L1_PATH)
    
    # 3. Build dictionary
    stations = []
    for station_id in sorted(all_station_ids):
        # Get names from L1 data if available, otherwise extract from ID
        if station_id in l1_names:
            names = l1_names[station_id]
        else:
            names = extract_station_name_from_id(station_id)
        
        # Generate aliases
        aliases = generate_aliases(names, station_id)
        
        # Extract reading (hiragana) from the name if possible
        reading = ""  # Would require additional data source
        
        stations.append({
            "id": station_id,
            "names": names,
            "aliases": aliases,
            "reading": reading,
        })
    
    # 4. Build output
    output = {
        "meta": {
            "count": len(stations),
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "version": "1.0",
            "sources": ["routing_graph.json", "staticL1Data.ts"],
        },
        "stations": stations,
    }
    
    # 5. Write output
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Generated {OUTPUT_PATH}")
    print(f"   Total stations: {len(stations)}")
    print(f"   Stations with L1 data: {len(l1_names)}")
    print(f"   Stations from ID only: {len(stations) - len(l1_names)}")

if __name__ == "__main__":
    main()
