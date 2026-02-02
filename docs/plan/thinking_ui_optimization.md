# AI Chat "Thinking" UI Optimization Plan

## Problem
The "Thinking" UI exists in `ChatPanel.tsx` (`ThinkingBubble`) but is rarely triggered or users perceive "no response" during long latencies because the backend doesn't stream "thinking" status effectively, or the frontend doesn't parse it.

## Analysis
- **Frontend**: `ChatPanel.tsx` renders `ThinkingBubble` if `thinkingStep` is present.
- **Hook**: `useAgentChat.ts` handles the stream. It needs to parse special tokens or events to update `thinkingStep`.
- **Backend**: `services/chat-api` needs to emit "thinking" status during long-running tool calls or reasoning.

## Completed Changes
### 1. Frontend Logic Fix (`useAgentChat.ts`)
- [x] Fixed regex bug that only captured the *first* thinking block. Now captures the *last* block.
- [x] Implemented logic to set `thinkingStep` strictly based on the *latest* thinking block status (Active if open/at end, Null if closed/followed by text).

### 2. UI De-duplication (`ParsedMessageContent.tsx`, `MessageBubble.tsx`, `ChatPanel.tsx`)
- [x] Passed `isStreaming` prop down from `ChatPanel` to `ParsedMessageContent`.
- [x] `ParsedMessageContent` now hides the *last* thinking block if `isStreaming` is true, allowing `ChatPanel`'s floating bubble to show it as "Active" without duplication.
- [x] Maintained history: Once streaming stops, `ParsedMessageContent` shows all blocks as history, and floating bubble disappears.

### 3. Backend Verification
- [x] Confirmed `agentChat.ts` and ADK proxy emit `[THINKING]` tags correctly.

## Verification Plan

### Automated Test (Playwright)
- Update `e2e/ai_chat_workflow.spec.ts`.
- In "Case 2: Dynamic Data":
    - Mock a response that sends a "thinking" chunk first, then delays, then sends text.
    - Verify `ThinkingBubble` or "Thinking..." text appears during the delay.

### Manual Verification
- [x] Trigger a complex query ("Plan a route with weather check").
- [x] Observe if "Thinking..." bubble appears before the final answer.
- [x] Confirmed functionality via `chat_verification_final` browser automation.

