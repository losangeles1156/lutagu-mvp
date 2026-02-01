package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
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
		return nil, err
	}

	reqURL := fmt.Sprintf("%s?from=%s&to=%s&max_hops=5", t.RoutingURL, url.QueryEscape(args.Original), url.QueryEscape(args.Destination))
	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
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
		return nil, err
	}
	return json.Marshal(map[string]string{"status": status})
}
