# Phase 2 Optimization: Scalable Real-time Feedback Loop

> **Goal**: Establish a robust, city-agnostic feedback loop that learns from user interactions (Weight Adjustment) and real-time conditions (Dynamic Context) without hardcoded mappings.

## User Review Required
> [!IMPORTANT]
> **Scalability Mandate**: All implementations must be data-driven.
> - `DynamicContextService`: Must resolve Line IDs dynamically from `StationProfileGenerator`, removing the hardcoded `STATION_LINE_MAP`.
> - `WeightAdjuster`: Must use a generic decay/boost formula applicable to any station ID pattern.

## Proposed Changes

### 1. Re-implement WeightAdjuster (The "Missing Link")
Re-create the missing `src/lib/l4/monitoring/WeightAdjuster.ts`.
- **Logic**:
    - **Boost**: Click/Stay > 30s -> `weight * 1.05`
    - **Decay**: Bounce < 5s -> `weight * 0.95`
    - **Persistence**: Periodic sync to Supabase `station_weights` table.
- **Scalability**: Works on ANY `nodeId` string, no city-specific logic.

### 2. Enhance DynamicContextService (Generic Adapter)
Refactor `src/lib/l4/DynamicContextService.ts` to remove hardcoded map.
- **Old**: `STATION_LINE_MAP` (manual list).
- **New strategy**:
    - Extract Operator/Line code from `odpt.Station:Operator.Line.Station` ID directly.
    - Or query `StationProfileGenerator` metadata.
    - Fetch disruption stats using this parsed Line ID.

### 3. Verify KnowledgeGapManager (E2E)
- Ensure `Generic Research Task` generation works for any locale.
- Verify `enrichment_requests` table schema compatibility.

## Verification Plan

### Automated Tests
- `scripts/verify_weight_adjuster.ts`: Simulate 100 user signals and verify weight evolution.
- `scripts/verify_dynamic_context_generic.ts`: Test with random stations (e.g. Osaka/Kyoto IDs if format matches) to ensure no hardcoding.

### Manual Verification
- Trigger a mock "Delay" for a randomly generated station and verify `intent.capabilities` includes `DELAY_XX`.
