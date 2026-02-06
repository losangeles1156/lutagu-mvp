package memory

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/lutagu/adk-agent/internal/agent"
	"github.com/lutagu/adk-agent/internal/infrastructure/cache"
	"github.com/lutagu/adk-agent/internal/infrastructure/supabase"
)

const (
	GuestScope  = "guest"
	MemberScope = "member"
)

type Turn struct {
	Role      string `json:"role"`
	Content   string `json:"content"`
	Timestamp string `json:"timestamp"`
}

type Profile struct {
	UserID           string   `json:"user_id"`
	SessionID        string   `json:"session_id"`
	Scope            string   `json:"scope"`
	Locale           string   `json:"locale,omitempty"`
	Summary          string   `json:"summary"`
	Preferences      []string `json:"preferences,omitempty"`
	FrequentStations []string `json:"frequent_stations,omitempty"`
	Constraints      []string `json:"constraints,omitempty"`
	Goals            []string `json:"goals,omitempty"`
	TurnCount        int      `json:"turn_count"`
	UpdatedAt        string   `json:"updated_at"`
	RecentTurns      []Turn   `json:"recent_turns,omitempty"`
}

type Store struct {
	redis         *cache.RedisStore
	supa          *supabase.Client
	guestTTL      time.Duration
	memberHotTTL  time.Duration
	persistEveryN int
}

type Options struct {
	GuestTTLHours      int
	MemberHotTTLHours  int
	PersistEveryNTurns int
}

type SaveTurnInput struct {
	Scope         string
	UserID        string
	SessionID     string
	Locale        string
	LastUser      string
	LastAssistant string
	ForcePersist  bool
}

func NewStore(redisStore *cache.RedisStore, supabaseClient *supabase.Client, opts Options) *Store {
	guestTTL := time.Duration(max(opts.GuestTTLHours, 24)) * time.Hour
	memberHotTTL := time.Duration(max(opts.MemberHotTTLHours, 24*7)) * time.Hour
	persistN := max(opts.PersistEveryNTurns, 6)
	return &Store{
		redis:         redisStore,
		supa:          supabaseClient,
		guestTTL:      guestTTL,
		memberHotTTL:  memberHotTTL,
		persistEveryN: persistN,
	}
}

func (s *Store) LoadProfile(ctx context.Context, scope, userID, sessionID string) (*Profile, error) {
	if s.redis == nil {
		return s.loadFromSupabase(ctx, scope, userID)
	}

	key := s.redisKey(scope, userID, sessionID)
	raw, err := s.redis.Get(ctx, key)
	if err == nil {
		var profile Profile
		if unmarshalErr := json.Unmarshal([]byte(raw), &profile); unmarshalErr == nil {
			return &profile, nil
		}
	}

	profile, supaErr := s.loadFromSupabase(ctx, scope, userID)
	if supaErr != nil || profile == nil {
		return profile, supaErr
	}

	_ = s.saveRedis(ctx, profile)
	return profile, nil
}

func (s *Store) SaveTurn(ctx context.Context, input SaveTurnInput) error {
	if input.LastUser == "" && input.LastAssistant == "" {
		return nil
	}

	scope := normalizeScope(input.Scope)
	profile, _ := s.LoadProfile(ctx, scope, input.UserID, input.SessionID)
	if profile == nil {
		profile = &Profile{UserID: input.UserID, SessionID: input.SessionID, Scope: scope}
	}

	profile.Locale = input.Locale
	profile.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	profile.TurnCount += 1

	if input.LastUser != "" {
		profile.RecentTurns = append(profile.RecentTurns, Turn{Role: "user", Content: input.LastUser, Timestamp: profile.UpdatedAt})
	}
	if input.LastAssistant != "" {
		profile.RecentTurns = append(profile.RecentTurns, Turn{Role: "assistant", Content: input.LastAssistant, Timestamp: profile.UpdatedAt})
	}
	if len(profile.RecentTurns) > 12 {
		profile.RecentTurns = profile.RecentTurns[len(profile.RecentTurns)-12:]
	}

	profile.Summary = summarizeConversation(profile.Summary, input.LastUser, input.LastAssistant)
	profile.Preferences = mergeHints(profile.Preferences, extractHints(input.LastUser, []string{"想", "喜歡", "不要", "avoid", "prefer"}))
	profile.Constraints = mergeHints(profile.Constraints, extractHints(input.LastUser, []string{"不", "不要", "不能", "must", "need"}))
	profile.Goals = mergeHints(profile.Goals, extractHints(input.LastUser, []string{"我要", "目標", "趕", "arrive", "airport", "機場"}))
	profile.FrequentStations = mergeHints(profile.FrequentStations, extractStationHints(input.LastUser))

	if s.redis != nil {
		if err := s.saveRedis(ctx, profile); err != nil {
			return err
		}
	}

	if scope == MemberScope && s.supa != nil && (input.ForcePersist || profile.TurnCount%s.persistEveryN == 0) {
		_ = s.persistMemberProfile(ctx, profile)
	}

	return nil
}

