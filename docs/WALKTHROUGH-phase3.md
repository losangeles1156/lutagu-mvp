# Phase 3 Walkthrough: UI Integration & Feedback Loop

> [!IMPORTANT]
> The Feedback Loop is now engineered to be **Stateless**, ensuring robustness even in Serverless environments (Vercel).

## 1. UI Robustness Updates
We upgraded the Frontend Components to safely handle the new "Localized" data structures from the Backend.

### `ActionCard.tsx`
- **Smart Badges**: Now automatically extracts `eta` and `price` from `metadata` if the explicit fields are missing. This matches `HybridEngine` output perfectly.
- **Localization**: Titles and Labels now support `{ en: "...", ja: "..." }` objects, fixing the `[object Object]` rendering crash.
- **HackCard / TrapCard Integration**: Propagated localization logic to these sub-components.

## 2. Stateless Feedback Loop
We implemented a self-learning loop where User Feedback (Thumbs Up/Down) directly influences the "Relevance Weights" of stations/nodes.

### The Problem (Found & Fixed)
In a Serverless environment, `FeedbackStore` logs are lost between requests.
If a user gives feedback 1 minute later, the server doesn't know "Which station is this about?".

### The Solution (Stateless Bridge)
1. **HybridEngine** injects `contextNodeId` (e.g., `odpt:Station:Ueno`) into every Response package sent to the client.
2. **ChatPanel** reads this ID and sends it back with the feedback signal.
3. **Feedback API** receives the ID and immediately triggers `WeightAdjuster` logic, bypassing the need for server-side log state.

## 3. Files Modified
- `src/components/chat/ActionCard.tsx` (Logic Upgrade)
- `src/components/chat/TrapCard.tsx` (Bug Fix)
- `src/components/chat/HackCard.tsx` (Bug Fix)
- `src/components/chat/ChatPanel.tsx` (API Wiring)
- `src/lib/l4/HybridEngine.ts` (Data Injection)
- `src/lib/l4/monitoring/FeedbackStore.ts` (Logic Upgrade)
- `src/app/api/feedback/route.ts` [NEW] (API Route)

## 4. Verification
- **L2 Disruption**: Ask for Taxi. The option now shows `~1500 JPY` and `12 min` badges derived from metadata.
- **L4 Knowledge**: Ask for "Ueno Tips". The cards display properly in the user's language without crashing.
- **Learning**: Clicking Thumbs Up on a Ueno response calls `WeightAdjuster` to boost Ueno's `stay_weight`.
