package agent

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/jsonschema-go/jsonschema"
	"github.com/lutagu/adk-agent/internal/engine/router"
	"github.com/lutagu/adk-agent/internal/infrastructure/weather"
	"google.golang.org/adk/tool"
	"google.golang.org/adk/tool/functiontool"
)

// PlanRouteTool holds dependencies for routing
type PlanRouteTool struct {
	Pathfinder    *router.Pathfinder
	WeatherClient *weather.Client
	Graph         *router.Graph
}

// Arguments for the tool
type PlanRouteArgs struct {
	Origin      string `json:"origin"`
	Destination string `json:"destination"`
	Urgency     int    `json:"urgency"`
}

// NewPlanRouteTool creates the tool using functiontool wrapper
func NewPlanRouteTool(pf *router.Pathfinder, wc *weather.Client, g *router.Graph) tool.Tool {
	t := &PlanRouteTool{
		Pathfinder:    pf,
		WeatherClient: wc,
		Graph:         g,
	}

	ft, err := functiontool.New(functiontool.Config{
		Name:        "plan_route",
		Description: "Calculate the optimal transit route between two stations. Automatically considers weather (rain) to avoid outdoor transfers.",
		InputSchema: &jsonschema.Schema{
			Type: "object",
			Properties: map[string]*jsonschema.Schema{
				"origin": {
					Type:        "string",
					Description: "Starting station name (e.g. 'Ginza') or ID",
				},
				"destination": {
					Type:        "string",
					Description: "Target station name (e.g. 'Shinjuku') or ID",
				},
				"urgency": {
					Type:        "integer",
					Description: "0-10 priority for speed vs cost",
					Default:     json.RawMessage(`5`),
				},
			},
			Required: []string{"origin", "destination"},
		},
	}, t.Run)
	if err != nil {
		// Should not happen for valid config
		panic(fmt.Sprintf("failed to create plan_route tool: %v", err))
	}
	return ft
}

func (t *PlanRouteTool) Run(ctx tool.Context, args PlanRouteArgs) (map[string]interface{}, error) {
	fmt.Printf("🛠️ PlanRouteTool Invoked: %s -> %s\n", args.Origin, args.Destination)

	// 1. Resolve Names to IDs
	originID := t.resolveStation(args.Origin)
	destID := t.resolveStation(args.Destination)

	if originID == "" || destID == "" {
		return map[string]interface{}{
			"error": fmt.Sprintf("Could not resolve station names. Found: Origin=%s, Dest=%s", originID, destID),
		}, nil
	}

	// 2. Prepare Deep Context (Weather)
	deepCtx := router.DeepContext{
		UserUrgency: args.Urgency,
	}
	if deepCtx.UserUrgency == 0 {
		deepCtx.UserUrgency = 5
	}

	if t.WeatherClient != nil {
		w, err := t.WeatherClient.GetCurrentWeather(ctx) // tool.Context satisfies context.Context usually
		if err == nil {
			deepCtx.IsRaining = w.IsRaining()
		}
	}

	// 3. Find Path
	res, err := t.Pathfinder.FindPath(originID, destID, deepCtx)
	if err != nil {
		return map[string]interface{}{"error": err.Error()}, nil
	}

	// 4. Format Result
	type Step struct {
		Station    string `json:"station"`
		Line       string `json:"line"`
		IsTransfer bool   `json:"is_transfer"`
	}
	var steps []Step
	for _, node := range res.Path {
		steps = append(steps, Step{
			Station: node.NameJA,
			Line:    node.RailwayID,
		})
	}

	advice := "Route optimized for time."
	if deepCtx.IsRaining {
		advice = "☔ Rain detected: Route adjusted to prioritize indoor transfers and direct lines."
	}

	output := map[string]interface{}{
		"total_time_minutes": res.TotalTime / 60,
		"steps":              steps,
		"deep_advice":        advice,
		"is_rainy":           deepCtx.IsRaining,
	}

	return output, nil
}

// Simple Name Resolution Helper
func (t *PlanRouteTool) resolveStation(input string) string {
	if strings.HasPrefix(input, "odpt.Station:") {
		return input
	}

	// Search by name
	term := strings.ToLower(input)
	for id, node := range t.Graph.Nodes {
		if strings.Contains(strings.ToLower(node.NameJA), term) ||
			strings.Contains(strings.ToLower(node.NameEN), term) ||
			strings.Contains(strings.ToLower(node.ID), term) {
			return id
		}
	}
	return ""
}
