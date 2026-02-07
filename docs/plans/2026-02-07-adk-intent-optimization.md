# ADK Intent Ladder Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement an adaptive intent ladder and FAQ fast-path to reduce LLM usage and latency while improving multi-turn accuracy.

**Architecture:** Add a lightweight routing ladder (FAQ → rules → lite intent → deep intent) and move templates behind complexity gates. Introduce JourneyContext slots to compress memory and drive better context carry-over. Add metrics and tests to validate latency/token improvements.

**Tech Stack:** Go, ADK agent services, Redis/Supabase memory, existing orchestrator/agent layers.

### Task 1: FAQ Fast Path + Template Gating

**Files:**
- Create: `services/adk-agent/internal/orchestrator/faq_bank.go`
- Modify: `services/adk-agent/internal/layer/template_engine.go`
- Modify: `services/adk-agent/internal/orchestrator/layered_engine.go`
- Test: `services/adk-agent/internal/orchestrator/intent_router_test.go`
- Test: `services/adk-agent/internal/layer/template_engine_test.go`

**Step 1: Write the failing test**

```go
func TestFAQFastPath_Hit(t *testing.T) {
	q := "成田機場到新宿怎麼去"
	if !isFAQHit(q, "zh-TW") {
		t.Fatalf("expected FAQ hit for airport transfer")
	}
}

func TestTemplateGating_SkipsOnComplexity(t *testing.T) {
	ctx := TemplateContext{Query: "我帶大行李要去淺草", Locale: "zh-TW"}
	if allowTemplate(ctx, "compound") {
		t.Fatalf("expected template gate to block compound intent")
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/orchestrator -run TestFAQFastPath_Hit -v`
Expected: FAIL with "undefined: isFAQHit"

**Step 3: Write minimal implementation**

- Add `faq_bank.go` with a small in-memory list of Top100 FAQ patterns and `isFAQHit(query, locale)`.
- Add `allowTemplate(ctx, complexity)` in template engine (in `layer` package) to gate complex/ambiguous queries.
- Add test in `template_engine_test.go` to exercise gating in-package.
- In `layered_engine.go`, check FAQ hit before template matching, and only allow templates when `allowTemplate` is true.

**Step 4: Run test to verify it passes**

Run: `go test ./internal/orchestrator -run TestFAQFastPath_Hit -v`
Expected: PASS

**Step 5: Commit**

```bash
git add services/adk-agent/internal/orchestrator/faq_bank.go services/adk-agent/internal/layer/template_engine.go services/adk-agent/internal/orchestrator/layered_engine.go services/adk-agent/internal/orchestrator/intent_router_test.go services/adk-agent/internal/layer/template_engine_test.go
git commit -m "feat: add FAQ fast path and template gating"
```

### Task 2: JourneyContext Slots in Memory

**Files:**
- Modify: `services/adk-agent/internal/infrastructure/memory/store.go`
- Modify: `services/adk-agent/cmd/server/main.go`
- Test: `services/adk-agent/internal/infrastructure/memory/store_test.go`

**Step 1: Write the failing test**

```go
func TestJourneyContext_ExtractAndPersist(t *testing.T) {
	store := NewStore(nil, nil, Options{})
	input := SaveTurnInput{Scope: GuestScope, SessionID: "s1", Locale: "zh-TW", LastUser: "從上野到淺草搭計程車多少錢？"}
	_ = store.SaveTurn(context.Background(), input)
	profile, _ := store.LoadProfile(context.Background(), GuestScope, "", "s1")
	if profile == nil || profile.JourneyContext == nil {
		t.Fatalf("expected journey context")
	}
	if profile.JourneyContext.Origin == "" || profile.JourneyContext.Destination == "" {
		t.Fatalf("expected origin/destination slots")
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/infrastructure/memory -run TestJourneyContext_ExtractAndPersist -v`
Expected: FAIL with "profile.JourneyContext undefined"

**Step 3: Write minimal implementation**

- Add `JourneyContext` to `Profile` with `Origin`, `Destination`, `Mode`, `Constraints`, `LastUpdated`.
- Add a minimal in-memory fallback when Redis is nil for guest scope so tests can persist.
- Extract slots from `LastUser` and update journey context.
- In `BuildContextMessage`, emit short slot summary instead of long history.
- In `cmd/server/main.go`, prefer slot-based memory injection.

**Step 4: Run test to verify it passes**

Run: `go test ./internal/infrastructure/memory -run TestJourneyContext_ExtractAndPersist -v`
Expected: PASS

**Step 5: Commit**

```bash
git add services/adk-agent/internal/infrastructure/memory/store.go services/adk-agent/cmd/server/main.go services/adk-agent/internal/infrastructure/memory/store_test.go
git commit -m "feat: add journey context slots for memory"
```

### Task 3: Intent Ladder (Lite + Deep) with Conditional Escalation

**Files:**
- Create: `services/adk-agent/internal/orchestrator/intent_ladder.go`
- Create: `services/adk-agent/internal/orchestrator/lite_intent_classifier.go`
- Create: `services/adk-agent/internal/orchestrator/deep_intent_understanding.go`
- Modify: `services/adk-agent/internal/orchestrator/intent_router.go`
- Modify: `services/adk-agent/internal/orchestrator/layered_engine.go`
- Test: `services/adk-agent/internal/orchestrator/intent_router_test.go`

