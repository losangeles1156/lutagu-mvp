package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/jsonschema-go/jsonschema"
	"github.com/lutagu/adk-agent/internal/infrastructure/odpt"
	"google.golang.org/adk/tool"
	"google.golang.org/adk/tool/functiontool"
)

type currentTimeArgs struct {
	Timezone string `json:"timezone"`
}

func NewGetCurrentTimeFunctionTool() tool.Tool {
	fn, err := functiontool.New(functiontool.Config{
		Name:        "get_current_time",
		Description: "Get current date/time in JST (or requested timezone) and Japan holiday context.",
		InputSchema: &jsonschema.Schema{
			Type: "object",
			Properties: map[string]*jsonschema.Schema{
				"timezone": {Type: "string", Description: "IANA timezone, default Asia/Tokyo"},
			},
		},
	}, func(ctx tool.Context, args currentTimeArgs) (map[string]interface{}, error) {
		tz := strings.TrimSpace(args.Timezone)
		if tz == "" {
			tz = "Asia/Tokyo"
		}
		loc, err := time.LoadLocation(tz)
		if err != nil {
			loc, _ = time.LoadLocation("Asia/Tokyo")
			tz = "Asia/Tokyo"
		}
		now := time.Now().In(loc)
		holidayName, isHoliday := japanHoliday(now)
		return map[string]interface{}{
			"timezone":         tz,
			"now_iso":          now.Format(time.RFC3339),
			"date":             now.Format("2006-01-02"),
			"time_24h":         now.Format("15:04"),
			"weekday_en":       now.Weekday().String(),
			"weekday_zh_tw":    toWeekdayZH(now.Weekday()),
			"is_japan_holiday": isHoliday,
			"holiday_name":     holidayName,
		}, nil
	})
	if err != nil {
		panic(fmt.Sprintf("failed to create get_current_time tool: %v", err))
	}
	return fn
}

type searchRouteArgs struct {
	Original    string `json:"original"`
	Destination string `json:"destination"`
}

func NewSearchRouteFunctionTool(routingURL string) tool.Tool {
	fn, err := functiontool.New(functiontool.Config{
		Name:        "search_route",
		Description: "Find the best transit route between two stations in Tokyo.",
		InputSchema: &jsonschema.Schema{
			Type: "object",
			Properties: map[string]*jsonschema.Schema{
				"original":    {Type: "string", Description: "Origin station name"},
				"destination": {Type: "string", Description: "Destination station name"},
			},
			Required: []string{"original", "destination"},
		},
	}, func(ctx tool.Context, args searchRouteArgs) (map[string]interface{}, error) {
		reqURL := fmt.Sprintf("%s?from=%s&to=%s&max_hops=5", routingURL, url.QueryEscape(args.Original), url.QueryEscape(args.Destination))
		client := &http.Client{Timeout: 10 * time.Second}
		req, err := http.NewRequestWithContext(context.Background(), "GET", reqURL, nil)
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
		var payload map[string]interface{}
		if err := json.Unmarshal(body, &payload); err != nil {
			return nil, fmt.Errorf("invalid routing response: %w", err)
		}
		return payload, nil
	})
	if err != nil {
		panic(fmt.Sprintf("failed to create search_route tool: %v", err))
	}
	return fn
}

type trainStatusArgs struct {
	Lines       []string `json:"lines"`
	SeverityMin int      `json:"severity_min"`
	Limit       int      `json:"limit"`
}

