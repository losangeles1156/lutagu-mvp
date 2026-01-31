package integration

import (
	"bytes"
	"encoding/json"
	"testing"

	"github.com/lutagu/adk-agent/internal/agent"
)

func TestChatHubRequestMarshalling(t *testing.T) {
	// Verify that the request structure matches what the client sends
	// and that the internal agent package can handle it.

	req := struct {
		Messages []agent.Message `json:"messages"`
		Locale   string          `json:"locale"`
	}{
		Messages: []agent.Message{
			{Role: "user", Content: "Hello, how much is the fare to Shinjuku?"},
		},
		Locale: "en",
	}

	body, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("Failed to marshal request: %v", err)
	}

	// Verify we can unmarshal it back to the agent's expected type
	var parsedReq struct {
		Messages []agent.Message `json:"messages"`
		Locale   string          `json:"locale"`
	}
	if err := json.NewDecoder(bytes.NewReader(body)).Decode(&parsedReq); err != nil {
		t.Fatalf("Failed to decode request: %v", err)
	}

	if parsedReq.Locale != "en" {
		t.Errorf("Expected locale 'en', got '%s'", parsedReq.Locale)
	}
	if len(parsedReq.Messages) != 1 {
		t.Errorf("Expected 1 message, got %d", len(parsedReq.Messages))
	}
}
