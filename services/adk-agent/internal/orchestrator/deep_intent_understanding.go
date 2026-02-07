package orchestrator

type DeepIntentResult struct {
	PrimaryIntent    string
	SecondaryIntents []string
	ContextSlots     map[string]string
	Complexity       string
	RequiresClarify  bool
	Confidence       float64
}
