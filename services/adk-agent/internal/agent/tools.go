package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

// SearchRouteTool implements the adk.Tool interface for finding transit routes
type SearchRouteTool struct {
	RoutingURL string
}

// GetCurrentTimeTool provides current time/date and JP holiday context.
type GetCurrentTimeTool struct{}

func (t *GetCurrentTimeTool) Name() string {
	return "get_current_time"
}

func (t *GetCurrentTimeTool) Description() string {
	return "Get current date/time in JST (or requested timezone) and Japan holiday context."
}

func (t *GetCurrentTimeTool) Parameters() json.RawMessage {
	return json.RawMessage(`{
		"type": "object",
		"properties": {
			"timezone": {"type": "string", "description": "IANA timezone, default Asia/Tokyo"}
		}
	}`)
}

func (t *GetCurrentTimeTool) IsLongRunning() bool {
	return false
}

func (t *GetCurrentTimeTool) Run(ctx context.Context, input json.RawMessage) (json.RawMessage, error) {
	var args struct {
		Timezone string `json:"timezone"`
	}
	_ = json.Unmarshal(input, &args)

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

	payload := map[string]interface{}{
		"timezone":         tz,
		"now_iso":          now.Format(time.RFC3339),
		"date":             now.Format("2006-01-02"),
		"time_24h":         now.Format("15:04"),
		"weekday_en":       now.Weekday().String(),
		"weekday_zh_tw":    toWeekdayZH(now.Weekday()),
		"is_japan_holiday": isHoliday,
		"holiday_name":     holidayName,
	}

	return json.Marshal(payload)
}

func toWeekdayZH(w time.Weekday) string {
	weekdays := []string{"星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"}
	return weekdays[int(w)]
}

