package validation

import (
	"strings"
	"testing"
)

func TestFactChecker(t *testing.T) {
	fc, err := NewFactChecker()
	if err != nil {
		t.Fatalf("Failed to create FactChecker: %v", err)
	}

	tests := []struct {
		name     string
		query    string
		response string
		wantHall bool
	}{
		{
			name:     "Haneda to Tokyo Hallucination",
			query:    "羽田機場到東京車站怎麼走？",
			response: "您可以搭乘京急線直達東京車站，非常方便。",
			wantHall: true,
		},
		{
			name:     "Haneda to Tokyo Correct",
			query:    "羽田機場到東京車站怎麼走？",
			response: "建議搭乘京急線到品川站，然後轉乘 JR 山手線或京濱東北線到東京車站。",
			wantHall: false,
		},
		{
			name:     "English Haneda Hallucination",
			query:    "How to get from Haneda to Tokyo Station?",
			response: "You can take the Keikyu line direct to Tokyo Station.",
			wantHall: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := fc.Check(tt.query, tt.response, "zh-TW")
			if result.HasHallucination != tt.wantHall {
				t.Errorf("FactChecker.Check() HasHallucination = %v, want %v", result.HasHallucination, tt.wantHall)
			}
			if tt.wantHall && !strings.Contains(result.CorrectedResponse, "重要更正") {
				t.Errorf("FactChecker.Check() response was not corrected")
			}
		})
	}
}
