package embedding

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// VoyageClient handles embedding generation via Voyage AI
type VoyageClient struct {
	apiKey string
	model  string
	http   *http.Client
}

const (
	VoyageAPIURL        = "https://api.voyageai.com/v1/embeddings"
	DefaultVoyageModel  = "voyage-4-lite"
	EmbeddingDimension  = 1024
)

// NewVoyageClient creates a new Voyage AI client
func NewVoyageClient(apiKey string, model string) (*VoyageClient, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("voyage API key is required")
	}
	if model == "" {
		model = DefaultVoyageModel
	}

	return &VoyageClient{
		apiKey: apiKey,
		model:  model,
		http: &http.Client{
			Timeout: 30 * time.Second,
		},
	}, nil
}

// EmbedRequest represents a request to Voyage AI
type EmbedRequest struct {
	Input     []string `json:"input"`
	Model     string   `json:"model"`
	InputType string   `json:"input_type,omitempty"`
}

// EmbedResponse represents the Voyage AI response
type EmbedResponse struct {
	Object string `json:"object"`
	Data   []struct {
		Object    string    `json:"object"`
		Embedding []float32 `json:"embedding"`
		Index     int       `json:"index"`
	} `json:"data"`
	Model string `json:"model"`
	Usage struct {
		TotalTokens int `json:"total_tokens"`
	} `json:"usage"`
}

// Embed generates embeddings for the given texts
func (c *VoyageClient) Embed(ctx context.Context, texts []string, inputType string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, fmt.Errorf("no texts provided")
	}

	req := EmbedRequest{
		Input:     texts,
		Model:     c.model,
		InputType: inputType, // "query" or "document"
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", VoyageAPIURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("voyage API error (%d): %s", resp.StatusCode, string(respBody))
	}

	var embedResp EmbedResponse
	if err := json.Unmarshal(respBody, &embedResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	embeddings := make([][]float32, len(embedResp.Data))
	for _, item := range embedResp.Data {
		embeddings[item.Index] = item.Embedding
	}

	return embeddings, nil
}

// EmbedQuery generates an embedding for a query (optimized for search)
func (c *VoyageClient) EmbedQuery(ctx context.Context, query string) ([]float32, error) {
	embeddings, err := c.Embed(ctx, []string{query}, "query")
	if err != nil {
		return nil, err
	}
	if len(embeddings) == 0 {
		return nil, fmt.Errorf("no embedding returned")
	}
	return embeddings[0], nil
}

// EmbedDocument generates an embedding for a document (optimized for indexing)
func (c *VoyageClient) EmbedDocument(ctx context.Context, doc string) ([]float32, error) {
	embeddings, err := c.Embed(ctx, []string{doc}, "document")
	if err != nil {
		return nil, err
	}
	if len(embeddings) == 0 {
		return nil, fmt.Errorf("no embedding returned")
	}
	return embeddings[0], nil
}
