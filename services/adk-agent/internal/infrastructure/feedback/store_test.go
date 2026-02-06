package feedback

import (
	"context"
	"testing"
)

func TestStoreNilDeps(t *testing.T) {
	s := NewStore(nil, nil)
	ctx := context.Background()
	if err := s.Record(ctx, Event{TraceID: "t1"}); err != nil {
		t.Fatalf("record should not fail with nil deps: %v", err)
	}
	if err := s.SaveWeights(ctx, map[string]float64{"route": 1.2}); err != nil {
		t.Fatalf("save weights should not fail with nil deps: %v", err)
	}
	w, err := s.LoadWeights(ctx)
	if err != nil {
		t.Fatalf("load weights should not fail with nil deps: %v", err)
	}
	if len(w) != 0 {
		t.Fatalf("expected empty weights with nil deps, got %#v", w)
	}
}
