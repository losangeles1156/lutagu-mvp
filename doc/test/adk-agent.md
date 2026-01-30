# ADK Agent Migration Test Cases

**Epic**: ADK Agent (Go Cloud Run Service)
**Priority**: P0
**Status**: Draft

## 1. Context

The ADK Agent is a Go-based microservice deployed on Cloud Run that provides AI-powered chat capabilities via SSE streaming. It uses a hierarchical agent architecture:
- **Root Agent**: Intent Classification (Gemini 3 Flash)
- **Specialized Agents**: Route, Status (DeepSeek V3)
- **ODPT Integration**: Real-time train data for Status Agent

This test plan ensures all components are production-ready before launch.

## 2. Test Scenarios

### API Contract Tests (Cloud Run Endpoints)

#### Scenario A1: Health Check
- **Pre-condition**: Service is deployed
- **Steps**:
  1. Send `GET /health`
- **Expected Result**:
  - HTTP 200
  - Body: `ok`

#### Scenario A2: Valid Chat Request (Route Intent)
- **Pre-condition**: Service is deployed
- **Steps**:
  1. Send `POST /api/chat` with body:
     ```json
     {"locale": "en", "messages": [{"role": "user", "content": "How do I get to Shinjuku?"}]}
     ```
- **Expected Result**:
  - HTTP 200, Content-Type: `text/event-stream`
  - Receive `event: meta` (Intent: ROUTE)
  - Receive multiple `event: telem` with `{"content": "..."}`
  - Final `event: done`

#### Scenario A3: Valid Chat Request (Status Intent)
- **Pre-condition**: Service is deployed
- **Steps**:
  1. Send `POST /api/chat` with body:
     ```json
     {"locale": "ja", "messages": [{"role": "user", "content": "電車遅れてる?"}]}
     ```
- **Expected Result**:
  - HTTP 200, Content-Type: `text/event-stream`
  - Receive `event: meta` (Intent: STATUS)
  - Response includes ODPT data context (or "operating normally")

#### Scenario A4: Invalid Request (Empty Messages)
- **Pre-condition**: Service is deployed
- **Steps**:
  1. Send `POST /api/chat` with empty messages array:
     ```json
     {"locale": "en", "messages": []}
     ```
- **Expected Result**:
  - Should handle gracefully (Error event OR default response, NOT crash)

#### Scenario A5: Invalid Request (Wrong HTTP Method)
- **Pre-condition**: Service is deployed
- **Steps**:
  1. Send `GET /api/chat`
- **Expected Result**:
  - HTTP 405 Method Not Allowed

---

### Frontend Proxy Tests (Next.js)

#### Scenario P1: Proxy Forwards Request Correctly
- **Pre-condition**: Local dev server running
- **Steps**:
  1. Send `POST /api/agent/adk` via fetch
- **Expected Result**:
  - Response streams correctly from Cloud Run
  - Content-Type is `text/event-stream`

---

### E2E Tests (Playwright - Browser)

#### Scenario E1: AI Chat Panel Basic Flow
- **Pre-condition**: User at homepage
- **Steps**:
  1. Click AI Chat icon (bottom right)
  2. Wait for Chat Panel to open
  3. Type "What is the fastest way to Shibuya?"
  4. Press Enter or click Send
  5. Wait for response to stream
- **Expected Result**:
  - Chat bubble appears with streaming text
  - Response contains transit-related content (e.g., "Yamanote", "Line", "minutes")

#### Scenario E2: Multi-turn Conversation
- **Pre-condition**: E1 passed
- **Steps**:
  1. After E1, type "And what about delays?"
  2. Press Enter
  3. Wait for response
- **Expected Result**:
  - New response appears
  - Response discusses status/delays (may say "operating normally")

#### Scenario E3: Locale Handling
- **Pre-condition**: User at `/ja` page
- **Steps**:
  1. Open Chat Panel
  2. Type "渋谷への行き方"
  3. Press Enter
- **Expected Result**:
  - Response is in Japanese (or agent acknowledges Japanese input)

---

## 3. Data Requirements
- **Mock Data**: No (tests hit live Cloud Run service)
- **Environment variables**:
  - `ADK_AGENT_URL` (for proxy tests)
  - Playwright config: `BASE_URL=http://localhost:3000`

## 4. Implementation Notes
- **API Tests**: Use `curl` or Go test file in `services/adk-agent/`
- **E2E Tests**: Playwright spec `e2e/adk-agent-chat.spec.ts`
- **Targeted files**:
  - `src/app/api/agent/adk/route.ts`
  - `src/hooks/useAgentChat.ts`
  - `src/components/ChatPanel.tsx`
