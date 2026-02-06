# Go ADK Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate LUTAGU runtime to a single Go ADK path, remove v1 `/api/agent/chat`, archive Node v2 as non-primary fallback, and harden ADK proxy reliability.

**Architecture:** Frontend and API routing will target `/api/agent/adk` as the single production path. Legacy v1 endpoint is removed. Node v2 remains in repository but is explicitly marked archived and cannot fallback to v1. ADK proxy gets stricter upstream URL handling and SSE parsing robustness to improve streaming reliability.

**Tech Stack:** Next.js App Router (TypeScript), Go ADK microservice SSE, AI SDK TextStream transport, Jest/Node script verification.

### Task 1: Remove v1 API entrypoint and references

**Files:**
- Delete: `src/app/api/agent/chat/route.ts`
- Modify: `src/lib/agent/config.ts`
- Modify: `src/middleware.ts`
- Modify: `src/hooks/useDifyChat.ts`

**Step 1: Write failing test/check**
- Add an integration guard in `tests/agent_e2e_cases.json` usage path expectation to not include v1 endpoint.

**Step 2: Run check to verify current state fails guard**
- Run: `grep -RIn "\/api\/agent\/chat" src`
- Expected: currently finds references.

**Step 3: Implement minimal removal**
- Remove v1 route file.
- Remove v1 endpoint from config/runtime selection.
- Remove middleware chat exemption for v1 route.
- Route legacy hook transport to ADK endpoint.

**Step 4: Verify check passes**
- Run: `grep -RIn "\/api\/agent\/chat" src`
- Expected: no production path references remain (except archived comments/docs if any).

### Task 2: Archive Node v2 (preserve code, disable v1 fallback)

**Files:**
- Modify: `src/app/api/agent/v2/route.ts`
- Modify: `src/app/api/agent/health/route.ts`

**Step 1: Write failing test/check**
- Guard that v2 fallback default is not `chat`.

**Step 2: Run check to verify current state fails**
- Run: `grep -n "AGENT_V2_FALLBACK || 'chat'" src/app/api/agent/v2/route.ts src/app/api/agent/health/route.ts`
- Expected: match exists before change.

**Step 3: Implement archive-safe behavior**
- Change v2 fallback default to `adk`.
- Remove fallback branch to `/api/agent/chat`.
- Keep v2 endpoint code in place for archive/backward compatibility.

**Step 4: Verify**
- Run same grep command.
- Expected: no `|| 'chat'` default remains.

### Task 3: Optimize Go ADK proxy reliability

**Files:**
- Modify: `src/app/api/agent/adk/route.ts`

**Step 1: Write failing test/check**
- Add/adjust focused behavior checks (or static guard) for:
  - ADK URL normalization to `/api/chat` when base URL provided.
  - SSE parser correctly handling multi-line `data:` blocks.

**Step 2: Run targeted test/check to fail first**
- Run: lightweight node/jest test or static assertions for parser helper behavior.

**Step 3: Implement minimal robust changes**
- Remove `CHAT_API_URL` compatibility fallback.
- Introduce `normalizeAdkEndpoint` helper to support base URL inputs.
- Improve SSE parsing to accumulate all `data:` lines and robust line endings.
- Keep current telemetry tags and fallback behavior intact.

**Step 4: Verify**
- Run targeted tests and lint/type checks for touched modules.

### Task 4: Verification and regression smoke

**Files:**
- Modify: none (verification only)

**Step 1: Run verification commands**
- `npm run -s test -- --runInBand src/lib/agent/decision/intentNormalizer.test.ts` (or nearest available quick tests)
- `node scripts/agent_e2e_test.js` (if local server available)
- `npm run -s build` (if feasible in current environment)

**Step 2: Record outcomes**
- Capture pass/fail and blockers in final summary.

**Step 3: Commit**
- Group commit message: `refactor: consolidate runtime to Go ADK and archive node v2 fallback`
