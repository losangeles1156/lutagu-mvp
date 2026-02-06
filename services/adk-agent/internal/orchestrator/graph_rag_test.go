package orchestrator

import (
	"testing"

	"github.com/lutagu/adk-agent/internal/engine/router"
	"github.com/lutagu/adk-agent/internal/layer"
)

func TestExpandGraphNodeIDs_WithNeighbors(t *testing.T) {
	g := router.NewGraph()
	g.AddNode(&router.Node{ID: "a", ConnectsTo: []string{"b"}})
	g.AddNode(&router.Node{ID: "b", ConnectsTo: []string{"c"}})
	g.AddNode(&router.Node{ID: "c"})
	g.AddEdge(&router.Edge{FromID: "b", ToID: "c"})
	pf := router.NewPathfinder(g)
	ctx := &layer.ResolvedContext{PrimaryNodeID: "a"}

	out := expandGraphNodeIDs(ctx, pf, 2, 5)
	if len(out) < 2 {
		t.Fatalf("expected expanded nodes, got %#v", out)
	}
	if out[0] != "a" {
		t.Fatalf("expected primary node first, got %#v", out)
	}
}

func TestExpandGraphNodeIDs_NoGraph(t *testing.T) {
	ctx := &layer.ResolvedContext{PrimaryNodeID: "tokyo"}
	out := expandGraphNodeIDs(ctx, nil, 1, 5)
	if len(out) != 1 || out[0] != "tokyo" {
		t.Fatalf("expected only seed node, got %#v", out)
	}
}
