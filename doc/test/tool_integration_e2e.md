# Test Plan: Tool Integration Verification (E2E)

**Goal**: Verify that the ADK Agent's tools (Timetable, Routing) are correctly invoked and visualized in the LUTAGU frontend.

## 1. Requirement Analysis
The user wants to ensure that:
- Tools are developed as requested.
- Tools are usable and functionally correct in the frontend.
- No "abnormalities" (e.g., empty cards, failed streaming) occur during frontend operation.

## 2. Test Scenarios

### Scenario 1: Deep Research Routing (Weather Aware)
- **Input**: "現在正在下雨，我要從東京車站去新宿，請給我建議。" (It is raining now, I want to go to Shinjuku from Tokyo, give me advice.)
- **Expected Backend Behavior**:
  - Root Agent detects `ROUTE` intent.
  - General Agent invokes `plan_route` tool.
  - Tool detects `IsRaining = true` (mocked or real).
- **Expected Frontend Behavior**:
  - [Thinking Card] appears showing `plan_route` activity.
  - [Route Result Card] appears showing the path and "☔ Rain detected" advice.
  - The map should update to focus on the stations (if implemented).

### Scenario 2: Timetable Query
- **Input**: "我想看東京站銀座線的時刻表。" (I want to see the timetable for Tokyo Station Ginza Line.)
- **Expected Backend Behavior**:
  - Root Agent detects `ROUTE` or `GENERAL`.
  - General Agent invokes `get_timetable` with `station_id`.
- **Expected Frontend Behavior**:
  - [Timetable Card] or structured list appears with actual train times.
  - No "data not found" error if the station is a major Metro station.

### Scenario 3: Real-time Status
- **Input**: "山手線現在有延誤嗎？" (Are there delays on the Yamanote line?)
- **Expected Backend Behavior**:
  - Root Agent detects `STATUS`.
  - General Agent/Status Agent invokes `get_train_status`.
- **Expected Frontend Behavior**:
  - Text response correctly stating the status.
  - Status indicator (Green/Yellow/Red) shown if supported by UI.

## 3. Test Environment
- **Local**: `npm run dev` (Frontend) + `go run cmd/agent/main.go` (Backend).
- **Staging**: Cloud Run (Backend) + Vercel (Frontend).

## 4. Playwright Implementation Plan
Create `e2e/tool_integration.spec.ts` covering:
- Intercepting `/api/agent/v2` to verify tool call tags (`[PLAN]`, `[TOOL]`).
- Asserting on DOM elements with `data-testid="agentic-response-card"`.

## 5. User Review Required
> [!IMPORTANT]
> Please review the scenarios above. Do you have specific stations or lines you want to use as "Ground Truth" for verification?
