package orchestrator

import "testing"

func TestMetrics_IntentLadderCounters(t *testing.T) {
	m := NewMetrics()
	m.RecordIntentLadder(true, true)
	stats := m.GetStats()
	if stats.Counters["deep_intent_invocation_count"] != 1 {
		t.Fatalf("expected counter increment")
	}
	if stats.Counters["faq_hit_count"] != 1 {
		t.Fatalf("expected faq counter increment")
	}
}