func (s *Store) DeleteMemberMemory(ctx context.Context, userID string) error {
	if userID == "" {
		return nil
	}
	if s.supa != nil {
		_ = s.supa.Delete(ctx, "agent_memory_profiles", map[string]string{"user_id": fmt.Sprintf("eq.%s", userID)})
	}
	if s.redis != nil {
		_ = s.redis.Set(ctx, s.redisKey(MemberScope, userID, ""), "", time.Second)
	}
	return nil
}

func (s *Store) BuildContextMessage(profile *Profile, locale string) *agent.Message {
	if profile == nil {
		return nil
	}

	summary := strings.TrimSpace(profile.Summary)
	if summary == "" && len(profile.Preferences) == 0 && len(profile.Goals) == 0 {
		return nil
	}

	builder := strings.Builder{}
	builder.WriteString("[Memory Context]\n")
	if summary != "" {
		builder.WriteString("Summary: ")
		builder.WriteString(summary)
		builder.WriteString("\n")
	}
	if len(profile.Preferences) > 0 {
		builder.WriteString("Preferences: ")
		builder.WriteString(strings.Join(profile.Preferences, "; "))
		builder.WriteString("\n")
	}
	if len(profile.Constraints) > 0 {
		builder.WriteString("Constraints: ")
		builder.WriteString(strings.Join(profile.Constraints, "; "))
		builder.WriteString("\n")
	}
	if len(profile.Goals) > 0 {
		builder.WriteString("Goals: ")
		builder.WriteString(strings.Join(profile.Goals, "; "))
		builder.WriteString("\n")
	}
	if len(profile.FrequentStations) > 0 {
		builder.WriteString("Frequent Stations: ")
		builder.WriteString(strings.Join(profile.FrequentStations, ", "))
		builder.WriteString("\n")
	}
	builder.WriteString("Use this only as preference context, prioritize current request.")

	return &agent.Message{Role: "system", Content: builder.String()}
}

func (s *Store) saveRedis(ctx context.Context, profile *Profile) error {
	if s.redis == nil || profile == nil {
		return nil
	}
	payload, err := json.Marshal(profile)
	if err != nil {
		return err
	}
	return s.redis.Set(ctx, s.redisKey(profile.Scope, profile.UserID, profile.SessionID), string(payload), s.ttlForScope(profile.Scope))
}

