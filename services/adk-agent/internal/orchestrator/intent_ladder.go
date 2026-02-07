package orchestrator

import "strings"

type IntentLadderDecision struct {
	RequireDeepIntent bool
	Complexity        string
	Confidence        float64
}

func DecideIntentLadder(query string, ruleConfidence float64, hasContext bool) IntentLadderDecision {
	complexity, conf := classifyLiteIntent(query)
	requireDeep := ruleConfidence < 0.75 || complexity == "ambiguous" || (hasContext && hasFollowUpPronoun(query))
	return IntentLadderDecision{
		RequireDeepIntent: requireDeep,
		Complexity:        complexity,
		Confidence:        conf,
	}
}

func hasFollowUpPronoun(query string) bool {
	q := strings.TrimSpace(query)
	if q == "" {
		return false
	}
	pronouns := []string{"那", "這", "這個", "剛剛", "前面", "that", "this", "earlier"}
	return hasAnyToken(strings.ToLower(q), pronouns)
}

func estimateRuleConfidence(query string, tags []string) float64 {
	if hasRoutePhrase(query) || hasTag(tags, "route") {
		return 0.85
	}
	if hasTag(tags, "status") {
		return 0.9
	}
	if len(tags) == 0 {
		return 0.55
	}
	return 0.7
}
