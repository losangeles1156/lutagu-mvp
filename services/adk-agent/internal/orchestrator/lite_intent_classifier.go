package orchestrator

func classifyLiteIntent(query string) (string, float64) {
	if isLikelyCompoundIntent(query) {
		return "compound", 0.7
	}
	if hasFollowUpPronoun(query) {
		return "ambiguous", 0.6
	}
	return "simple", 0.9
}
