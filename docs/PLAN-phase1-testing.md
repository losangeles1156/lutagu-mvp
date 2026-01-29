# Phase 1: Commercialization Testing Plan

> **Goal**: Ensure the "Context-Pruned RAG" engine is robust, scalable, and fail-safe for production.
> **Method**: Automated Unit & Integration Tests using `node --test`.

## 1. Test Scope (Phase 1 Components)

We will implement rigorous tests for the following components:

| Component | Responsibility | Critical Paths to Test |
|-----------|----------------|------------------------|
| **StationProfileGenerator** | Data | - Deterministic Tag Generation<br>- Hub Detection Logic<br>- Fallback for unknown stations |
| **TagDrivenDispatcher** | Logic | - Dynamic Capability Matching<br>- Attention Weight Logic (Length-based)<br>- Dispatch Thresholds |
| **SkillRegistry** | Management | - Skill Registration<br>- Priority Sorting<br>- Conflict Resolution |
| **VectorService** | Integration | - Telemetry Logging (Spy)<br>- Error Handling (Network Failure)<br>- Pruning (Filter Construction) |
| **HybridEngine** | Orchestration | - End-to-End Flow (Input -> Tag -> Dispatch -> Result)<br>- Latency Constraints |

## 2. Test Architecture

We will colocate tests in `src/lib/l4/__tests__/` to utilize the existing `npm test` runner configuration.

### Directory Structure
```
src/lib/l4/__tests__/
├── StationProfileGenerator.test.ts
├── TagDrivenDispatcher.test.ts
├── SkillRegistry.test.ts
├── VectorService.test.ts  (Mocked Fetch)
└── HybridEngine.integration.test.ts
```

## 3. Detailed Test Cases

### 3.1 StationProfileGenerator
- [ ] **Hub Identification**: Should mark Shinjuku, Tokyo as HUB.
- [ ] **Tag Consistency**: "Ueno" should always yield `[JR, METR, UENO, HUB]`.
- [ ] **Edge Cases**: Empty ID, Invalid Format, "Null" Station.

### 3.2 TagDrivenDispatcher
- [ ] **Short Query Boost**: Input < 5 chars should boost Identity scores.
- [ ] **Long Query Boost**: Input > 5 chars should boost Capability scores.
- [ ] **Capability Matching**: Skill with `gemCapabilities=['LUGGAGE']` must match Profile `capabilities=['LUGGAGE']`.

### 3.3 SkillRegistry
- [ ] **Order**: `getSkills()` must return sorted by `priority`.
- [ ] **Null Handling**: `findMatchingSkill` returns null if no match.

### 3.4 VectorService (Mocked)
- [ ] **Telemetry Spy**: Verify `console.log` contains "[VectorTelemetry]".
- [ ] **Graceful Failure**: If Fetch fails, return empty array (do not crash).

### 3.5 HybridEngine (E2E)
- [ ] **Full Pipeline**: Dispatch "Where are lockers?" -> `StationProfileGenerator` -> `TagDrivenDispatcher` -> `LuggageSkill`.

## 4. Execution Command
```bash
npm test
```
