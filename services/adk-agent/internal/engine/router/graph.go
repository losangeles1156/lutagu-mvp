package router

// Graph represents the entire transit network topology
type Graph struct {
	Nodes map[string]*Node
	Edges map[string][]*Edge
}

// Node represents a station or a transfer point
type Node struct {
	ID         string   `json:"id"`
	NameJA     string   `json:"name_ja"`
	NameEN     string   `json:"name_en"`
	Operator   string   `json:"operator"`
	RailwayID  string   `json:"railway_id"`
	Lat        float64  `json:"lat"`
	Lon        float64  `json:"lon"`
	ConnectsTo []string // IDs of connected nodes (adjacency)
}

// Edge represents a connection between two nodes (Train ride or Transfer walk)
type Edge struct {
	FromID    string
	ToID      string
	Type      EdgeType
	Cost      DeepCost // Multi-dimensional cost
	LineID    string   // For Train edges
	Direction string   // Ascending/Descending
}

type EdgeType int

const (
	EdgeTypeTrain EdgeType = iota
	EdgeTypeTransfer
	EdgeTypeWalk
)

// DeepCost contains multi-variable weights for a single edge
type DeepCost struct {
	TimeSeconds    int // Base travel time
	TicketFare     int // Cost in Yen
	ICFare         int // Cost in Yen (IC Card)
	ComfortPenalty int // Arbitrary weight for congestion/pain (0-100)
	WeatherPenalty int // Extra weight when raining/snowing (0-100)
}

// DeepContext holds the real-time variables for pathfinding
type DeepContext struct {
	IsRaining     bool
	IsSnowing     bool
	IsHot         bool
	UserBudget    int      // Max Yen willing to spend
	UserUrgency   int      // 0(Chill) - 10(Rush)
	DisabledLines []string // List of suspended Railway IDs
}

func NewGraph() *Graph {
	return &Graph{
		Nodes: make(map[string]*Node),
		Edges: make(map[string][]*Edge),
	}
}

func (g *Graph) AddNode(n *Node) {
	g.Nodes[n.ID] = n
}

func (g *Graph) AddEdge(e *Edge) {
	g.Edges[e.FromID] = append(g.Edges[e.FromID], e)
}