func NewGetTrainStatusFunctionTool(odptClient *odpt.Client) tool.Tool {
	fn, err := functiontool.New(functiontool.Config{
		Name:        "get_train_status",
		Description: "Get real-time operation status of Tokyo train lines.",
		InputSchema: &jsonschema.Schema{
			Type: "object",
			Properties: map[string]*jsonschema.Schema{
				"lines":        {Type: "array", Items: &jsonschema.Schema{Type: "string"}},
				"severity_min": {Type: "integer", Description: "1 normal, 2 delayed, 3 suspended", Default: json.RawMessage(`2`)},
				"limit":        {Type: "integer", Description: "Maximum number of anomalies", Default: json.RawMessage(`5`)},
			},
		},
	}, func(ctx tool.Context, args trainStatusArgs) (map[string]interface{}, error) {
		if args.SeverityMin <= 0 {
			args.SeverityMin = 2
		}
		if args.Limit <= 0 || args.Limit > 10 {
			args.Limit = 5
		}
		if odptClient == nil {
			return map[string]interface{}{"message": "ODPT client not configured."}, nil
		}
		statusList, err := odptClient.FetchTrainStatus()
		if err != nil {
			return nil, fmt.Errorf("failed to fetch status: %w", err)
		}
		anomalies := []map[string]interface{}{}
		for _, s := range statusList {
			sev := severityFromStatus(s.Status)
			if sev < args.SeverityMin {
				continue
			}
			if len(args.Lines) > 0 && !containsAny(strings.ToLower(s.Railway), args.Lines) {
				continue
			}
			anomalies = append(anomalies, map[string]interface{}{
				"line":     s.Railway,
				"status":   s.Status,
				"severity": sev,
				"summary":  truncateText(s.Text, 80),
			})
		}
		if len(anomalies) > args.Limit {
			anomalies = anomalies[:args.Limit]
		}
		out := map[string]interface{}{
			"generated_at":  time.Now().UTC().Format(time.RFC3339),
			"anomaly_count": len(anomalies),
			"anomalies":     anomalies,
		}
		if len(anomalies) == 0 {
			out["message"] = "All lines are operating normally."
		}
		return out, nil
	})
	if err != nil {
		panic(fmt.Sprintf("failed to create get_train_status tool: %v", err))
	}
	return fn
}

type timetableArgs struct {
	StationID string `json:"station_id"`
	Direction string `json:"direction"`
	FromTime  string `json:"from_time"`
	Limit     int    `json:"limit"`
}

func NewGetTimetableFunctionTool(client interface {
	Query(ctx context.Context, table string, params map[string]string) ([]byte, error)
}) tool.Tool {
	fn, err := functiontool.New(functiontool.Config{
		Name:        "get_timetable",
		Description: "Get official timetable for a station.",
		InputSchema: &jsonschema.Schema{
			Type: "object",
			Properties: map[string]*jsonschema.Schema{
				"station_id": {Type: "string", Description: "ODPT station id"},
				"direction":  {Type: "string"},
				"from_time":  {Type: "string"},
				"limit":      {Type: "integer", Default: json.RawMessage(`3`)},
			},
			Required: []string{"station_id"},
		},
	}, func(ctx tool.Context, args timetableArgs) (map[string]interface{}, error) {
		if client == nil {
			return nil, fmt.Errorf("timetable client not initialized")
		}
		if args.Limit <= 0 || args.Limit > 10 {
			args.Limit = 3
		}
		params := map[string]string{
			"station_id": fmt.Sprintf("eq.%s", args.StationID),
			"select":     "data",
		}
		data, err := client.Query(context.Background(), "static_timetables", params)
		if err != nil {
			return nil, fmt.Errorf("failed to query timetable: %w", err)
		}
		var result []struct {
			Data json.RawMessage `json:"data"`
		}
		if err := json.Unmarshal(data, &result); err != nil {
			return nil, fmt.Errorf("failed to parse db response: %w", err)
		}
		if len(result) == 0 {
			encodedID := url.QueryEscape(args.StationID)
			searchURL := fmt.Sprintf("https://transit.yahoo.co.jp/station/time/search?q=%s", encodedID)
			return map[string]interface{}{
				"status":  "not_in_database",
				"message": "Official data not available in local database.",
				"url":     searchURL,
			}, nil
		}
		times := collectDepartures(result[0].Data, args.Direction, args.FromTime, args.Limit)
		return map[string]interface{}{
			"station_id":  args.StationID,
			"direction":   args.Direction,
			"from_time":   args.FromTime,
			"count":       len(times),
			"next_trains": times,
		}, nil
	})
	if err != nil {
		panic(fmt.Sprintf("failed to create get_timetable tool: %v", err))
	}
	return fn
}
