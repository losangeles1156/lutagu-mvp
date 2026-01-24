# AI Chat Flow Test Cases

**Epic**: AI Chat
**Priority**: P0
**Status**: Draft

## 1. Context
Verify the core functionality of the AI Chat interface, including sending messages, receiving streaming responses, rendering Markdown content, and handling UI states (offline/error, minimized). The chat is a critical feature for user engagement and L4 knowledge retrieval.

## 2. Test Scenarios

### Scenario 1: Basic Chat Flow (Streaming)
- **Pre-condition**: User is on the Homepage.
- **Steps**:
  1. Open Chat Panel (if minimized).
  2. Type "Hello Tokyo" in the input field.
  3. Click Send button.
  4. Wait for response to start streaming.
- **Expected Result**:
  - Input field clears upon sending.
  - User message appears immediately.
  - "Thinking..." indicator appears (if `[THINKING]` block is received).
  - Assistant message appears and updates progressively.
  - Final response renders Markdown correctly (e.g., bold text).
  - "Suggested Questions" are internal state, verify if they appear in UI (optional).

### Scenario 2: Error Handling (Offline/API Failure)
- **Pre-condition**: Chat Panel is open.
- **Steps**:
  1. User attempts to send a message.
  2. API returns 500 or network failure.
- **Expected Result**:
  - UI shows error feedback or "Offline" message.
  - Toast notification might appear.
  - Input field remains accessible for retry (or disabled if offline state persists).

### Scenario 3: UI State (Minimize/Expand)
- **Pre-condition**: Chat Panel is open.
- **Steps**:
  1. Click "Minimize" or "Close" button in header.
  2. Verify Panel collapses to minimized state/button.
  3. Click "Open Chat" or distinct button.
  4. Verify Panel restores to previous state/messages.
- **Expected Result**:
  - Panel transitions smoothly (visual check).
  - Messages are preserved across minimize/expand.
  - Layout adjusts (width/height coverage).

## 3. Data Requirements
- **Mock Data**:
  - Streaming response body for `/api/agent/chat-phased`.
  - Format: Text stream chunks.
  - Content: `[THINKING]Thinking...[/THINKING] Message **Bold**`
- **Environment**:
  - Playwright's `route` API to intercept requests.

## 4. Implementation Notes
- **Target Component**: `src/components/chat/ChatPanel.tsx`
- **Spec File**: `e2e/chat_flow.spec.ts`
- **Selectors**:
  - Input: `input[placeholder*="Ask"]` or `input[type="text"]`
  - Send Button: `button[type="submit"]`
  - Messages: `[data-testid="message-bubble"]` (might need to add test IDs or use class selectors)
  - Thinking Bubble: `text=Thinking`
