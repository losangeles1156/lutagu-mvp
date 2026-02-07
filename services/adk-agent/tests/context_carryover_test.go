package tests

import (
	"context"
	"strings"
	"testing"

	"github.com/lutagu/adk-agent/internal/infrastructure/memory"
)

func TestContextCarryOver_SlotsIncluded(t *testing.T) {
	store := memory.NewStore(nil, nil, memory.Options{})
	input := memory.SaveTurnInput{Scope: memory.GuestScope, SessionID: "s2", Locale: "zh-TW", LastUser: "從上野到淺草搭計程車多少錢？"}
	_ = store.SaveTurn(context.Background(), input)
	profile, _ := store.LoadProfile(context.Background(), memory.GuestScope, "", "s2")
	msg := store.BuildContextMessage(profile, "zh-TW")
	if msg == nil {
		t.Fatalf("expected context message")
	}
	if !strings.Contains(msg.Content, "origin=上野") || !strings.Contains(msg.Content, "destination=淺草") {
		t.Fatalf("expected origin/destination slots in context message")
	}
}
