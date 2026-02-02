package tests

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/joho/godotenv"
	"github.com/lutagu/adk-agent/internal/agent"
	"github.com/lutagu/adk-agent/internal/engine/router"
	"github.com/lutagu/adk-agent/internal/infrastructure/supabase"
)

// TestDeepRouting_E2E validates the entire stack:
// Supabase -> Loader -> Graph -> Pathfinder -> PlanRouteTool -> JSON Output
func TestDeepRouting_E2E(t *testing.T) {
	// 1. Load Env
	// Try multiple paths
	paths := []string{"../../.env.local", "../../../.env.local", ".env.local"}
	loaded := false
	for _, p := range paths {
		if err := godotenv.Load(p); err == nil {
			t.Logf("Loaded env from %s", p)
			loaded = true
			break
		}
	}
	if !loaded {
		t.Log("Warning: Could not load .env.local from standard paths")
	}

	url := os.Getenv("NEXT_PUBLIC_SUPABASE_URL")
	if url == "" {
		url = os.Getenv("SUPABASE_URL")
	}
	key := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	if key == "" {
		key = os.Getenv("SUPABASE_SERVICE_KEY")
	}

	if url == "" || key == "" {
		t.Skipf("Skipping E2E test: Missing Supabase Credentials. URL present: %v, Key present: %v", url != "", key != "")
	}

	// 2. Initialize Infrastructure
	t.Log("Connecting to Supabase...")
	client, err := supabase.NewClient(url, key)
	if err != nil {
		t.Fatalf("Supabase setup failed: %v", err)
	}

	// 3. Build Graph (Latency Test)
	t.Log("Building Graph...")
	start := time.Now()
	loader := router.NewLoader(client)
	graph, err := loader.BuildGraph(context.Background())
	if err != nil {
		t.Fatalf("Graph build failed: %v", err)
	}
	buildDuration := time.Since(start)
	t.Logf("Graph Built in %v. Nodes: %d", buildDuration, len(graph.Nodes))

	if len(graph.Nodes) < 100 {
		t.Errorf("Graph too small! Expected > 100 nodes, got %d", len(graph.Nodes))
	}

	// 4. Initialize Pathfinder & Tool Implementation directly for verification
	pf := router.NewPathfinder(graph)
	routeTool := &agent.PlanRouteTool{
		Pathfinder: pf,
		Graph:      graph,
	}

	// 5. Test Scenario: Ginza to Shinjuku (Clear vs Rain)

	// Case A: Clear Sky (Manual Injection via Tool input not possible directly without mock weather,
	// so we test Pathfinder directly for logic, and Tool for formatting)

	t.Run("Pathfinding Logic - Rain Penalty", func(t *testing.T) {
		// Find IDs for Ginza and Shinjuku
		// Note: These IDs depend on your DB data. Using resolving logic.
		originID := resolve(graph, "Ginza")
		destID := resolve(graph, "Shinjuku")
		t.Logf("Resolved: %s -> %s", originID, destID)

		// Context: Clear
		resClear, err := pf.FindPath(originID, destID, router.DeepContext{IsRaining: false})
		if err != nil {
			t.Fatalf("Clear path failed: %v", err)
		}
		t.Logf("Clear Time: %d sec, Steps: %d", resClear.TotalTime, len(resClear.Path))

		// Context: Rain
		resRain, err := pf.FindPath(originID, destID, router.DeepContext{IsRaining: true})
		if err != nil {
			t.Fatalf("Rain path failed: %v", err)
		}
		t.Logf("Rain Time: %d sec, Steps: %d", resRain.TotalTime, len(resRain.Path))

		// Verification: Rain time should be >= Clear time
		if resRain.TotalTime < resClear.TotalTime {
			t.Errorf("Logical Flaw: Rain path is faster? Clear: %d, Rain: %d", resClear.TotalTime, resRain.TotalTime)
		}
	})

	t.Run("Tool Result Compliance", func(t *testing.T) {
		args := agent.PlanRouteArgs{
			Origin:      "Ginza",
			Destination: "Shinjuku",
			Urgency:     5,
		}
		// Note: We use nil as tool.Context for now as we don't have a mock or real one easily,
		// and the implementation only uses it for weather which we set to nil.
		result, err := routeTool.Run(nil, args)
		if err != nil {
			t.Fatalf("Tool execution failed: %v", err)
		}

		t.Logf("Tool Result: %+v", result)

		if _, ok := result["steps"]; !ok {
			t.Error("Missing 'steps' field in result")
		}
		if _, ok := result["deep_advice"]; !ok {
			t.Error("Missing 'deep_advice' field in result")
		}
	})
}

func resolve(g *router.Graph, name string) string {
	// Simple lookup for test
	for id, n := range g.Nodes {
		if n.NameEN == name || n.NameJA == name {
			return id
		}
	}
	// Fallback to searching IDs
	for id := range g.Nodes {
		if len(id) > len(name) && id[len(id)-len(name):] == name {
			return id
		}
	}
	return ""
}
