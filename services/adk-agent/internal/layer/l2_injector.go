package layer

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/lutagu/adk-agent/internal/infrastructure/odpt"
)

// L2Injector fetches and injects L2 disruption status into planning context
type L2Injector struct {
	odptClient *odpt.Client
	cache      *l2Cache
	ttl        time.Duration
}

type l2Cache struct {
	data      []odpt.SimplifiedStatus
	timestamp time.Time
}

// L2Context contains the processed L2 status for injection
type L2Context struct {
	HasDisruption   bool
	DisruptedLines  []DisruptedLine
	NormalLines     int
	Summary         string
	LastUpdated     time.Time
}

// DisruptedLine represents a line with issues
type DisruptedLine struct {
	Railway   string
	RailwayID string
	Status    string // "suspended", "delay"
	Text      string
	Severity  int // 1=minor, 2=moderate, 3=severe
}

// NewL2Injector creates a new L2 status injector
func NewL2Injector(odptClient *odpt.Client) *L2Injector {
	return &L2Injector{
		odptClient: odptClient,
		ttl:        30 * time.Second,
	}
}

// Fetch retrieves current L2 status with caching
func (l *L2Injector) Fetch(ctx context.Context) (*L2Context, error) {
	// Check cache
	if l.cache != nil && time.Since(l.cache.timestamp) < l.ttl {
		return l.processStatus(l.cache.data), nil
	}

	// Fetch fresh data
	status, err := l.odptClient.FetchTrainStatus()
	if err != nil {
		// If we have cached data, use it as fallback
		if l.cache != nil {
			return l.processStatus(l.cache.data), nil
		}
		return nil, fmt.Errorf("failed to fetch L2 status: %w", err)
	}

	// Update cache
	l.cache = &l2Cache{
		data:      status,
		timestamp: time.Now(),
	}

	return l.processStatus(status), nil
}

func (l *L2Injector) processStatus(rawStatus []odpt.SimplifiedStatus) *L2Context {
	ctx := &L2Context{
		LastUpdated: time.Now(),
	}

	var disrupted []DisruptedLine
	normalCount := 0

	for _, s := range rawStatus {
		switch s.Status {
		case "suspended":
			disrupted = append(disrupted, DisruptedLine{
				Railway:   extractRailwayName(s.Railway),
				RailwayID: s.Railway,
				Status:    "suspended",
				Text:      s.Text,
				Severity:  3,
			})
		case "delay":
			disrupted = append(disrupted, DisruptedLine{
				Railway:   extractRailwayName(s.Railway),
				RailwayID: s.Railway,
				Status:    "delay",
				Text:      s.Text,
				Severity:  2,
			})
		case "normal":
			normalCount++
		}
	}

	ctx.DisruptedLines = disrupted
	ctx.NormalLines = normalCount
	ctx.HasDisruption = len(disrupted) > 0
	ctx.Summary = l.generateSummary(disrupted)

	return ctx
}

func (l *L2Injector) generateSummary(disrupted []DisruptedLine) string {
	if len(disrupted) == 0 {
		return "All lines are operating normally."
	}

	var parts []string
	suspendedCount := 0
	delayCount := 0

	for _, d := range disrupted {
		if d.Status == "suspended" {
			suspendedCount++
		} else {
			delayCount++
		}
	}

	if suspendedCount > 0 {
		lines := make([]string, 0, suspendedCount)
		for _, d := range disrupted {
			if d.Status == "suspended" {
				lines = append(lines, d.Railway)
			}
		}
		parts = append(parts, fmt.Sprintf("⛔ SUSPENDED: %s", strings.Join(lines, ", ")))
	}

	if delayCount > 0 {
		lines := make([]string, 0, delayCount)
		for _, d := range disrupted {
			if d.Status == "delay" {
				lines = append(lines, d.Railway)
			}
		}
		parts = append(parts, fmt.Sprintf("⚠️ DELAYED: %s", strings.Join(lines, ", ")))
	}

	return strings.Join(parts, " | ")
}

// ForSystemPrompt formats L2 context for injection into LLM system prompt
func (l *L2Injector) ForSystemPrompt(ctx *L2Context) string {
	if ctx == nil || !ctx.HasDisruption {
		return ""
	}

	var sb strings.Builder
	sb.WriteString("\n⚠️ CURRENT TRAIN DISRUPTIONS:\n")
	
	for _, d := range ctx.DisruptedLines {
		if d.Status == "suspended" {
			sb.WriteString(fmt.Sprintf("- ⛔ %s: SERVICE SUSPENDED - %s\n", d.Railway, d.Text))
		} else {
			sb.WriteString(fmt.Sprintf("- ⚠️ %s: DELAYS - %s\n", d.Railway, d.Text))
		}
	}
	
	sb.WriteString("\nIMPORTANT: Avoid suggesting routes using suspended lines. Mention delays if recommending affected lines.\n")
	
	return sb.String()
}

// GetDisruptedRailwayIDs returns IDs of disrupted railways for route filtering
func (l *L2Injector) GetDisruptedRailwayIDs(ctx *L2Context) []string {
	if ctx == nil {
		return nil
	}
	
	ids := make([]string, 0, len(ctx.DisruptedLines))
	for _, d := range ctx.DisruptedLines {
		if d.Status == "suspended" {
			ids = append(ids, d.RailwayID)
		}
	}
	return ids
}

func extractRailwayName(railwayURI string) string {
	// Extract readable name from URI like "odpt.Railway:TokyoMetro.Ginza"
	parts := strings.Split(railwayURI, ".")
	if len(parts) >= 2 {
		return parts[len(parts)-1]
	}
	return railwayURI
}
