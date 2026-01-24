# L2 Train Status Test Cases

**Epic**: L2 Train Status
**Priority**: P0
**Status**: Draft

## 1. Context
驗證 L2 列車即時狀態功能的正確性。此功能是 MVP 的核心，涉及多個數據源（ODPT API, DB Snapshot, Rust Service, Yahoo）和複雜的狀態判定邏輯。若此功能失效，用戶將無法獲取列車延誤資訊。

## 2. Test Scenarios

### Scenario 1: API Response Structure (Smoke Test)
- **Pre-condition**: None
- **Steps**:
  1. Call GET `/api/l2/status?station_id=odpt:Station:TokyoMetro.Ginza.Ueno`
- **Expected Result**:
  - Status code should be 200.
  - JSON body should contain `line_status` array.
  - `line_status` items should have `status` ("normal", "delay", "suspended"), `color`, `operator`.
  - `congestion` level should be present (1-5).

### Scenario 2: Frontend Display - Normal Operation
- **Pre-condition**: Mock API returns `status: "normal"` for all lines.
- **Steps**:
  1. Go to Station Page with mocked data.
  2. Check "Train Operation Status" section.
- **Expected Result**:
  - Should confirm "All Good" or "全線正常" badge is visible.
  - No alert banners (Red/Orange/Yellow) should be displayed.
  - Line list should show green/blue signals or normal styling.

### Scenario 3: Frontend Display - Delay (Minor & Major)
- **Pre-condition**: Mock API returns one line with `status: "delay"` and `detail: "delay_minor"`, another with `detail: "delay_major"`.
- **Steps**:
  1. Go to Station Page with mocked data.
  2. Check status indicators.
- **Expected Result**:
  - Summary badge should show issue count (e.g., "2 Issues").
  - Delayed lines should have distinctive styling (Yellow for minor, Red for major).
  - Delay badges ("遅延", "大幅遅延") should be visible with minute counts if available.

### Scenario 4: Frontend Display - Suspension (Operation Halted)
- **Pre-condition**: Mock API returns a line with `status: "suspended"` (`detail: "halt"` or `"canceled"`).
- **Steps**:
  1. Go to Station Page.
- **Expected Result**:
  - Line should be prominently marked as Suspended (Red/Gray theme).
  - Badge text should say "運転見合わせ" or "Cancelled".

### Scenario 5: Rust Service Fallback (Integration)
- **Pre-condition**: Rust Service (checked via `X-L2-Source` header) might be active.
- **Steps**:
  1. Call API.
  2. Verify response headers.
- **Expected Result**:
  - If `X-L2-Source: rust` is present, `line_status` must not be empty.
  - If Rust fails (simulate via mock or check logs), API should fallback to Node.js implementation without 500 error.

## 3. Data Requirements
- **Mock Data**: Need specific JSON payloads properly formatted to simulate ID variants and status codes.
- **Environment**: Access to `localhost:3000`.

## 4. Implementation Notes
- **Target Files**:
  - `src/components/node/L2_Live.tsx`
  - `src/app/api/l2/status/route.ts`
- **Spec File**: `e2e/l2_status.spec.ts`
- **Mocking**: Use `page.route` to intercept `/api/l2/status*` requests.
