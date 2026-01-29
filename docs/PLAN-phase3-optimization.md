# Phase 3: User Interface Integration - Implementation Plan

## Goal
Integrate the optimized backend intelligence (L4 Knowledge, L2 Actions) into the frontend Chat UI. Ensure Adaptive Cards render correctly with localized content and rich badges. Connect the User Feedback loop to the backend.

## User Review Required
> [!IMPORTANT]
> This phase modifies `src/types/chat.ts` (or `ActionCard` interfaces) to allow Multi-language strings. This might affect other components relying on strictly string labels.

## Proposed Changes

### Component: Chat UI (Action Cards)
#### [MODIFY] [ActionCard.tsx](file:///Users/zhuangzixian/Documents/LUTAGU_MVP/src/components/chat/ActionCard.tsx)
-   **Update Interface**: Allow `label`, `title`, `content` to be `string | Record<string, string>`.
-   **Enhance Logic**:
    -   Fallback to `action.metadata.price` if `action.price` is missing.
    -   Fallback to `action.metadata.eta_min` / `action.metadata.eta_max` stringified as `timeSaved` if `timeSaved` is missing.
    -   Use `resolveText` helper properly for all text fields.

### Component: Agentic Response (L4 Knowledge)
#### [MODIFY] [AgenticResponseCard.tsx](file:///Users/zhuangzixian/Documents/LUTAGU_MVP/src/components/chat/AgenticResponseCard.tsx)
-   **Refinement**: Ensure `expert_tip` mapping passes the localization object correctly to `ActionCard`.
-   **Optimization**: Tune the styling for `L4 Knowledge` cards to be distinct from `Route Options`.

### Component: Feedback Loop
#### [NEW] [feedback.ts (API Handler)](file:///Users/zhuangzixian/Documents/LUTAGU_MVP/src/app/api/feedback/route.ts)
-   Create API route to receive thumbs up/down.
-   Connect to `FeedbackStore.logFeedback`.

#### [MODIFY] [ChatPanel.tsx](file:///Users/zhuangzixian/Documents/LUTAGU_MVP/src/components/chat/ChatPanel.tsx)
-   Implement `handleFeedback` function to call the new API.

## Verification Plan

### Manual Verification
1.  **L2 Disruption Test**: Simulate "Typhoon" scenario (via Mock or Context). Verify `ActionCard` shows "Taxi" with ETA badge.
2.  **L4 Knowledge Test**: Ask a complex question (e.g. "Tips for Ueno"). Verify `HackCard` / `TrapCard` renders with correct title/content.
3.  **Feedback Test**: Click Thumbs Up. Verify `station_weights` in DB updates (using `verify_weight_adjuster.ts` script).

### Automated Tests
-   Create `scripts/test_ui_render.ts` (or React test) if possible, but manual UI check is primary for this phase.
