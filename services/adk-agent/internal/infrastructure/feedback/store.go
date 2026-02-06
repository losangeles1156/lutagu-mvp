package feedback

import (
	"context"
	"encoding/json"
	"time"

	"github.com/lutagu/adk-agent/internal/infrastructure/cache"
	"github.com/lutagu/adk-agent/internal/infrastructure/supabase"
)

type Store struct {
	supa  *supabase.Client
	redis *cache.RedisStore
}

type Event struct {
	TraceID    string
	UserID     string
	SessionID  string
	Locale     string
	Query      string
	Response   string
	Helpful    bool
	IntentTags []string
	NodeID     string
}

func NewStore(supa *supabase.Client, redis *cache.RedisStore) *Store {
	return &Store{supa: supa, redis: redis}
}

func (s *Store) Record(ctx context.Context, event Event) error {
	if s == nil || s.supa == nil {
		return nil
	}
	payload := []map[string]interface{}{{
		"trace_id":    event.TraceID,
		"user_id":     event.UserID,
		"session_id":  event.SessionID,
		"locale":      event.Locale,
		"query":       event.Query,
		"response":    event.Response,
		"helpful":     event.Helpful,
		"intent_tags": event.IntentTags,
		"node_id":     event.NodeID,
		"created_at":  time.Now().UTC().Format(time.RFC3339),
	}}
	_, err := s.supa.Upsert(ctx, "agent_feedback_events", payload, "")
	return err
}

func (s *Store) SaveWeights(ctx context.Context, weights map[string]float64) error {
	if s == nil || len(weights) == 0 {
		return nil
	}
	if s.redis != nil {
		if payload, err := json.Marshal(weights); err == nil {
			_ = s.redis.Set(ctx, "agent:feedback:weights:v1", string(payload), 0)
		}
	}
	if s.supa == nil {
		return nil
	}

	rows := make([]map[string]interface{}, 0, len(weights))
	now := time.Now().UTC().Format(time.RFC3339)
	for tag, weight := range weights {
		rows = append(rows, map[string]interface{}{
			"tag":        tag,
			"weight":     weight,
			"updated_at": now,
		})
	}
	_, err := s.supa.Upsert(ctx, "agent_feedback_weights", rows, "tag")
	return err
}

func (s *Store) LoadWeights(ctx context.Context) (map[string]float64, error) {
	if s == nil {
		return map[string]float64{}, nil
	}
	if s.redis != nil {
		if raw, err := s.redis.Get(ctx, "agent:feedback:weights:v1"); err == nil && raw != "" {
			var cached map[string]float64
			if jsonErr := json.Unmarshal([]byte(raw), &cached); jsonErr == nil && len(cached) > 0 {
				return cached, nil
			}
		}
	}
	if s.supa == nil {
		return map[string]float64{}, nil
	}

	resp, err := s.supa.Query(ctx, "agent_feedback_weights", map[string]string{
		"select": "tag,weight",
		"limit":  "500",
	})
	if err != nil {
		return nil, err
	}
	var rows []struct {
		Tag    string  `json:"tag"`
		Weight float64 `json:"weight"`
	}
	if err := json.Unmarshal(resp, &rows); err != nil {
		return nil, err
	}

	out := make(map[string]float64, len(rows))
	for _, r := range rows {
		if r.Tag == "" {
			continue
		}
		out[r.Tag] = r.Weight
	}
	if len(out) > 0 && s.redis != nil {
		if payload, err := json.Marshal(out); err == nil {
			_ = s.redis.Set(ctx, "agent:feedback:weights:v1", string(payload), 0)
		}
	}
	return out, nil
}
