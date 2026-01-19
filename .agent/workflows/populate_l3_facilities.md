---
description: How to populate L3 facility data (toilets, lockers, elevators, wifi) for stations
---

# L3 Facility Population Workflow

This workflow describes the process of researching and adding detailed L3 (Service Facilities) data to the `StationWisdomData` structure in `src/data/stationWisdom.ts`. To ensure systematic coverage, stations should be processed in batches defined by their **Ward (District)**.

## Prerequisites

- [ ] Target list of stations (grouped by Ward).
- [ ] Access to official station maps (links below).

## Research Sources

*   **Tokyo Metro**: [Accessibility Information (Traditional Chinese)](https://www.tokyometro.jp/lang_tcn/station/index.html) - *Best for Elevator/Toilet locations.*
*   **Toei Subway**: [Station Maps (English/Chinese)](https://www.kotsu.metro.tokyo.jp/subway/stations/index.html)
*   **JR East**: [Station Maps (English/Japanese)](https://www.jreast.co.jp/e/stations/) - *Look for "Barrier Free" or "Station Map" tabs.*
*   **Coin Locker Navi**: [coinlocker-navi.com](https://www.coinlocker-navi.com/) - *Good secondary source for locker counts/sizes.*

## Step-by-Step Instructions

### 1. Identify Target Stations (Batch by Ward)
Select a specific Ward (e.g., Taito, Chiyoda, Chuo) and list all "seed nodes" in that ward that are currently missing `l3Facilities` in `src/data/stationWisdom.ts`.

### 2. Facility Extraction
For each station, find the official map and extract the following 6 key facility types.
**Note:** Use specific floor numbers (e.g., 'Metro B1', 'JR 3F') and meaningful location descriptions (e.g., 'Near Exit A3', 'Inside Ticket Gate').

#### Required Data Points:
1.  **Toilets 🚻**:
    *   Location (Floor & Gate reference).
    *   `hasWashlet`: true/false (Assume true for major Tokyo stations unless archaic).
    *   `wheelchair`: true/false (Look for "Multipurpose Toilet" icon).
    *   `hasBabyRoom`: true/false (Look for baby chair/bed icon).

2.  **Lockers 🧳**:
    *   Location.
    *   `count`: Approx number if available (e.g., "many" -> 50+, "huge bank" -> 100+).
    *   `sizes`: ['S', 'M', 'L', 'XL'] (Standard coin lockers are S/M/L, Suica lockers often have XL).

3.  **Elevators 🛗**:
    *   Location (Connects which floors?).
    *   `wheelchair`: true.
    *   **Crucial**: Which exit does it serve? (e.g., "Exit A3 (Sole Elevator)").

4.  **WiFi 📶**:
    *   Operator specific SSIDs:
        *   Metro: `METRO_FREE_WiFi`
        *   Toei: `Toei_Free_Wi-Fi`
        *   JR: `JR-EAST_FREE_WiFi`

5.  **Charging Spots ⚡**:
    *   Look for "Customer Service Centers" or in-station cafes (less common in older stations).

6.  **Accessibility / Barrier Free**:
    *   General routing notes.

### 3. Data Entry (update `src/data/stationWisdom.ts`)
Add a new entry or update the existing one in `STATION_WISDOM`. Use the ID matching `src/lib/nodes/seedNodes.ts`.

```typescript
'odpt:Station:Operator.StationName': {
    // ... existing traps/hacks
    l3Facilities: [
        { type: 'toilet', floor: 'B1', operator: 'Metro', location: 'Gate Inside', attributes: { wheelchair: true } },
        // ... add others
    ]
}
```

### 4. Verification
1.  Run `npm run dev`.
2.  Navigate to the map/station list.
3.  Open the station's "Facilities" (L3) tab.
4.  Verify the "Badge Counts" (e.g., [🚻 2]) match your entry.
5.  Click a facility to ensure the modal opens with correct details.

## Automation Plan (Batch Execution)

When running this workflow for a batch of stations:
1.  create a `task.md` entry tracking the Ward progress.
2.  Mark each station as `[x]` upon completion.
3.  Commit changes in logical groups (e.g., "feat: L3 data for Minowa & Iriya").
