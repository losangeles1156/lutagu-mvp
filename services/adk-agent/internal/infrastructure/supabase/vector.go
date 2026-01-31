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
	if opts.NodeID != "" {
		results = filterByNode(results, opts.NodeID)
	}

	return results, nil
}

// filterByNode filters results by node ID in metadata
func filterByNode(results []SearchResult, nodeID string) []SearchResult {
	filtered := make([]SearchResult, 0, len(results))
	for _, r := range results {
		if metaNodeID, ok := r.Metadata["node_id"].(string); ok {
			if metaNodeID == nodeID || metaNodeID == "" {
				filtered = append(filtered, r)
			}
		} else {
			// Include results without node_id (global knowledge)
			filtered = append(filtered, r)
		}
	}
	return filtered
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