**Step 1: Write the failing test**

```go
func TestIntentLadder_EscalationRules(t *testing.T) {
	decision := DecideIntentLadder("那計程車多少錢", 0.6, true)
	if !decision.RequireDeepIntent {
		t.Fatalf("expected deep intent for low confidence + context")
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/orchestrator -run TestIntentLadder_EscalationRules -v`
Expected: FAIL with "undefined: DecideIntentLadder"

**Step 3: Write minimal implementation**

- Add `DecideIntentLadder(query, ruleConfidence, hasContext)` returning `RequireDeepIntent` and `Complexity`.
- Add lite classifier that outputs `simple|compound|ambiguous` with confidence (stubbed to rules for now).
- Use deep intent only when `ruleConfidence < 0.75` or `hasContext + pronoun + mixed signals`.
- Wire ladder decision into `layered_engine.go` to select template/fast path/LLM.

**Step 4: Run test to verify it passes**

Run: `go test ./internal/orchestrator -run TestIntentLadder_EscalationRules -v`
Expected: PASS

**Step 5: Commit**

```bash
git add services/adk-agent/internal/orchestrator/intent_ladder.go services/adk-agent/internal/orchestrator/lite_intent_classifier.go services/adk-agent/internal/orchestrator/deep_intent_understanding.go services/adk-agent/internal/orchestrator/intent_router.go services/adk-agent/internal/orchestrator/layered_engine.go services/adk-agent/internal/orchestrator/intent_router_test.go
git commit -m "feat: add adaptive intent ladder with conditional deep intent"
```

### Task 4: Metrics + Validation Gates

**Files:**
- Modify: `services/adk-agent/internal/orchestrator/metrics.go`
- Modify: `services/adk-agent/internal/orchestrator/layered_engine.go`
- Test: `services/adk-agent/internal/orchestrator/metrics_test.go`

**Step 1: Write the failing test**

```go
func TestMetrics_IntentLadderCounters(t *testing.T) {
	m := NewMetrics()
	m.IncCounter("deep_intent_invocation_count", 1)
	stats := m.GetStats()
	if stats.Counters["deep_intent_invocation_count"] != 1 {
		t.Fatalf("expected counter increment")
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/orchestrator -run TestMetrics_IntentLadderCounters -v`
Expected: FAIL with "metrics_test.go: no such file"

**Step 3: Write minimal implementation**

- Add `metrics_test.go`.
- Add counters: `faq_hit_count`, `deep_intent_invocation_count`, `intent_escalation_rate`, `template_false_intercept_count`.
- Emit counters in `layered_engine.go`.

**Step 4: Run test to verify it passes**

Run: `go test ./internal/orchestrator -run TestMetrics_IntentLadderCounters -v`
Expected: PASS

**Step 5: Commit**

```bash
git add services/adk-agent/internal/orchestrator/metrics.go services/adk-agent/internal/orchestrator/layered_engine.go services/adk-agent/internal/orchestrator/metrics_test.go
git commit -m "feat: add intent ladder metrics"
```

### Task 5: Validation Updates (Intent Eval + E2E)

**Files:**
- Modify: `services/adk-agent/tests/intent_router_cases.json`
- Modify: `services/adk-agent/tests/deep_routing_e2e_test.go`
- Test: `services/adk-agent/tests/intent_eval_updates_test.go`

**Step 1: Write the failing test**

```go
func TestIntentEvalCases_ContainsAirportFAQ(t *testing.T) {
	data, err := os.ReadFile("intent_router_cases.json")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(data), "airport_transfer") {
		t.Fatalf("expected airport transfer cases")
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./tests -run TestIntentEvalCases_ContainsAirportFAQ -v`
Expected: FAIL with "expected airport transfer cases"

**Step 3: Write minimal implementation**

- Add Top100 FAQ cases to `intent_router_cases.json` (airport transfer, lockers vs luggage, taxi follow-up).
- Add E2E case for "那計程車多少錢" to confirm context carry-over.

**Step 4: Run test to verify it passes**

Run: `go test ./tests -run TestIntentEvalCases_ContainsAirportFAQ -v`
Expected: PASS

**Step 5: Commit**

```bash
git add services/adk-agent/tests/intent_router_cases.json services/adk-agent/tests/deep_routing_e2e_test.go services/adk-agent/tests/intent_eval_updates_test.go
git commit -m "test: extend intent eval and e2e cases"
```

### Task 6: Full Verification

**Files:**
- None (command-only)

**Step 1: Run full orchestrator tests**

Run: `go test ./internal/orchestrator/...`
Expected: PASS

**Step 2: Run intent eval**

Run: `go run ./cmd/intent_eval -cases tests/intent_router_cases.json`
Expected: Accuracy >= 90%

**Step 3: Run full test suite**

Run: `go test ./...`
Expected: PASS

**Step 4: Commit verification log**

```bash
git status -sb
```
