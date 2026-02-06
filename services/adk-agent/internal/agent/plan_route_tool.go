package agent

import (
	"encoding/json"
	"fmt"
	"sort"
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

type PlanStep struct {
	Station    string `json:"station"`
	Line       string `json:"line"`
	IsTransfer bool   `json:"is_transfer"`
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
	var steps []PlanStep
	for _, node := range res.Path {
		steps = append(steps, PlanStep{
			Station: node.NameJA,
			Line:    node.RailwayID,
		})
	}

	directInfo := t.findDirectService(originID, destID)
	comparison := map[string]interface{}{
		"recommended_reason":     fmt.Sprintf("Fastest travel time with %d transfer(s).", estimateTransfers(steps)),
		"not_recommended_reason": "Alternative direct routes may have longer in-station walking or lower frequency at this moment.",
	}
	if directInfo.Available {
		comparison["direct_option"] = map[string]interface{}{
			"line_id":         directInfo.LineID,
			"line_name_hint":  normalizeLineName(directInfo.LineID),
			"transfer_needed": false,
			"reason_not_top":  "Direct option exists but may not be the best overall after walk/transfer penalties.",
		}
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
		"comparison":         comparison,
	}

	return output, nil
}

// Simple Name Resolution Helper
func (t *PlanRouteTool) resolveStation(input string) string {
	if strings.HasPrefix(input, "odpt.Station:") {
		return input
	}

	term := normalizeStationTerm(input)
	candidates := []string{}
	for id, node := range t.Graph.Nodes {
		nameJA := strings.ToLower(node.NameJA)
		nameEN := strings.ToLower(node.NameEN)
		idLower := strings.ToLower(node.ID)
		if strings.Contains(nameJA, term) || strings.Contains(nameEN, term) || strings.Contains(idLower, term) {
			candidates = append(candidates, id)
		}
	}

	if len(candidates) == 0 {
		return ""
	}

	sort.SliceStable(candidates, func(i, j int) bool {
		return stationCandidateScore(candidates[i], term) < stationCandidateScore(candidates[j], term)
	})

	return candidates[0]
}

func normalizeStationTerm(s string) string {
	term := strings.ToLower(strings.TrimSpace(s))
	alias := map[string]string{
		"上野公園":    "ueno",
		"京成上野":    "keiseiueno",
		"東京メトロ上野": "ueno",
		"上野":      "ueno",
		"銀座":      "ginza",
		"東京":      "tokyo",
	}
	if mapped, ok := alias[term]; ok {
		return mapped
	}
	return term
}

func stationCandidateScore(stationID, term string) int {
	score := 100
	id := strings.ToLower(stationID)
	if strings.Contains(id, term) {
		score -= 40
	}
	if strings.Contains(id, "tokyometro") {
		score -= 10
	}
	if strings.Contains(id, "jr.east") {
		score -= 6
	}

	// Ueno disambiguation for common user intent
	if term == "ueno" {
		if strings.Contains(id, "tokyometro.ginza.ueno") {
			score -= 20
		}
		if strings.Contains(id, "jr.east.") && strings.Contains(id, ".ueno") {
			score -= 15
		}
	}
	return score
}

type directServiceInfo struct {
	Available bool
	LineID    string
}

func (t *PlanRouteTool) findDirectService(originID, destinationID string) directServiceInfo {
	if t.Graph == nil {
		return directServiceInfo{}
	}
	// Direct service means reachable via train edges on a single line.
	type state struct {
		ID     string
		LineID string
	}
	visited := map[string]bool{}
	queue := []state{{ID: originID, LineID: ""}}

	for len(queue) > 0 {
		curr := queue[0]
		queue = queue[1:]
		key := curr.ID + "|" + curr.LineID
		if visited[key] {
			continue
		}
		visited[key] = true

		if curr.ID == destinationID && curr.LineID != "" {
			return directServiceInfo{Available: true, LineID: curr.LineID}
		}

		for _, edge := range t.Graph.Edges[curr.ID] {
			if edge.Type != router.EdgeTypeTrain {
				continue
			}
			nextLine := curr.LineID
			if nextLine == "" {
				nextLine = edge.LineID
			}
			if edge.LineID != nextLine {
				continue
			}
			queue = append(queue, state{ID: edge.ToID, LineID: nextLine})
		}
	}
	return directServiceInfo{}
}

func estimateTransfers(steps []PlanStep) int {
	if len(steps) < 2 {
		return 0
	}
	transfers := 0
	prevLine := steps[0].Line
	for i := 1; i < len(steps); i++ {
		if steps[i].Line != "" && prevLine != "" && steps[i].Line != prevLine {
			transfers++
		}
		if steps[i].Line != "" {
			prevLine = steps[i].Line
		}
	}
	return transfers
}

func normalizeLineName(lineID string) string {
	if strings.Contains(strings.ToLower(lineID), "ueno-tokyo") {
		return "上野東京線"
	}
	return lineID
}
