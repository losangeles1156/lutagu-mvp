package router

import (
	"testing"
)

func TestPathfinder_Integration(t *testing.T) {
	g := NewGraph()

	// Setup simple network:
	// A --(Train 2m)--> B
	// B --(Transfer 5m)--> C (Line 2)
	// C --(Train 2m)--> D

	g.AddNode(&Node{ID: "A", NameJA: "Station1", Lat: 35.0, Lon: 139.0})
	g.AddNode(&Node{ID: "B", NameJA: "Station2", Lat: 35.1, Lon: 139.0})
	g.AddNode(&Node{ID: "C", NameJA: "Station2", Lat: 35.1, Lon: 139.0})
	g.AddNode(&Node{ID: "D", NameJA: "Station3", Lat: 35.2, Lon: 139.0})

	// Train edges
	g.AddEdge(&Edge{FromID: "A", ToID: "B", Type: EdgeTypeTrain, Cost: DeepCost{TimeSeconds: 120}})
	g.AddEdge(&Edge{FromID: "C", ToID: "D", Type: EdgeTypeTrain, Cost: DeepCost{TimeSeconds: 120}})

	// Transfer edge at Station 2
	g.AddEdge(&Edge{FromID: "B", ToID: "C", Type: EdgeTypeTransfer, Cost: DeepCost{TimeSeconds: 300}})

	pf := NewPathfinder(g)

	t.Run("Basic Path", func(t *testing.T) {
		res, err := pf.FindPath("A", "D", DeepContext{IsRaining: false})
		if err != nil {
			t.Fatalf("Failed to find path: %v", err)
		}
		// Expectation: 120 + 300 + 120 = 540s
		if res.TotalTime != 540 {
			t.Errorf("Expected 540s, got %ds", res.TotalTime)
		}
		if len(res.Path) != 4 {
			t.Errorf("Expected 4 nodes, got %d", len(res.Path))
		}
	})

	t.Run("Weather Penalty (Rain)", func(t *testing.T) {
		res, err := pf.FindPath("A", "D", DeepContext{IsRaining: true})
		if err != nil {
			t.Fatalf("Failed to find path: %v", err)
		}
		// Expectation: 120 + (300 + 300 penalty) + 120 = 840s
		if res.TotalTime != 840 {
			t.Errorf("Expected 840s, got %ds", res.TotalTime)
		}
	})
}
