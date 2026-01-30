package odpt

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "net/url"
    "time"
)

type Client struct {
    APIKey string
    APIUrl string
    HTTP   *http.Client
}

func NewClient(apiKey, apiUrl string) *Client {
    return &Client{
        APIKey: apiKey,
        APIUrl: apiUrl,
        HTTP:   &http.Client{Timeout: 10 * time.Second},
    }
}

func (c *Client) FetchTrainStatus() ([]SimplifiedStatus, error) {
    if c.APIKey == "" {
        return nil, fmt.Errorf("ODPT API Key missing")
    }

    u, err := url.Parse(c.APIUrl)
    if err != nil {
        return nil, err
    }
    q := u.Query()
    q.Set("acl:consumerKey", c.APIKey)
    u.RawQuery = q.Encode()

    resp, err := c.HTTP.Get(u.String())
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return nil, fmt.Errorf("ODPT API Error: %d %s", resp.StatusCode, string(body))
    }

    var rawData []TrainInformation
    if err := json.NewDecoder(resp.Body).Decode(&rawData); err != nil {
        return nil, err
    }

    var results []SimplifiedStatus
    for _, item := range rawData {
        // Handle polymorphic text
        text := item.TrainInformationText.Ja
        if text == "" {
            text = item.TrainInformationText.En
        }

        status := DeriveStatus(text)
        
        // Filter out normal status if we only want disruptions, 
        // BUT for "Status Agent" we generally want everything available?
        // Let's decide: returning ALL is safer, let Agent filter.
        
        results = append(results, SimplifiedStatus{
            Railway: item.Railway,
            Status:  status,
            Text:    text,
            Time:    item.Date.Format(time.RFC3339),
        })
    }

    return results, nil
}
