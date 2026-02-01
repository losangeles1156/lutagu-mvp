# AI Chat "Thinking" UI Optimization Plan

## Problem
The "Thinking" UI exists in `ChatPanel.tsx` (`ThinkingBubble`) but is rarely triggered or users perceive "no response" during long latencies because the backend doesn't stream "thinking" status effectively, or the frontend doesn't parse it.

## Analysis
- **Frontend**: `ChatPanel.tsx` renders `ThinkingBubble` if `thinkingStep` is present.
- **Hook**: `useAgentChat.ts` handles the stream. It needs to parse special tokens or events to update `thinkingStep`.
- **Backend**: `services/chat-api` needs to emit "thinking" status during long-running tool calls or reasoning.

## Proposed Changes

### 1. Frontend: `useAgentChat.ts` (Optimization)
- Enhance `onFinish` or stream parser to detect `[THINKING]...[/THINKING]` blocks or custom headers.
- If the backend uses Vercel AI SDK `StreamData`, ensure we listen for data events to set `thinkingStep`.

### 2. Backend: `services/chat-api`
- In the LLM response loop, if a tool call takes time or if using a reasoning model, emit a "thinking" token/event immediately.
- Ensure the stream starts *immediately* even if the full text isn't ready.

## Verification Plan

### Automated Test (Playwright)
- Update `e2e/ai_chat_workflow.spec.ts`.
- In "Case 2: Dynamic Data":
    - Mock a response that sends a "thinking" chunk first, then delays, then sends text.
    - Verify `ThinkingBubble` or "Thinking..." text appears during the delay.

### Manual Verification
- Trigger a complex query ("Plan a route with weather check").
- Observe if "Thinking..." bubble appears before the final answer.
