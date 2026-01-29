# PLAN: Commercial GEO & Intent Tracking (Phase 14)

## 🎯 Goal
Implement a "Contextual Commerce" engine that validates the business model. Instead of generic traffic (SEO), focus on **Capturing Commercial Intent** (e.g., "Airport" -> Ticket) and **Actionable Tracking** (Click-through Rates). Adopts the Kotozna AI model: "Recommend, don't execute."

## 🧠 Core Strategy
- **Intent-Driven Recommendations**: Use `TagDrivenDispatcher` to detect "High Commercial Value" moments (Airport transit, Luggage storage, Hotel search).
- **Affiliate Context Manager**: A centralized registry mapping contexts (Station/Route) to affiliate deep links (Klook/KKday/Agoda).
- **Non-Intrusive UI**: "Recommendation Cards" appear naturally in the chat stream or map overlay, not as annoying popups.
- **Granular Tracking**: rigorous event tracking (Impression -> Click -> Conversion Proxy) to prove ROI.

## 🛠️ Proposed Tasks

### 1. Affiliate Infrastructure
- [ ] Create `AffiliateContextManager.ts`:
    - Registry for Partner Links (e.g., `NARITA_EXPRESS` -> `https://klook.com/...`).
    - Context Matching Logic (`TargetStation` + `UserIntent` -> `Link`).
- [ ] Define `CommercialIntent` types in `TagDrivenDispatcher`.

### 2. Intent Detection Updates (L4 Skills)
- [ ] **StandardRoutingSkill**: Inject "Ticket Purchase" links for specific routes (e.g., Skyliner, N'EX, Shinkansen).
- [ ] **LuggageSkill**: Add "Book Storage" links (e.g., Ecbo Cloak) if lockers are full.
- [ ] **LocalGuideSkill**: Add "Reserve Hotel" links (Agoda/Booking) when asked about areas.
- [ ] **New Skill**: `CommerceDispatcher` (Optional) or enhance existing ones.

### 3. UI Implementation
- [ ] **CommerceCard Component**: A standardized UI block for affiliate links (Image + Title + "Book on [Partner]" Button).
- [ ] Integrate into `ChatInterface` (message stream).
- [ ] Integrate into `NodeProfile` (Action buttons).

### 4. Tracking & Analytics
- [ ] Update `SignalCollector.ts` to log `COMMERCE_IMPRESSION` and `COMMERCE_CLICK` events.
- [ ] Implement referral tagging (`?ref=lutagu`) logic generator.

## 🧪 Verification Plan
- [ ] **Intent Test**: "How do I get to Narita?" -> Should show Skyliner/N'EX link card.
- [ ] **Luggage Test**: "Where are lockers in Shinjuku?" -> Should show Ecbo Cloak link.
- [ ] **Tracking Test**: Verify `COMMERCE_CLICK` events are logged to console/analytics.
