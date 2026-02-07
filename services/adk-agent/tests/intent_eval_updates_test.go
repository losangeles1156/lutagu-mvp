package tests

import (
	"os"
	"strings"
	"testing"
)

func TestIntentEvalCases_ContainsAirportFAQ(t *testing.T) {
	data, err := os.ReadFile("intent_router_cases.json")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(data), "airport_transfer") {
		t.Fatalf("expected airport transfer cases")
	}
}
