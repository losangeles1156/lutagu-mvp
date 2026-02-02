package router

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/lutagu/adk-agent/internal/infrastructure/supabase"
)

// Loader fetches static data from Supabase and builds the Graph
type Loader struct {
	client *supabase.Client
}

func NewLoader(client *supabase.Client) *Loader {
	return &Loader{client: client}
}

// BuildGraph loads railways and fares to construct the full topology
func (l *Loader) BuildGraph(ctx context.Context) (*Graph, error) {
	slog.Info("Starting Graph Build...")
	start := time.Now()

	g := NewGraph()

	// 1. Load Stations Metadata (Lat/Long/Names)
	slog.Info("Fetching Station Metadata...")
	stationMeta, err := l.fetchStations(ctx)
	if err != nil {
		slog.Warn("Failed to fetch station metadata (continuing with empty meta)", "error", err)
		stationMeta = make(map[string]stationRecord)
	} else {
		slog.Info("Loaded Station Metadata", "count", len(stationMeta))
	}

	// 2. Load Railways (Topology)
	railways, err := l.fetchRailways(ctx)
	if err != nil {
		return nil, err
	}
	slog.Info("Loaded Railways", "count", len(railways))

	// 3. Construct Graph & Group for Transfers
	stationGroups := make(map[string][]string) // NameJA -> []NodeID

	for _, r := range railways {
		// Parse station_order (JSONArray)
		var stations []struct {
			Station string `json:"odpt:station"`
			Index   int    `json:"odpt:index"`
		}
		if err := json.Unmarshal(r.StationOrder, &stations); err != nil {
			continue
		}

		var prevStationID string
		for _, s := range stations {
			sid := s.Station

			// Create Node if not exists
			if _, exists := g.Nodes[sid]; !exists {
				// Enrich with metadata if available
				node := &Node{
					ID:        sid,
					RailwayID: r.ID,
					Operator:  r.Operator,
					NameEN:    sid, // Fallback
					NameJA:    sid, // Fallback
				}

				if meta, ok := stationMeta[sid]; ok {
					node.Lat = meta.Lat
					node.Lon = meta.Long
					node.NameEN = meta.TitleEn
					node.NameJA = meta.TitleJa
				}
				g.AddNode(node)

				// Group by NameJA for virtual transfers
				if node.NameJA != "" {
					stationGroups[node.NameJA] = append(stationGroups[node.NameJA], sid)
				}
			}

			// Add Edge (Train connection)
			if prevStationID != "" {
				cost := DeepCost{TimeSeconds: 120}
				g.AddEdge(&Edge{
					FromID: prevStationID,
					ToID:   sid,
					Type:   EdgeTypeTrain,
					LineID: r.ID,
					Cost:   cost,
				})
				g.AddEdge(&Edge{
					FromID: sid,
					ToID:   prevStationID,
					Type:   EdgeTypeTrain,
					LineID: r.ID,
					Cost:   cost,
				})
			}
			prevStationID = sid
		}
	}

	// 4. Generate Virtual Transfer Edges
	transferCount := 0
	for name, ids := range stationGroups {
		if len(ids) < 2 {
			continue
		}
		// Create N*N edges between all lines at this station
		for i := 0; i < len(ids); i++ {
			for j := 0; j < len(ids); j++ {
				if i == j {
					continue
				}
				g.AddEdge(&Edge{
					FromID: ids[i],
					ToID:   ids[j],
					Type:   EdgeTypeTransfer,
					Cost:   DeepCost{TimeSeconds: 300}, // Default 5 min transfer
				})
				transferCount++
			}
		}
		slog.Debug("Generated transfers for station", "name", name, "count", len(ids))
	}

	slog.Info("Graph Built Successfully",
		"nodes", len(g.Nodes),
		"transfers", transferCount,
		"latency", time.Since(start))
	return g, nil
}

// Data Structures for JSON Unmarshal

type railwayRecord struct {
	ID           string          `json:"id"`
	StationOrder json.RawMessage `json:"station_order"`
	Operator     string          `json:"operator"`
}

type stationRecord struct {
	ID      string  `json:"id"`
	TitleEn string  `json:"title_en"`
	TitleJa string  `json:"title_ja"`
	Lat     float64 `json:"lat"`
	Long    float64 `json:"long"`
}

// Helpers

func (l *Loader) fetchRailways(ctx context.Context) ([]railwayRecord, error) {
	params := map[string]string{"select": "id,station_order,operator"}
	data, err := l.client.Query(ctx, "static_railways", params)
	if err != nil {
		return nil, fmt.Errorf("failed to query static_railways: %w", err)
	}

	var records []railwayRecord
	if err := json.Unmarshal(data, &records); err != nil {
		return nil, fmt.Errorf("failed to unmarshal railways: %w", err)
	}
	return records, nil
}

func (l *Loader) fetchStations(ctx context.Context) (map[string]stationRecord, error) {
	params := map[string]string{"select": "id,title_en,title_ja,lat,long"}
	data, err := l.client.Query(ctx, "static_stations", params)
	if err != nil {
		return nil, fmt.Errorf("failed to query static_stations: %w", err)
	}

	var records []stationRecord
	if err := json.Unmarshal(data, &records); err != nil {
		return nil, fmt.Errorf("failed to unmarshal stations: %w", err)
	}

	result := make(map[string]stationRecord)
	for _, r := range records {
		result[r.ID] = r
	}
	return result, nil
}
