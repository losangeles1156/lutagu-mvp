# Test Plan: Agent 2.0 Deep Research Verification

## Objective
Verify that **AI Agent 2.0** correctly handles complex "Deep Research" tasks, specifically focusing on the visibility of the **Thinking Plan (Todo List)** and the execution/display of **Tool Calls**.

## Scope
- **P1 Verification**: `[PLAN]` UI Integration.
- **P2 Verification**: Tool Invocation & Display (e.g., `findRoute`).
- **Target**: `src/components/chat/` (UI), `/api/agent/v2` (Logic).

## Test Scenarios

### Scenario 1: PLAN UI Visualization
**Goal**: Ensure the user sees the breakdown of a complex task.
- **Trigger**: User asks "Create a 3-day itinerary for Tokyo first-timers".
- **Expected Behavior**:
    1. Agent response contains a valid `[PLAN]...[/PLAN]` block.
    2. UI parses this block and renders a `PlanCard` or `TodoChecklist` component.
    3. The checklist shows items with statuses (Pending, In Progress, Completed).
- **Assertions**:
    - `data-testid="agent-plan-card"` is visible.
    - Plan title and items are rendered correctly.

### Scenario 2: Tool Invocation & Result Rendering
**Goal**: Ensure the Agent can call tools and the UI displays structured results.
- **Trigger**: User asks "How do I get from Tokyo Station to Shinjuku Station?".
- **Expected Behavior**:
    1. Agent calls `findRoute` tool.
    2. API returns route data.
    3. Agent incorporates this data into the response.
    4. UI renders a high-fidelity Route Card (not just markdown text).
- **Assertions**:
    - `data-testid="route-result-card"` (or equivalent) is visible.
    - Route details (duration, fare) are correct.

### Scenario 3: Subagent Isolation (Deep Research)
**Goal**: Verify the "Deep Research" subagent flow.
- **Trigger**: User asks "Research the history of Ueno Park and list nearby hidden gem cafes".
- **Expected Behavior**:
    1. Agent identifies this as an exploration task.
    2. Agent spawns a `localExpert` or `explore` subagent.
    3. Logs show `runSubagent` execution.
    4. Final response aggregates the research findings.
- **Assertions**:
    - Response contains detailed information (simulating depth).
    - (Optional) UI shows "Researching..." indicator.

## Implementation Strategy
- Use **Playwright** for E2E testing.
- **Mocking**: To ensure deterministic tests, we will mock the `/api/agent/v2` response to force specific `[PLAN]` JSON and Tool outputs. This isolates UI testing from LLM variability.
- **Live Test**: We will also include one "Live" test case that hits the real Zeabur/OpenRouter API to verify the contract holds, but marked as `retries: 2` due to LLM variance.

## Success Criteria
- [ ] Plan UI renders correctly when valid JSON is received.
- [ ] Tool cards render correctly when tool data is present.
- [ ] No recursive loops or crashes during subagent handoffs.
