# Project Plan: Context-Pruned RAG Optimization (Phase 1 Refinement)

> **Task Slug**: `PLAN-phase1-optimization.md`
> **Focus**: Scalability, Maintainability, and Telemetry for the RAG Engine.

## 1. Deep Research Findings (Audit Results)

Upon reviewing the "Completed" Phase 1 code, we identified significant "MVP Shortcuts" that limit the architecture's true potential:

| Component | Status | Issue / Gap | Optimization Strategy |
|-----------|--------|-------------|-----------------------|
| **TagLoader** | ⚠️ Partial | **Hardcoded Mocks**: Only Ueno & Shinjuku have L1 Profiles. Other stations return `null`, disabling tag-based vector filtering. | **Scalable Loader**: Implement a deterministic generator for all `coreTopology` stations. |
| **TagDispatcher** | ⚠️ Fragile | **Hardcoded Map**: `skillCapabilityMap` is hardcoded in the dispatcher class. Adding skills requires modifying the dispatcher. | **Dynamic Interface**: Move capability definition to the `DeepResearchSkill` interface. |
| **VectorService** | ✅ Good | Interface supports filtering. | **Telemetry**: Add specific logs to measure "Pruning Ratio" (Docs Searched / Total Docs). |
| **NodeResolver** | ✅ Good | Logic is sound but relies on `assistantEngine` regex. | No change needed for now. |

## 2. Optimization Strategy (The "Better Way")

The goal is to move from "Mocking the Architecture" to "Executing the Architecture".

### Key Architectural Shifts:
1.  **Data-Driven, Not Code-Driven**: Move tag definitions out of TypeScript `switch` statements and into data structures (JSON/DB).
2.  **Inversion of Control**: Skills should declare their own GEM Capabilities, rather than the Dispatcher knowing about them.
3.  **Fallback-First**: Ensure every station has at least a "Generic Transit" profile so Vector Search never runs "naked" (unfiltered).

## 3. Implementation Phases

### Phase 1.6: Scalable TagLoader (Data Layer)
-   **Goal**: Ensure `resolveNodeContext` returns a valid 3-5-8 profile for *any* ODPT station.
-   **Step 1**: Create `src/lib/l4/data/StationProfileMap.ts` (or utilize `coreTopology`) to map station IDs to generic profiles.
-   **Step 2**: Implement `TagGenerator.generateFallback(stationId)`:
    -   *Core*: Derive from Station Name (e.g. "SHINJUKU" -> `["SHIN", "JUKU"]` or hashed).
    -   *Intent*: Default to `["TRANSIT", "COMMUTE"]`.
    -   *Vibe*: Default to `["BUSY"]` for major hubs, `["LOCAL"]` for others (based on connection count).
-   **Verification**: Run `resolveNodeContext` on a random small station (e.g. "Sugamo") and verify it has tags.

### Phase 1.7: Dynamic Skill Capabilities (Logic Layer)
-   **Goal**: Decouple Dispatcher from Skill Implementations.
-   **Step 1**: Update `DeepResearchSkill` interface in `SkillRegistry.ts`:
    ```typescript
    interface DeepResearchSkill {
        // ... existing
        gemCapabilities?: string[]; // e.g. ['LUGGAGE', 'STROLLER']
    }
    ```
-   **Step 2**: specific skills (`LuggageSkill`, `AccessibilitySkill`) to declare `gemCapabilities`.
-   **Step 3**: Refactor `TagDrivenDispatcher.ts` to read `skill.gemCapabilities` instead of the hardcoded map.
-   **Verification**: Add a new dummy skill with a custom capability and verify the Dispatcher boosts it without code changes in the Dispatcher.

### Phase 1.8: RAG Telemetry & observability
-   **Goal**: Prove that "Context Pruning" actually works.
-   **Step 1**: Update `HybridEngine` logs to explicitly state:
    -   "Context Tags: [X, Y, Z]"
    -   "Vector Filter: { node_id: ..., tags: ... }"
-   **Step 2**: (Optional) Add a metric `rag_pruning_effectiveness` if monitoring allows.

## 4. Execution Checklist

- [ ] **1.6 Scalable TagLoader**
    - [ ] Create `StationProfileGenerator` class
    - [ ] Update `TagLoader.ts` to use generator for non-mocked stations
    - [ ] Test with integration script

- [ ] **1.7 Dynamic Skills**
    - [ ] Update `DeepResearchSkill` interface
    - [ ] Update 5 core skills (`Fare`, `Access`, `Luggage`, `Exit`, `Crowd`)
    - [ ] Refactor `TagDrivenDispatcher` to remove `skillCapabilityMap`

- [ ] **1.8 Validation**
    - [ ] Run `scripts/verify_rag_optimization.ts` (to be created)
    - [ ] Confirm no regression in latency

## 5. Agent Assignments

-   **Backend Specialist**: TagLoader & Skill Registry Refactor.
-   **QA/Verifier**: Create `verify_rag_optimization.ts`.
