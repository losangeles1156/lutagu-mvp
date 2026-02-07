package memory

import (
	"context"
	"testing"
)

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
