package orchestrator

import (
	"testing"

	"github.com/lutagu/adk-agent/internal/engine/router"
	"github.com/lutagu/adk-agent/internal/layer"
)

var benchmarkQueries = []string{
	"從新宿到羽田機場最快怎麼去",
	"現在山手線有延誤嗎",
	"東京站附近有什麼推薦餐廳",
	"how much is fare from ginza to shibuya",
	"wheelchair accessible route to narita",
	"為何不推薦這條路線",
}

func BenchmarkAnalyzeIntent(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = analyzeIntent(benchmarkQueries[i%len(benchmarkQueries)])
	}
}

func BenchmarkExpandGraphNodeIDs(b *testing.B) {
	g := router.NewGraph()
	g.AddNode(&router.Node{ID: "a", ConnectsTo: []string{"b", "c"}})
	g.AddNode(&router.Node{ID: "b", ConnectsTo: []string{"d"}})
	g.AddNode(&router.Node{ID: "c", ConnectsTo: []string{"e"}})
	g.AddNode(&router.Node{ID: "d"})
	g.AddNode(&router.Node{ID: "e"})
	pf := router.NewPathfinder(g)
	ctx := &layer.ResolvedContext{PrimaryNodeID: "a"}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = expandGraphNodeIDs(ctx, pf, 2, 8)
	}
}
