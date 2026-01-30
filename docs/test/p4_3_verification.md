# P4-3 Integration Verification Test Plan

## Objective
Verify that the `adk-agent` (Go) and `AgentTools` (Frontend) are correctly wired to their respective real services (`l4-routing-rs` and `vector-search-rs`), replacing previous mock logic.

## Test Scope

### 1. Vector Search Integration (POI)
- **Component**: `AgentTools.ts` -> `vectorService.ts` -> `vector-search-rs`
- **Trigger**: User asks for recommendations (e.g., "Ramen near Tokyo Station").
- **Verification**:
    - Query should return results.
    - Results should NOT be the hardcoded mock data (check for dynamic properties or specific real-world data if possible, or just successful non-empty response).
    - System should not crash or return "No results found" error.

### 2. Routing Service Integration
- **Component**: `adk-agent` -> `l4-routing-rs`
- **Trigger**: User asks for a route (e.g., "From Tokyo to Shinjuku").
- **Verification**:
    - Agent should return a route summary.
    - Response should contain real routing metrics (Time, Transfers) consistent with `l4-routing-rs` logic.
    - Response should NOT be the hardcoded "Yamanote Line (Inner Loop) -> 14 mins" mock string (unless that's the actual best route, but the format differs).

## Test Method
- **Tool**: Playwright E2E Test
- **File**: `tests/e2e/p4_3_integration.spec.ts`
- **Setup**:
    - Ensure `adk-agent`, `l4-routing-rs`, `vector-search-rs`, and `qdrant` are running.
    - Use `chat-api` (Next.js) as the entry point.

## Test Cases

### TC-01: POI Search (Vector DB)
1. User sends: "Find ramen near Tokyo Station"
2. Expect: Response containing "Found" and a list of locations.
3. Validate: Console logs or UI elements confirm vector search execution.

### TC-02: Route Search (Rust L4)
1. User sends: "How to go from Tokyo to Shinjuku?"
2. Expect: Response containing route options (e.g., "Time:", "Transfers:").
3. Validate: Response format matches the new `route.go` summary format.

## Execution
Run with: `npx playwright test tests/e2e/p4_3_integration.spec.ts`
