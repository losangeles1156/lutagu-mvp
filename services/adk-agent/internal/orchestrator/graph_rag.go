package orchestrator

import (
	"strings"

	"github.com/lutagu/adk-agent/internal/engine/router"
	"github.com/lutagu/adk-agent/internal/layer"
)

func expandGraphNodeIDs(nodeCtx *layer.ResolvedContext, pf *router.Pathfinder, maxHops int, maxNodes int) []string {
	if nodeCtx == nil {
		return nil
	}
	if maxHops < 0 {
		maxHops = 0
	}
	if maxNodes <= 0 {
		maxNodes = 8
	}

	seed := []string{}
	if nodeCtx.PrimaryNodeID != "" {
		seed = append(seed, nodeCtx.PrimaryNodeID)
	}
	seed = append(seed, nodeCtx.SecondaryNodes...)
	if len(seed) == 0 {
		return nil
	}

	seen := map[string]struct{}{}
	queue := append([]string{}, seed...)
	result := make([]string, 0, len(seed))
	for _, id := range seed {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		result = append(result, id)
	}

	if maxHops == 0 || pf == nil || pf.Graph() == nil {
		if len(result) > maxNodes {
			return result[:maxNodes]
		}
		return result
	}

	g := pf.Graph()
	currentHop := 0
	cursor := 0
	for currentHop < maxHops && cursor < len(queue) && len(result) < maxNodes {
		levelEnd := len(queue)
		for cursor < levelEnd && len(result) < maxNodes {
			nodeID := queue[cursor]
			cursor++
			for _, next := range neighborsOf(g, nodeID) {
				if _, ok := seen[next]; ok {
					continue
				}
				seen[next] = struct{}{}
				queue = append(queue, next)
				result = append(result, next)
				if len(result) >= maxNodes {
					break
				}
			}
		}
		currentHop++
	}

	return result
}

func neighborsOf(g *router.Graph, nodeID string) []string {
	if g == nil || nodeID == "" {
		return nil
	}
	neighbors := make([]string, 0, 8)
	seen := map[string]struct{}{}

	if n, ok := g.Nodes[nodeID]; ok {
		for _, id := range n.ConnectsTo {
			id = strings.TrimSpace(id)
			if id == "" {
				continue
			}
			if _, exists := seen[id]; !exists {
				seen[id] = struct{}{}
				neighbors = append(neighbors, id)
			}
		}
	}

	for _, edge := range g.Edges[nodeID] {
		next := strings.TrimSpace(edge.ToID)
		if next == "" {
			continue
		}
		if _, exists := seen[next]; !exists {
			seen[next] = struct{}{}
			neighbors = append(neighbors, next)
		}
	}

	return neighbors
}
