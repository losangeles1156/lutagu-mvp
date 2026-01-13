# LUTAGU Tokyo MVP - Claude Rules (CLAUDE.md)

This file serves as the primary rule set for AI development across different tools (Trae, Cursor, Claude Code, etc.).

**Last Updated**: 2026-01-13
**Version**: v4.1 (Synchronized with project_rules.md)

---

## 1. Project Overview

LUTAGU is a PWA-based **Urban Empathy Navigation Service** for Tokyo.

**Core Value**: Transform cold open data (ODPT, GTFS, OSM) into empathetic, actionable guidance (Nudges) that resolve anxiety during travel.

**Target Users**: Foreign travelers unfamiliar with Japanese transit logic (not just language barriers, but knowledge gaps about concepts like "through service" or "coupled trains").

**Problem We Solve**: "Having information ≠ Knowing what to do"
- Existing tools show "15 minutes" but don't tell you it's a 500m underground tunnel.
- LUTAGU acts as a **proactive local guide**, not a passive encyclopedia.

---

## 2. Prime Directives

### 2.1 Guest-First (訪客優先)
- 90% of features must work **without login/registration**
- Available without auth: Map, search, AI chat, commercial referrals
- Registration only for "Trip Guard" push notifications

### 2.2 Commercial Reality (商業現實)
- L4 action suggestions must prioritize **executable alternatives**
- If bus is crowded → directly provide Uber/GO or LUUP deep links
- Commercial referrals are core to MVP monetization

### 2.3 Inheritance Efficiency (繼承效率)
- Strict limit: **10-15 Hub (母節點) nodes only**
- All Spoke (子節點) nodes inherit personality from nearest Hub algorithmically
- Ensures MVP resource focus

### 2.4 Dynamic Expansion (動態擴充原則)
- Locations in docs (Ueno, Asakusa) are MVP validation examples only
- Architecture must support **dynamic addition of any node within geofence**

### 2.5 One Recommendation (一個建議原則)
- AI output must converge to **1 Primary Card** (eliminate decision paralysis)
- Maximum 2 additional Secondary Cards (alternatives or experiential options)

### 2.6 Internationalization (多語言策略)
- **Traditional Chinese (zh-TW)** is default system language
- Must support **English (en)** and **Japanese (ja)** UI switching
- Other languages supported via AI natural language input
- Database: All display text fields use JSONB multilingual structure

```json
{
  "name": {
    "zh-TW": "上野站",
    "ja": "上野駅",
    "en": "Ueno Station"
  }
}
```

---

## 3. Technical Stack

### 3.1 Core Intelligence
- **Multi-Model Architecture** (via Vercel AI SDK):
  - **Gatekeeper**: Gemini 2.5 Flash Lite (intent classification, routing)
  - **Brain**: MiniMax-M2.1 (complex reasoning, strategic decisions)
  - **Synthesizer**: Gemini 3 Flash Preview (natural language generation, voice)
  - **Fallback**: Gemini 2.5 Flash (backup when primary models fail)
- **Embedding Model**: Google Gemini text-embedding-004
  - **Dimensions**: 768 (zero-padded to 1536 for compatibility)
  - **Fallback**: MiniMax Embo-01 (if Gemini rate limited)
  - **Rate Limits**: 1500 RPM (Gemini) vs 10 RPM (MiniMax free tier)
- **Model Provider**: Zeabur AI Hub (unified gateway)
- **Orchestration**: Custom L4 Decision Engine + Agent tools
- **Development Core**: Claude Code / Trae SOLO Mode

### 3.2 Automation & Data Layer
- **ETL Pipeline**: n8n (self-hosted on Zeabur) + TypeScript scripts
- **Database**: Supabase (PostgreSQL + PostGIS)
- **Cache**: Supabase table-based caching (MVP), future: Redis/KV

### 3.3 Frontend Interaction
- **Platform**: Next.js 14 (App Router) PWA
- **Styling**: Tailwind CSS + shadcn/ui components
- **Map**: React Leaflet + OpenStreetMap
- **State Management**: Zustand
- **User State**:
  - Guest: No GPS requirement, manual node selection
  - Member: GPS tracking + LINE Login, enables Trip Guard

