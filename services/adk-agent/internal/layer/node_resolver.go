package layer

import (
	"context"
	"regexp"
	"strings"
)

// NodeResolver performs Context-Pruned RAG by identifying the primary node context
type NodeResolver struct {
	stationPatterns []stationPattern
}

type stationPattern struct {
	regex     *regexp.Regexp
	nodeID    string
	nodeName  string
	aliases   []string
}

// ResolvedContext contains the resolved node context
type ResolvedContext struct {
	PrimaryNodeID   string
	PrimaryNodeName string
	SecondaryNodes  []string
	IsRouteQuery    bool
	Origin          string
	Destination     string
	Confidence      float64
}

// NewNodeResolver creates a resolver with Tokyo station patterns
func NewNodeResolver() *NodeResolver {
	r := &NodeResolver{}
	r.initPatterns()
	return r
}

func (r *NodeResolver) initPatterns() {
	// Major Tokyo stations
	stations := []struct {
		id      string
		name    string
		aliases []string
	}{
		{"tokyo", "東京", []string{"tokyo", "東京駅", "tokyo station"}},
		{"shinjuku", "新宿", []string{"shinjuku", "新宿駅", "shinjuku station"}},
		{"shibuya", "渋谷", []string{"shibuya", "渋谷駅", "shibuya station"}},
		{"ikebukuro", "池袋", []string{"ikebukuro", "池袋駅", "ikebukuro station"}},
		{"ueno", "上野", []string{"ueno", "上野駅", "ueno station"}},
		{"akihabara", "秋葉原", []string{"akihabara", "秋葉原駅", "akiba"}},
		{"shinagawa", "品川", []string{"shinagawa", "品川駅", "shinagawa station"}},
		{"yokohama", "横浜", []string{"yokohama", "横浜駅", "yokohama station"}},
		{"roppongi", "六本木", []string{"roppongi", "六本木駅", "roppongi station"}},
		{"ginza", "銀座", []string{"ginza", "銀座駅", "ginza station"}},
		{"asakusa", "浅草", []string{"asakusa", "浅草駅", "asakusa station"}},
		{"odaiba", "お台場", []string{"odaiba", "台場", "daiba"}},
		{"narita", "成田空港", []string{"narita", "成田", "nrt", "成田機場"}},
		{"haneda", "羽田空港", []string{"haneda", "羽田", "hnd", "羽田機場"}},
	}

	for _, s := range stations {
		pattern := "(?i)(" + regexp.QuoteMeta(s.name)
		for _, alias := range s.aliases {
			pattern += "|" + regexp.QuoteMeta(alias)
		}
		pattern += ")"

		r.stationPatterns = append(r.stationPatterns, stationPattern{
			regex:    regexp.MustCompile(pattern),
			nodeID:   s.id,
			nodeName: s.name,
			aliases:  s.aliases,
		})
	}
}

// Resolve extracts node context from query
func (r *NodeResolver) Resolve(ctx context.Context, query string) *ResolvedContext {
	query = strings.TrimSpace(query)
	if query == "" {
		return &ResolvedContext{Confidence: 0}
	}

	result := &ResolvedContext{
		Confidence: 0,
	}

	// Check for route query patterns
	routePatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)(從|から|from)\s*(.+?)\s*(到|へ|まで|to)\s*(.+)`),
		regexp.MustCompile(`(?i)(.+?)\s*(到|へ|to)\s*(.+?)\s*(怎麼去|行き方|how to get)`),
		regexp.MustCompile(`(?i)(怎麼|どうやって|how)\s*(去|行く|get to)\s*(.+)`),
	}

	for _, rp := range routePatterns {
		if matches := rp.FindStringSubmatch(query); matches != nil {
			result.IsRouteQuery = true
			if len(matches) >= 5 {
				result.Origin = strings.TrimSpace(matches[2])
				result.Destination = strings.TrimSpace(matches[4])
			} else if len(matches) >= 4 {
				result.Destination = strings.TrimSpace(matches[3])
			}
			result.Confidence = 0.9
			break
		}
	}

	// Find mentioned stations
	var foundStations []struct {
		id   string
		name string
		pos  int
	}

	for _, p := range r.stationPatterns {
		if loc := p.regex.FindStringIndex(query); loc != nil {
			foundStations = append(foundStations, struct {
				id   string
				name string
				pos  int
			}{p.nodeID, p.nodeName, loc[0]})
		}
	}

	// Assign stations based on context
	if len(foundStations) > 0 {
		// Sort by position
		for i := 0; i < len(foundStations)-1; i++ {
			for j := i + 1; j < len(foundStations); j++ {
				if foundStations[i].pos > foundStations[j].pos {
					foundStations[i], foundStations[j] = foundStations[j], foundStations[i]
				}
			}
		}

		result.PrimaryNodeID = foundStations[0].id
		result.PrimaryNodeName = foundStations[0].name

		if len(foundStations) > 1 {
			for i := 1; i < len(foundStations); i++ {
				result.SecondaryNodes = append(result.SecondaryNodes, foundStations[i].id)
			}
		}

		result.Confidence = 0.8
		if result.IsRouteQuery && len(foundStations) >= 2 {
			result.Origin = foundStations[0].name
			result.Destination = foundStations[len(foundStations)-1].name
			result.Confidence = 0.95
		}
	}

	return result
}