func (s *Store) loadFromSupabase(ctx context.Context, scope, userID string) (*Profile, error) {
	if scope != MemberScope || s.supa == nil || userID == "" {
		return nil, nil
	}

	resp, err := s.supa.Query(ctx, "agent_memory_profiles", map[string]string{
		"user_id":    fmt.Sprintf("eq.%s", userID),
		"expires_at": fmt.Sprintf("gte.%s", time.Now().UTC().Format(time.RFC3339)),
		"select":     "user_id,summary,preferences,frequent_stations,constraints,goals,updated_at,locale",
		"limit":      "1",
	})
	if err != nil {
		return nil, err
	}

	var rows []struct {
		UserID           string   `json:"user_id"`
		Summary          string   `json:"summary"`
		Preferences      []string `json:"preferences"`
		FrequentStations []string `json:"frequent_stations"`
		Constraints      []string `json:"constraints"`
		Goals            []string `json:"goals"`
		UpdatedAt        string   `json:"updated_at"`
		Locale           string   `json:"locale"`
	}
	if err := json.Unmarshal(resp, &rows); err != nil || len(rows) == 0 {
		return nil, err
	}

	row := rows[0]
	return &Profile{
		UserID:           row.UserID,
		Scope:            MemberScope,
		Summary:          row.Summary,
		Preferences:      row.Preferences,
		FrequentStations: row.FrequentStations,
		Constraints:      row.Constraints,
		Goals:            row.Goals,
		UpdatedAt:        row.UpdatedAt,
		Locale:           row.Locale,
	}, nil
}

func (s *Store) persistMemberProfile(ctx context.Context, profile *Profile) error {
	payload := []map[string]interface{}{{
		"user_id":           profile.UserID,
		"summary":           profile.Summary,
		"preferences":       profile.Preferences,
		"frequent_stations": profile.FrequentStations,
		"constraints":       profile.Constraints,
		"goals":             profile.Goals,
		"updated_at":        profile.UpdatedAt,
		"locale":            profile.Locale,
		"expires_at":        time.Now().UTC().Add(180 * 24 * time.Hour).Format(time.RFC3339),
	}}

	_, err := s.supa.Upsert(ctx, "agent_memory_profiles", payload, "user_id")
	return err
}

func (s *Store) redisKey(scope, userID, sessionID string) string {
	scope = normalizeScope(scope)
	if scope == MemberScope {
		return fmt.Sprintf("memory:member:%s", userID)
	}
	return fmt.Sprintf("memory:guest:%s", sessionID)
}

func normalizeScope(scope string) string {
	if strings.EqualFold(scope, MemberScope) {
		return MemberScope
	}
	return GuestScope
}

func (s *Store) ttlForScope(scope string) time.Duration {
	if normalizeScope(scope) == MemberScope {
		return s.memberHotTTL
	}
	return s.guestTTL
}

func summarizeConversation(existingSummary, lastUser, lastAssistant string) string {
	segments := []string{}
	if existingSummary != "" {
		segments = append(segments, existingSummary)
	}
	if lastUser != "" {
		segments = append(segments, "User: "+truncate(lastUser, 120))
	}
	if lastAssistant != "" {
		segments = append(segments, "Assistant: "+truncate(lastAssistant, 120))
	}
	joined := strings.Join(segments, " | ")
	return truncate(joined, 400)
}

func mergeHints(existing, incoming []string) []string {
	seen := map[string]bool{}
	result := make([]string, 0, len(existing)+len(incoming))
	for _, v := range append(existing, incoming...) {
		vv := strings.TrimSpace(v)
		if vv == "" || seen[vv] {
			continue
		}
		seen[vv] = true
		result = append(result, vv)
	}
	if len(result) > 8 {
		return result[len(result)-8:]
	}
	return result
}

func extractHints(text string, anchors []string) []string {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}
	lower := strings.ToLower(text)
	for _, a := range anchors {
		if strings.Contains(lower, strings.ToLower(a)) {
			return []string{truncate(text, 80)}
		}
	}
	return nil
}

func extractStationHints(text string) []string {
	stations := []string{"上野", "銀座", "東京", "新宿", "渋谷", "Shinjuku", "Tokyo", "Ueno", "Ginza"}
	res := []string{}
	for _, s := range stations {
		if strings.Contains(strings.ToLower(text), strings.ToLower(s)) {
			res = append(res, s)
		}
	}
	return res
}

func truncate(s string, n int) string {
	r := []rune(strings.TrimSpace(s))
	if len(r) <= n {
		return strings.TrimSpace(s)
	}
	return string(r[:n]) + "..."
}

func max(v, fallback int) int {
	if v <= 0 {
		return fallback
	}
	return v
}
