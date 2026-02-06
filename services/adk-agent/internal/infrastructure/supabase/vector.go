package supabase

import (
	"context"
	"encoding/json"
	"fmt"
)

// VectorStore handles vector search operations via Supabase pgvector
type VectorStore struct {
	client *Client
}

// NewVectorStore creates a new vector store
func NewVectorStore(client *Client) *VectorStore {
	return &VectorStore{client: client}
}

// SearchResult represents a vector search result
type SearchResult struct {
	ID         string                 `json:"id"`
	Content    string                 `json:"content"`
	Metadata   map[string]interface{} `json:"metadata"`
	Similarity float64                `json:"similarity"`
}

// SearchOptions configures vector search behavior
type SearchOptions struct {
	Limit     int
	Threshold float64
	NodeID    string   // For context-pruned RAG
	NodeIDs   []string // For GraphRAG neighbor expansion
	Tags      []string // For tag filtering
}

// Search performs semantic search using the match_knowledge RPC
func (v *VectorStore) Search(ctx context.Context, embedding []float32, opts SearchOptions) ([]SearchResult, error) {
	if opts.Limit <= 0 {
		opts.Limit = 5
	}
	if opts.Threshold <= 0 {
		opts.Threshold = 0.5
	}

	// Convert embedding to float64 for JSON
	embeddingF64 := make([]float64, len(embedding))
	for i, val := range embedding {
		embeddingF64[i] = float64(val)
	}

	params := map[string]interface{}{
		"query_embedding": embeddingF64,
		"match_threshold": opts.Threshold,
		"match_count":     opts.Limit,
	}

	respBody, err := v.client.RPC(ctx, RPCRequest{
		FunctionName: "match_knowledge",
		Params:       params,
	})
	if err != nil {
		return nil, fmt.Errorf("vector search failed: %w", err)
	}

	var results []SearchResult
	if err := json.Unmarshal(respBody, &results); err != nil {
		return nil, fmt.Errorf("failed to parse results: %w", err)
	}

	// Context-pruned filtering (post-processing)
	nodeIDs := normalizeNodeIDs(opts.NodeID, opts.NodeIDs)
	if len(nodeIDs) > 0 {
		results = filterByNodes(results, nodeIDs)
	}
	if len(opts.Tags) > 0 {
		results = filterByTags(results, opts.Tags)
	}

	return results, nil
}

func normalizeNodeIDs(primary string, expanded []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(expanded)+1)
	if primary != "" {
		seen[primary] = struct{}{}
		out = append(out, primary)
	}
	for _, id := range expanded {
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

// filterByNodes filters results by node IDs in metadata
func filterByNodes(results []SearchResult, nodeIDs []string) []SearchResult {
	allowed := make(map[string]struct{}, len(nodeIDs))
	for _, id := range nodeIDs {
		allowed[id] = struct{}{}
	}
	filtered := make([]SearchResult, 0, len(results))
	for _, r := range results {
		if metaNodeID, ok := r.Metadata["node_id"].(string); ok {
			if metaNodeID == "" {
				filtered = append(filtered, r)
				continue
			}
			if _, exists := allowed[metaNodeID]; exists {
				filtered = append(filtered, r)
			}
		} else {
			// Include results without node_id (global knowledge)
			filtered = append(filtered, r)
		}
	}
	return filtered
}

func filterByTags(results []SearchResult, tags []string) []SearchResult {
	allowed := make(map[string]struct{}, len(tags))
	for _, t := range tags {
		if t == "" {
			continue
		}
		allowed[t] = struct{}{}
	}
	if len(allowed) == 0 {
		return results
	}

	filtered := make([]SearchResult, 0, len(results))
	for _, r := range results {
		metaTags, ok := toStringSlice(r.Metadata["tags"])
		if !ok || len(metaTags) == 0 {
			// Keep docs without tags as generic knowledge.
			filtered = append(filtered, r)
			continue
		}
		if intersects(metaTags, allowed) {
			filtered = append(filtered, r)
		}
	}
	return filtered
}

func toStringSlice(v interface{}) ([]string, bool) {
	switch vv := v.(type) {
	case []string:
		return vv, true
	case []interface{}:
		out := make([]string, 0, len(vv))
		for _, item := range vv {
			if s, ok := item.(string); ok && s != "" {
				out = append(out, s)
			}
		}
		return out, true
	default:
		return nil, false
	}
}

func intersects(values []string, allowed map[string]struct{}) bool {
	for _, v := range values {
		if _, ok := allowed[v]; ok {
			return true
		}
	}
	return false
}

// AddDocument adds a document to the vector store
func (v *VectorStore) AddDocument(ctx context.Context, id, content string, embedding []float32, metadata map[string]interface{}) error {
	embeddingF64 := make([]float64, len(embedding))
	for i, val := range embedding {
		embeddingF64[i] = float64(val)
	}

	params := map[string]interface{}{
		"p_id":        id,
		"p_content":   content,
		"p_embedding": embeddingF64,
		"p_metadata":  metadata,
	}

	_, err := v.client.RPC(ctx, RPCRequest{
		FunctionName: "upsert_knowledge",
		Params:       params,
	})
	return err
}