### 3.4 Key Dependencies
```json
{
  "@ai-sdk/google": "^3.0.6",
  "@ai-sdk/openai": "^3.0.7",
  "ai": "^6.0.23",
  "@supabase/supabase-js": "^2.39.0",
  "next": "14.2.35",
  "next-intl": "^3.5.0",
  "react-leaflet": "^4.2.1",
  "zustand": "^4.5.0",
  "zod": "^4.3.5"
}
```

---

## 4. Coding Standards

### 4.1 Naming Conventions
- **Files**: kebab-case (`city-adapter.ts`, `decision-engine.ts`)
- **Variables/Functions**: camelCase (`resolveNodePersona`, `calculateWaitValue`)
- **Constants**: UPPER_SNAKE_CASE (`ODPT_API_KEY`, `DEFAULT_CACHE_TTL`)
- **Types/Interfaces**: PascalCase (`NodePersona`, `CityAdapter`, `L4ActionCard`)

### 4.2 TypeScript Guidelines
- Always define explicit types/interfaces (avoid `any`)
- Use strict mode: `"strict": true` in tsconfig.json
- Prefer `interface` for object shapes, `type` for unions/utilities
- Export types from dedicated `types.ts` files

### 4.3 Multilingual Handling
```typescript
// Example: Locale utility function
type Locale = 'zh-TW' | 'ja' | 'en';
type LocalizedText = Record<Locale, string>;

function getLocalizedName(name: LocalizedText, locale: Locale): string {
  return name[locale] || name['zh-TW'] || Object.values(name)[0];
}
```

### 4.4 Security & Validation
- **NEVER** expose API keys in client code
- Use Zod for runtime schema validation (server actions, API routes)
- Sanitize user inputs to prevent XSS/SQL injection
- Implement rate limiting for public endpoints

### 4.5 File Organization
```
src/
├── app/              # Next.js App Router pages
├── components/       # React components (UI)
├── lib/
│   ├── adapters/     # City adapters (tokyo.ts)
│   ├── ai/           # AI/LLM integration
│   ├── api/          # API client functions
│   ├── cache/        # Cache service
│   ├── l4/           # L4 decision engine
│   ├── odpt/         # ODPT API client
│   ├── security/     # Auth, RBAC, rate limiting
│   ├── utils/        # Shared utilities
│   └── types/        # Shared TypeScript types
└── scripts/          # ETL scripts (l1_pipeline/, l3_fill_*)
```

---

## 5. Data Layers (L1-L4)

### L1: Location DNA (地點基因層) - Backbone
- **Definition**: Static properties & infrastructure capabilities
- **Data Sources**: ODPT, OSM, MLIT, GBFS
- **Hub-Spoke Architecture**:
  - Hub (母節點): 10-15 nodes, hand-crafted Persona prompts
  - Spoke (子節點): Hundreds of nodes, inherit from nearest Hub

### L2: Live Status (即時狀態層) - Perception
- **Definition**: Dynamic variables affecting decisions
- **Data Sources**: ODPT API (TrainInformation, BusLocation), OpenWeather
- **Cache Strategy**: TTL 20 minutes
- **Anomaly Detection**: delay > 15min OR status != "Normal"

### L3: Micro-Facilities (環境機能層) - Details
- **Definition**: Services resolving micro-needs during travel
- **Dual-Tag Structure**:
  - **Supply Tags**: `has_locker`, `has_bench`, `has_wifi`, `has_elevator`
  - **Suitability Tags**: `good_for_waiting`, `work_friendly`, `quiet_zone`, `luggage_friendly`

### L4: Mobility Strategy (行動策略層) - Decision
- **Definition**: AI-synthesized final recommendations from L1-L3
- **Computation Core**: Custom Decision Engine + LLM
- **Output Format**: Action Cards (max 3)

---

## 6. L4 Action Cards Specification

AI output must converge to **3 cards maximum**:

| Priority | Type | Example | Target |
|----------|------|---------|--------|
| 1 | Best Public Transit | "Take Ginza Line, departs in 3 min" | ODPT data |
| 2 | Comfort/Speed Alt | "Uber/GO, ~¥1200, saves 10 min" | Taxi referral |
| 3 | Micro-mobility/Exp | "LUUP scooter, scenic route, ~15 min" | LUUP referral |

