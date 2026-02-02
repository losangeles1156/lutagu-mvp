package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// SearchRouteTool implements the adk.Tool interface for finding transit routes
type SearchRouteTool struct {
	RoutingURL string
}

func (t *SearchRouteTool) Name() string {
	return "search_route"
}

func (t *SearchRouteTool) Description() string {
	return "Find the best transit route between two stations in Tokyo."
}

func (t *SearchRouteTool) Parameters() json.RawMessage {
	return json.RawMessage(`{
		"type": "object",
		"properties": {
			"original": {"type": "string", "description": "Origin station name (e.g. Tokyo Station)"},
			"destination": {"type": "string", "description": "Destination station name (e.g. Shinjuku Station)"}
		},
		"required": ["original", "destination"]
	}`)
}

func (t *SearchRouteTool) IsLongRunning() bool {
	return false
}

func (t *SearchRouteTool) Run(ctx context.Context, input json.RawMessage) (json.RawMessage, error) {
	var args struct {
		Original    string `json:"original"`
		Destination string `json:"destination"`
	}
	if err := json.Unmarshal(input, &args); err != nil {
		return nil, fmt.Errorf("invalid arguments: %w", err)
	}

	reqURL := fmt.Sprintf("%s?from=%s&to=%s&max_hops=5", t.RoutingURL, url.QueryEscape(args.Original), url.QueryEscape(args.Destination))

	// [Fix] Enforce timeout and use context
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("routing service unavailable: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("routing service returned error: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	return json.RawMessage(body), nil
}

// GetTrainStatusTool implements the adk.Tool interface for transit status
type GetTrainStatusTool struct {
	FetchFunc func() (string, error)
}

func (t *GetTrainStatusTool) Name() string {
	return "get_train_status"
}

func (t *GetTrainStatusTool) Description() string {
	return "Get real-time operation status of Tokyo train lines."
}

func (t *GetTrainStatusTool) Parameters() json.RawMessage {
	return json.RawMessage(`{
		"type": "object",
		"properties": {}
	}`)
}

func (t *GetTrainStatusTool) IsLongRunning() bool {
	return false
}

func (t *GetTrainStatusTool) Run(ctx context.Context, input json.RawMessage) (json.RawMessage, error) {
	status, err := t.FetchFunc()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch status: %w", err)
	}
	return json.Marshal(map[string]string{"status": status})
}

// GetTimetableTool implements the adk.Tool interface for querying static timetables
type GetTimetableTool struct {
	Client interface {
		Query(ctx context.Context, table string, params map[string]string) ([]byte, error)
	}
}

func (t *GetTimetableTool) Name() string {
	return "get_timetable"
}

func (t *GetTimetableTool) Description() string {
	return "Get the official timetable for a specific station (e.g. odpt.Station:...). use this tool to answer questions about next train."
}

func (t *GetTimetableTool) Parameters() json.RawMessage {
	return json.RawMessage(`{
		"type": "object",
		"properties": {
			"station_id": {"type": "string", "description": "The ODPT Station ID (e.g. odpt.Station:TokyoMetro.Ginza.Ginza)"}
		},
		"required": ["station_id"]
	}`)
}

func (t *GetTimetableTool) IsLongRunning() bool {
	return false
}

func (t *GetTimetableTool) Run(ctx context.Context, input json.RawMessage) (json.RawMessage, error) {
	var args struct {
		StationID string `json:"station_id"`
	}
	if err := json.Unmarshal(input, &args); err != nil {
		return nil, fmt.Errorf("invalid arguments: %w", err)
	}

	if t.Client == nil {
		return nil, fmt.Errorf("timetable database client not initialized")
	}

	// Calculate current time for context or just fetch all?
	// Fetching all might be too large (JSONB).
	// But our API returns the full array.
	// Let's rely on the client to filter if needed, but here we just get the record by ID.
	// Supabase Query: station_id=eq.X

	params := map[string]string{
		"station_id": fmt.Sprintf("eq.%s", args.StationID),
		"select":     "data",
	}

	data, err := t.Client.Query(ctx, "static_timetables", params)
	if err != nil {
		return nil, fmt.Errorf("failed to query timetable: %w", err)
	}

	// The result is an array of records: [{"data": [...]}] or empty []
	var result []struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse db response: %w", err)
	}

	if len(result) == 0 {
		// FALLBACK: Generate Yahoo Transit Search Link for JR/Private lines
		// We use the raw station ID potentially, but ideally we parse the name.
		// However, args.StationID often looks like "odpt.Station:JR.East.Shinjuku".
		// We can extract "Shinjuku" from it or let the prompt handle it?
		// The tool only gets "station_id".
		// Let's assume the Agent (GeneralAgent) passes the ID.
		// A simple regex or string split can extract the name if it's formatted well.
		// Format: odpt.Station:Operator.Line.Name
		// Extraction logic: Split by '.', take last part? "Shinjuku".
		// Note: Romeji might not work well for Yahoo Search (expects Kanji usually), but Yahoo often handles Romaji/English.
		// Better: Return a generic message asking user to use the link.

		encodedID := url.QueryEscape(args.StationID)
		searchURL := fmt.Sprintf("https://transit.yahoo.co.jp/station/time/search?q=%s", encodedID)

		// Return a structured JSON that the AI can interpret
		fallbackJSON := map[string]string{
			"status":  "not_in_database",
			"message": "This appears to be a JR or Private line station. Official data is not available in local database.",
			"action":  "Please provide this external link to the user.",
			"url":     searchURL,
		}
		return json.Marshal(fallbackJSON)
	}

	// Just return the inner data
	return result[0].Data, nil
}