func japanHoliday(t time.Time) (string, bool) {
	key := t.Format("01-02")
	holidays := map[string]string{
		"01-01": "元日",
		"01-12": "成人の日",
		"02-11": "建国記念の日",
		"02-23": "天皇誕生日",
		"03-20": "春分の日",
		"04-29": "昭和の日",
		"05-03": "憲法記念日",
		"05-04": "みどりの日",
		"05-05": "こどもの日",
		"07-20": "海の日",
		"08-11": "山の日",
		"09-21": "敬老の日",
		"09-23": "秋分の日",
		"10-12": "スポーツの日",
		"11-03": "文化の日",
		"11-23": "勤労感謝の日",
	}

	name, ok := holidays[key]
	return name, ok
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
		"properties": {
			"lines": {"type": "array", "items": {"type": "string"}, "description": "Optional line keywords to filter"},
			"severity_min": {"type": "integer", "description": "1 normal, 2 delayed, 3 suspended", "default": 2},
			"limit": {"type": "integer", "description": "Maximum number of anomalies to return", "default": 5}
		}
	}`)
}

func (t *GetTrainStatusTool) IsLongRunning() bool {
	return false
}

func (t *GetTrainStatusTool) Run(ctx context.Context, input json.RawMessage) (json.RawMessage, error) {
	var args struct {
		Lines       []string `json:"lines"`
		SeverityMin int      `json:"severity_min"`
		Limit       int      `json:"limit"`
	}
	_ = json.Unmarshal(input, &args)
	if args.SeverityMin <= 0 {
		args.SeverityMin = 2
	}
	if args.Limit <= 0 || args.Limit > 10 {
		args.Limit = 5
	}

	status, err := t.FetchFunc()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch status: %w", err)
	}

	type row struct {
		Railway string `json:"railway"`
		Text    string `json:"text"`
		Status  string `json:"status"`
	}

	var parsed []row
	_ = json.Unmarshal([]byte(status), &parsed)

	anomalies := []map[string]interface{}{}
	for _, r := range parsed {
		sev := severityFromStatus(r.Status)
		if sev < args.SeverityMin {
			continue
		}
		if len(args.Lines) > 0 && !containsAny(strings.ToLower(r.Railway), args.Lines) {
			continue
		}
		anomalies = append(anomalies, map[string]interface{}{
			"line":     r.Railway,
			"status":   r.Status,
			"severity": sev,
			"summary":  truncateText(r.Text, 80),
		})
	}

	sort.SliceStable(anomalies, func(i, j int) bool {
		return anomalies[i]["severity"].(int) > anomalies[j]["severity"].(int)
	})

	if len(anomalies) > args.Limit {
		anomalies = anomalies[:args.Limit]
	}

	output := map[string]interface{}{
		"generated_at":  time.Now().UTC().Format(time.RFC3339),
		"anomaly_count": len(anomalies),
		"anomalies":     anomalies,
	}
	if len(anomalies) == 0 {
		output["message"] = "All lines are operating normally."
	}
	return json.Marshal(output)
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
			"station_id": {"type": "string", "description": "The ODPT Station ID (e.g. odpt.Station:TokyoMetro.Ginza.Ginza)"},
			"direction": {"type": "string", "description": "Optional rail direction filter"},
			"from_time": {"type": "string", "description": "Optional HH:MM floor"},
			"limit": {"type": "integer", "description": "Max departures to return", "default": 3}
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
		Direction string `json:"direction"`
		FromTime  string `json:"from_time"`
		Limit     int    `json:"limit"`
	}
	if err := json.Unmarshal(input, &args); err != nil {
		return nil, fmt.Errorf("invalid arguments: %w", err)
	}
	if args.Limit <= 0 || args.Limit > 10 {
		args.Limit = 3
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

	times := collectDepartures(result[0].Data, args.Direction, args.FromTime, args.Limit)
	output := map[string]interface{}{
		"station_id":  args.StationID,
		"direction":   args.Direction,
		"from_time":   args.FromTime,
		"count":       len(times),
		"next_trains": times,
	}
	return json.Marshal(output)
}

func containsAny(haystack string, needles []string) bool {
	for _, n := range needles {
		if strings.Contains(haystack, strings.ToLower(strings.TrimSpace(n))) {
			return true
		}
	}
	return false
}

func severityFromStatus(status string) int {
	s := strings.ToLower(status)
	switch {
	case strings.Contains(s, "suspend"), strings.Contains(s, "運休"), strings.Contains(s, "見合わせ"):
		return 3
	case strings.Contains(s, "delay"), strings.Contains(s, "遅"), strings.Contains(s, "延誤"), strings.Contains(s, "誤點"):
		return 2
	default:
		return 1
	}
}

func truncateText(s string, n int) string {
	r := []rune(strings.TrimSpace(s))
	if len(r) <= n {
		return string(r)
	}
	return string(r[:n]) + "..."
}

var hhmmRegex = regexp.MustCompile(`\b([01]?\d|2[0-3]):([0-5]\d)\b`)

func collectDepartures(data json.RawMessage, direction, fromTime string, limit int) []string {
	text := string(data)
	matches := hhmmRegex.FindAllString(text, -1)
	if len(matches) == 0 {
		return nil
	}
	uniq := map[string]bool{}
	filtered := []string{}
	minutesFloor := parseHHMM(fromTime)
	for _, m := range matches {
		if uniq[m] {
			continue
		}
		uniq[m] = true
		if minutesFloor >= 0 && parseHHMM(m) < minutesFloor {
			continue
		}
		filtered = append(filtered, m)
	}
	sort.SliceStable(filtered, func(i, j int) bool { return parseHHMM(filtered[i]) < parseHHMM(filtered[j]) })
	if len(filtered) > limit {
		filtered = filtered[:limit]
	}
	return filtered
}

func parseHHMM(v string) int {
	parts := strings.Split(v, ":")
	if len(parts) != 2 {
		return -1
	}
	h, errH := strconv.Atoi(parts[0])
	m, errM := strconv.Atoi(parts[1])
	if errH != nil || errM != nil {
		return -1
	}
	return h*60 + m
}