### Deep Link Integration (Future)
- **Taxi**: `https://go.mo-t.com/...` (GO Taxi)
- **Shared Mobility**: `https://luup.sc/...` (LUUP)
- **Locker Service**: `https://cloak.ecbo.io/...` (Ecbo Cloak)

---

## 7. Database Design Principles

### 7.1 Hybrid Strategy
- **Core Entities (high-frequency queries)**: Normalized tables + indexes
- **Extension Attributes (low-frequency/dynamic)**: JSONB columns
- **Real-time Data (high-frequency updates)**: Cache (Supabase KV for MVP)

### 7.2 Core Tables
- `cities`: City/region + City Adapter config
- `nodes`: Node master table (Hub/Spoke inheritance)
- `facilities`: L3 facility table
- `facility_suitability`: Suitability tags (context index)
- `shared_mobility_stations`: GBFS shared mobility
- `users`: User table (with LINE integration)
- `trip_subscriptions`: Trip Guard subscriptions
- `nudge_logs`: Intent logs (core business data)

### 7.3 Multilingual Field Example
```sql
CREATE TABLE nodes (
  id uuid PRIMARY KEY,
  name jsonb NOT NULL, -- {"zh-TW": "上野站", "ja": "上野駅", "en": "Ueno Station"}
  description jsonb,
  -- ...
);
```

---

## 8. Development Workflow

### 8.1 Environment Setup
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### 8.2 Required Environment Variables
```env
# ODPT API (Public Transport Open Data)
ODPT_API_KEY_METRO=your_tokyo_metro_api_key
ODPT_API_KEY_JR_EAST=your_jr_east_challenge_key
ODPT_API_KEY_PUBLIC=optional_public_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# AI Models (Vercel AI SDK via Zeabur AI Hub)
MINIMAX_API_KEY=your_minimax_api_key
GEMINI_API_KEY=your_gemini_api_key
# Legacy fallback:
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Embedding Configuration
EMBEDDING_PROVIDER=gemini  # 'gemini' (default, 1500 RPM) | 'minimax' (10 RPM)

# AI Backend (n8n Orchestration)
N8N_WEBHOOK_URL=https://n8n.zeabur.app/webhook/bambigo-chat
N8N_WEBHOOK_SECRET=optional_secret_token

# LINE (Trip Guard Push Notifications)
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret

# Security & Encryption
PII_ENCRYPTION_KEY_BASE64=replace_with_32_byte_base64
ACTIVITY_HASH_SALT=replace_with_random_secret

# Rate Limiting
RATE_LIMIT_ENABLED=true

# Mapbox (Optional, for enhanced mapping)
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

### 8.3 Common Scripts
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build

# Run L1 pipeline
npm run crawl:l1

# Fill L3 facilities
npm run crawl:l3
npm run crawl:l3:toilets
npm run crawl:l3:access
```

---

## 9. MVP Validation Sandbox

### 9.1 Geofence
- **Core Districts**: Taito (上野/淺草), Chiyoda (東京駅/皇居), Chuo (銀座)
- **Bounding Box**: `[139.73, 35.65]` to `[139.82, 35.74]`
- System designed to switch regions by changing bounding box parameters

### 9.2 Data Acquisition Strategy
**"ODPT First, OSM Second"**:
1. **Phase 1 (Backbone)**: ODPT API → JR East, Tokyo Metro, Toei subway/bus stations
2. **Phase 2 (Muscle)**: Overpass API (OSM) → toilets, attractions, lockers
3. **Phase 3 (Nerves)**: GBFS API → Docomo Cycle / LUUP micro-mobility

---

## 10. Development Milestones

### Phase 1: Backbone ✅ Complete
- [x] Setup Zeabur environment variables (ODPT_API_KEY)
- [x] Establish Hub/Spoke database structure (with parent_hub_id)
- [x] n8n ODPT auto-fetch workflow
- [x] City Adapter interface implementation
- [x] Map layer rendering (Layering)

### Phase 2: Perception & Details ✅ Complete
- [x] Define 10 core Hubs with Persona prompts
- [x] Implement L3 supply/suitability dual-column structure
- [x] OSM data crawl, auto-populate Supply Tags
- [x] L2 real-time status display

