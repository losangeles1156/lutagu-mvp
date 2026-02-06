package supabase

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client wraps Supabase REST API operations
type Client struct {
	baseURL    string
	serviceKey string
	http       *http.Client
}

// NewClient creates a new Supabase client
func NewClient(url, serviceKey string) (*Client, error) {
	if url == "" || serviceKey == "" {
		return nil, fmt.Errorf("supabase url and service key are required")
	}

	return &Client{
		baseURL:    url,
		serviceKey: serviceKey,
		http: &http.Client{
			Timeout: 10 * time.Second,
		},
	}, nil
}

// RPCRequest represents a request to Supabase RPC
type RPCRequest struct {
	FunctionName string
	Params       map[string]interface{}
}

// RPC calls a Supabase RPC function
func (c *Client) RPC(ctx context.Context, req RPCRequest) ([]byte, error) {
	url := fmt.Sprintf("%s/rest/v1/rpc/%s", c.baseURL, req.FunctionName)

	body, err := json.Marshal(req.Params)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal params: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("apikey", c.serviceKey)
	httpReq.Header.Set("Authorization", "Bearer "+c.serviceKey)
	httpReq.Header.Set("Prefer", "return=representation")

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
		return nil, fmt.Errorf("supabase error (%d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// Query executes a PostgREST query
func (c *Client) Query(ctx context.Context, table string, params map[string]string) ([]byte, error) {
	url := fmt.Sprintf("%s/rest/v1/%s", c.baseURL, table)

	httpReq, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	q := httpReq.URL.Query()
	for k, v := range params {
		q.Add(k, v)
	}
	httpReq.URL.RawQuery = q.Encode()

	httpReq.Header.Set("apikey", c.serviceKey)
	httpReq.Header.Set("Authorization", "Bearer "+c.serviceKey)

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
		return nil, fmt.Errorf("supabase error (%d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// Upsert executes a PostgREST upsert for one or more rows.
func (c *Client) Upsert(ctx context.Context, table string, rows interface{}, onConflict string) ([]byte, error) {
	url := fmt.Sprintf("%s/rest/v1/%s", c.baseURL, table)
	if onConflict != "" {
		url += fmt.Sprintf("?on_conflict=%s", onConflict)
	}

	body, err := json.Marshal(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal rows: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("apikey", c.serviceKey)
	httpReq.Header.Set("Authorization", "Bearer "+c.serviceKey)
	httpReq.Header.Set("Prefer", "resolution=merge-duplicates,return=representation")

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
		return nil, fmt.Errorf("supabase upsert error (%d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// Delete executes a PostgREST delete query.
func (c *Client) Delete(ctx context.Context, table string, params map[string]string) error {
	url := fmt.Sprintf("%s/rest/v1/%s", c.baseURL, table)

	httpReq, err := http.NewRequestWithContext(ctx, "DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	q := httpReq.URL.Query()
	for k, v := range params {
		q.Add(k, v)
	}
	httpReq.URL.RawQuery = q.Encode()

	httpReq.Header.Set("apikey", c.serviceKey)
	httpReq.Header.Set("Authorization", "Bearer "+c.serviceKey)

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("supabase delete error (%d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// Ping verifies connectivity
func (c *Client) Ping(ctx context.Context) error {
	url := fmt.Sprintf("%s/rest/v1/", c.baseURL)

	httpReq, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}

	httpReq.Header.Set("apikey", c.serviceKey)

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 500 {
		return fmt.Errorf("supabase unhealthy: %d", resp.StatusCode)
	}

	return nil
}
