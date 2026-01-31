package skill

import (
	"context"
	"log/slog"
	"sort"
	"sync"
)

// Registry manages skill registration and matching
type Registry struct {
	skills []Skill
	mu     sync.RWMutex
}

// NewRegistry creates a new skill registry
func NewRegistry() *Registry {
	return &Registry{
		skills: make([]Skill, 0),
	}
}

// Register adds a skill to the registry
func (r *Registry) Register(skill Skill) {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	r.skills = append(r.skills, skill)
	
	// Sort by priority (descending)
	sort.Slice(r.skills, func(i, j int) bool {
		return r.skills[i].Priority() > r.skills[j].Priority()
	})
	
	slog.Info("Skill registered", "name", skill.Name(), "priority", skill.Priority())
}

// MatchResult contains the result of skill matching
type MatchResult struct {
	Skill      Skill
	Confidence float64
}

// Match finds the best matching skill for the query
func (r *Registry) Match(ctx context.Context, query string, skillCtx SkillContext) *MatchResult {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	var bestMatch *MatchResult
	
	for _, skill := range r.skills {
		confidence := skill.CanHandle(ctx, query, skillCtx)
		if confidence > 0 {
			if bestMatch == nil || confidence > bestMatch.Confidence {
				bestMatch = &MatchResult{
					Skill:      skill,
					Confidence: confidence,
				}
			}
		}
	}
	
	if bestMatch != nil {
		slog.Debug("Skill matched", 
			"query", query[:min(50, len(query))], 
			"skill", bestMatch.Skill.Name(),
			"confidence", bestMatch.Confidence,
		)
	}
	
	return bestMatch
}

// MatchAll returns all skills that can handle the query, sorted by confidence
func (r *Registry) MatchAll(ctx context.Context, query string, skillCtx SkillContext) []MatchResult {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	var matches []MatchResult
	
	for _, skill := range r.skills {
		confidence := skill.CanHandle(ctx, query, skillCtx)
		if confidence > 0.1 { // Minimum threshold
			matches = append(matches, MatchResult{
				Skill:      skill,
				Confidence: confidence,
			})
		}
	}
	
	// Sort by confidence (descending)
	sort.Slice(matches, func(i, j int) bool {
		return matches[i].Confidence > matches[j].Confidence
	})
	
	return matches
}

// Execute runs the best matching skill
func (r *Registry) Execute(ctx context.Context, query string, request SkillRequest) (*SkillResponse, error) {
	match := r.Match(ctx, query, request.Context)
	if match == nil {
		return nil, nil // No skill matched
	}
	
	slog.Info("Executing skill", 
		"skill", match.Skill.Name(), 
		"confidence", match.Confidence,
	)
	
	return match.Skill.Execute(ctx, request)
}

// List returns all registered skills
func (r *Registry) List() []Skill {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	result := make([]Skill, len(r.skills))
	copy(result, r.skills)
	return result
}

// Count returns the number of registered skills
func (r *Registry) Count() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.skills)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