### Phase 3: Decision & Nerves (In Progress)
- [x] GBFS shared mobility data integration
- [x] AI knowledge base connection
- [x] L4 AI chat recommendation feature
- [x] PWA Manifest & Action Cards UI
- [ ] Deep Links integration (pending commercial partnerships)

---

## 11. AI Development Guidelines

### 11.1 Multi-Model Architecture Roles

**LUTAGU uses a specialized multi-model system**, not a single LLM:

| Role | Model | Purpose | Use Cases |
|------|-------|---------|-----------|
| **Gatekeeper** | Gemini 2.5 Flash Lite | Fast intent classification & routing | Parse user queries, determine intent type, route to appropriate handler |
| **Brain** | MiniMax-M2.1 | Deep reasoning & strategic decisions | Complex route planning, multi-constraint optimization, anomaly response |
| **Synthesizer** | Gemini 3 Flash Preview | Natural language generation | User-facing responses, empathetic messaging, L4 card descriptions |
| **Fallback** | Gemini 2.5 Flash | Backup when primary fails | Ensures service continuity |

**Model Selection Guidelines**:
- Use **Gatekeeper** for: Intent detection, quick classifications, simple Q&A
- Use **Brain** for: Multi-step reasoning, constraint solving, uncertainty handling
- Use **Synthesizer** for: Final output generation, emotional tone, multilingual responses
- **Fallback** activates automatically on primary model failures

### 11.2 When to Use AI
- Natural language query understanding (Gatekeeper)
- Context-aware route recommendations (Brain)
- Synthesizing L1-L4 data into actionable cards (Synthesizer)
- Personalized suggestions based on user context (Brain → Synthesizer)
- Emotional tone adaptation (Synthesizer)

### 11.3 When NOT to Use AI
- Hard computation (route distance, ETA) → Use algorithms
- Real-time data fetching → Use ODPT/weather APIs
- Deterministic logic → Use rules engine
- Simple lookups → Use database queries
- Cacheable responses → Use cache layer

### 11.4 Prompt Engineering Principles
- Provide structured context (JSON format preferred)
- Include relevant L1-L4 data in prompt
- Specify output format explicitly (JSON schema, markdown, etc.)
- Set constraints (e.g., "max 3 options", "prioritize public transit")
- For Synthesizer: Include tone guidance ("empathetic", "urgent", "reassuring")
- For Brain: Break complex problems into sub-tasks
- For Gatekeeper: Use few-shot examples for edge cases

---

## 12. Business Model

LUTAGU's value: **"Broker of Anxiety Relief"**

1. **Mobility Referrals**
   - Scenario: Train delay (anxiety) → LUTAGU suggests → User taps ride-hailing
   - Value: CPA revenue share

2. **Luggage-Free Tourism Referrals**
   - Scenario: Can't find locker (anxiety) → LUTAGU suggests → User books Ecbo Cloak
   - Value: Service fee revenue share

---

## 13. Testing Guidelines

### 13.1 Unit Tests
- Use Node.js built-in test runner (`node:test`)
- Test files: `*.test.ts` (avoid `*.ui.test.ts` for backend tests)
- Run: `npm test`

### 13.2 UI Tests
- Test files: `*.ui.test.ts`
- Run: `npm run test:ui`

### 13.3 Test Coverage Priorities
1. Core algorithms (L4 decision engine)
2. API route handlers
3. Data transformation functions
4. Critical utility functions

---

## 14. Security Considerations

- **Rate Limiting**: Implemented for public endpoints
- **Input Validation**: Zod schemas for all user inputs
- **CORS**: Restricted to allowed origins only
- **SQL Injection**: Parameterized queries via Supabase client
- **XSS Prevention**: Sanitize user-generated content
- **API Keys**: Server-side only, never exposed to client

---

## 15. References

- **Technical Architecture Spec**: v4.0
- **Database Design Spec**: v4.1
- **Japan Public Transit Open Data List**: CSV in `/knowledge`
- **ODPT API Docs**: https://developer.odpt.org/
- **GBFS Spec**: https://gbfs.org/
- **Detailed Rules**: [project_rules.md](rules/project_rules.md)

---

*This file is the core rule set for AI-assisted development. Keep it synchronized with `rules/project_rules.md`.*
