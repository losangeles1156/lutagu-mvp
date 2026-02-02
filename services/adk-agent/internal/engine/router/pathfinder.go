package router

import (
	"container/heap"
	"fmt"
	"math"
)

// Pathfinder implements A* search on the Graph
type Pathfinder struct {
	graph *Graph
}

func NewPathfinder(g *Graph) *Pathfinder {
	return &Pathfinder{graph: g}
}

// Result represents the optimal path found
type Result struct {
	Path          []*Node
	TotalTime     int
	TotalCost     int
	TransferCount int
}

// FindPath finds the best path using A* and DeepContext
func (p *Pathfinder) FindPath(startID, goalID string, ctx DeepContext) (*Result, error) {
	startNode, ok := p.graph.Nodes[startID]
	if !ok {
		return nil, fmt.Errorf("start node %s not found", startID)
	}
	goalNode, ok := p.graph.Nodes[goalID]
	if !ok {
		return nil, fmt.Errorf("goal node %s not found", goalID)
	}

	// Priority Queue item
	pq := &PriorityQueue{}
	heap.Init(pq)

	// Tracks
	gScore := make(map[string]float64) // Actual cost from start
	fScore := make(map[string]float64) // Estimated total cost (g + h)
	cameFrom := make(map[string]string)

	for id := range p.graph.Nodes {
		gScore[id] = math.MaxFloat64
		fScore[id] = math.MaxFloat64
	}

	gScore[startID] = 0
	fScore[startID] = p.heuristic(startNode, goalNode)

	heap.Push(pq, &Item{value: startID, priority: fScore[startID]})

	for pq.Len() > 0 {
		currentID := heap.Pop(pq).(*Item).value

		if currentID == goalID {
			return p.reconstructPath(cameFrom, currentID, gScore[currentID])
		}

		for _, edge := range p.graph.Edges[currentID] {
			// Calculate Deep Cost for this edge
			weight := p.calculateWeight(edge, ctx)

			tentativeG := gScore[currentID] + weight

			if tentativeG < gScore[edge.ToID] {
				cameFrom[edge.ToID] = currentID
				gScore[edge.ToID] = tentativeG
				fScore[edge.ToID] = gScore[edge.ToID] + p.heuristic(p.graph.Nodes[edge.ToID], goalNode)

				// Push or update in PQ
				heap.Push(pq, &Item{value: edge.ToID, priority: fScore[edge.ToID]})
			}
		}
	}

	return nil, fmt.Errorf("no path found")
}

// Deep Weight Calculation
func (p *Pathfinder) calculateWeight(edge *Edge, ctx DeepContext) float64 {
	base := float64(edge.Cost.TimeSeconds)

	// Apply Weather Penalty to Transfers
	if edge.Type == EdgeTypeTransfer {
		if ctx.IsRaining {
			// + 5 minutes penalty for transferring in rain
			base += 300
		}
		if ctx.IsSnowing {
			base += 600
		}
	}

	// Apply Disruption Penalty
	// (Placeholder: logic to check if edge.LineID is in ctx.DisabledLines)
	for _, disabled := range ctx.DisabledLines {
		if edge.LineID == disabled {
			return math.MaxFloat64 / 2 // Blocked
		}
	}

	return base
}

// Heuristic: Euclidean distance (Great Circle approx for small distances)
func (p *Pathfinder) heuristic(a, b *Node) float64 {
	if a.Lat == 0 || b.Lat == 0 {
		return 0 // Fallback to Dijkstra
	}

	// Simplify: Manhattan/Euclidean in degrees for Japan (Approximate)
	// 1 degree lat is ~111km. 1 degree lon is ~91km in Tokyo.
	dx := (a.Lon - b.Lon) * 91000
	dy := (a.Lat - b.Lat) * 111000

	// We want the heuristic in "SECONDS" to match gScore
	// Assume avg train speed 40km/h = 11m/s
	dist := math.Sqrt(dx*dx + dy*dy)
	return dist / 11
}

func (p *Pathfinder) reconstructPath(cameFrom map[string]string, currentID string, totalScore float64) (*Result, error) {
	var path []*Node
	curr := currentID
	for {
		path = append([]*Node{p.graph.Nodes[curr]}, path...)
		next, ok := cameFrom[curr]
		if !ok {
			break
		}
		curr = next
	}

	return &Result{
		Path:      path,
		TotalTime: int(totalScore),
	}, nil
}

// Priority Queue Implementation (Standard Go boilerplate)

type Item struct {
	value    string
	priority float64
	index    int
}

type PriorityQueue []*Item

func (pq PriorityQueue) Len() int           { return len(pq) }
func (pq PriorityQueue) Less(i, j int) bool { return pq[i].priority < pq[j].priority }
func (pq PriorityQueue) Swap(i, j int) {
	pq[i], pq[j] = pq[j], pq[i]
	pq[i].index = i
	pq[j].index = j
}
func (pq *PriorityQueue) Push(x interface{}) {
	n := len(*pq)
	item := x.(*Item)
	item.index = n
	*pq = append(*pq, item)
}
func (pq *PriorityQueue) Pop() interface{} {
	old := *pq
	n := len(old)
	item := old[n-1]
	item.index = -1
	*pq = old[0 : n-1]
	return item
}
