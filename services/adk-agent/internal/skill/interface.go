package skill

import (
	"context"
)

// Skill defines the interface for all specialized skills
type Skill interface {
	// Name returns the unique identifier of the skill
	Name() string

	// Description returns a human-readable description
	Description() string

	// CanHandle checks if this skill can handle the given query
	// Returns a confidence score (0-1)
	CanHandle(ctx context.Context, query string, nodeContext SkillContext) float64

	// Execute runs the skill and returns a response
	Execute(ctx context.Context, request SkillRequest) (*SkillResponse, error)

	// Priority returns the skill priority (higher = execute first)
	Priority() int
}

// SkillContext contains contextual information for skill matching
type SkillContext struct {
	NodeID       string
	NodeName     string
	Locale       string
	UserLocation *Location
	Tags         []string
	L2Disrupted  bool
}

// Location represents a geographic location
type Location struct {
	Lat float64
	Lng float64
}

// SkillRequest contains the full request context for skill execution
type SkillRequest struct {
	Query       string
	Context     SkillContext
	History     []Message
	RAGResults  []RAGDocument
	L2Context   interface{} // *layer.L2Context
}

// Message represents a chat message
type Message struct {
	Role    string
	Content string
}

// RAGDocument represents a retrieved document
type RAGDocument struct {
	ID         string
	Content    string
	Similarity float64
	Metadata   map[string]interface{}
}

// SkillResponse contains the skill execution result
type SkillResponse struct {
	Content     string
	Category    string
	Confidence  float64
	Sources     []Source
	Actions     []Action
	NeedsLLM    bool   // If true, content should be passed to LLM for refinement
	Metadata    map[string]interface{}
}

// Source represents a reference source
type Source struct {
	Title string
	URL   string
	Type  string // "document", "api", "template"
}

// Action represents a suggested action
type Action struct {
	Type    string // "navigate", "call", "link"
	Label   string
	Data    string
}

// BaseSkill provides common functionality for skills
type BaseSkill struct {
	name        string
	description string
	priority    int
}

// NewBaseSkill creates a new base skill
func NewBaseSkill(name, description string, priority int) BaseSkill {
	return BaseSkill{
		name:        name,
		description: description,
		priority:    priority,
	}
}

// Name returns the skill name
func (b *BaseSkill) Name() string {
	return b.name
}

// Description returns the skill description
func (b *BaseSkill) Description() string {
	return b.description
}

// Priority returns the skill priority
func (b *BaseSkill) Priority() int {
	return b.priority
}
