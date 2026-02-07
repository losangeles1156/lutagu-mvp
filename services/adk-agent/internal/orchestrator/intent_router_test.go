package orchestrator

import "testing"

func TestAnalyzeIntent_StatusAndTime(t *testing.T) {
	intent := analyzeIntent("現在銀座線有延誤嗎？")
	if intent.Route != intentAlgoTool {
		t.Fatalf("expected %s, got %s", intentAlgoTool, intent.Route)
	}
	if !hasTag(intent.Tags, "status") {
		t.Fatalf("expected status tag, got %#v", intent.Tags)
	}
}

func TestAnalyzeIntent_Route(t *testing.T) {
	intent := analyzeIntent("from Shibuya to Tokyo station route")
	if intent.Route != intentSLMOnly {
		t.Fatalf("expected %s, got %s", intentSLMOnly, intent.Route)
	}
	if !hasTag(intent.Tags, "route") {
		t.Fatalf("expected route tag, got %#v", intent.Tags)
	}
}

func TestBuildToolPlan(t *testing.T) {
	intent := analyzeIntent("為何不推薦A路線？")
	plan := buildToolPlan("為何不推薦A路線？", false, intent)
	if !plan.RequireRouteExplain {
		t.Fatal("expected route explain requirement")
	}
}

func TestIntentFeedbackWeights(t *testing.T) {
	UpdateIntentTagFeedback([]string{"local_guide"}, true)
	UpdateIntentTagFeedback([]string{"local_guide"}, true)
	UpdateIntentTagFeedback([]string{"status"}, false)

	weights := GetIntentFeedbackWeights()
	if weights["local_guide"] <= weights["status"] {
		t.Fatalf("expected local_guide weight > status, got %#v", weights)
	}
}

func TestRestoreIntentFeedbackWeights(t *testing.T) {
	RestoreIntentFeedbackWeights(map[string]float64{
		"route":  9,
		"status": -9,
	})
	weights := GetIntentFeedbackWeights()
	if weights["route"] != 2 {
		t.Fatalf("expected route to be clamped to 2, got %v", weights["route"])
	}
	if weights["status"] != -2 {
		t.Fatalf("expected status to be clamped to -2, got %v", weights["status"])
	}
}

func TestFAQFastPath_Hit(t *testing.T) {
	q := "成田機場到新宿怎麼去"
	if !isFAQHit(q, "zh-TW") {
		t.Fatalf("expected FAQ hit for airport transfer")
	}
}

func TestIntentLadder_EscalationRules(t *testing.T) {
	decision := DecideIntentLadder("那計程車多少錢", 0.6, true)
	if !decision.RequireDeepIntent {
		t.Fatalf("expected deep intent for low confidence + context")
	}
}
