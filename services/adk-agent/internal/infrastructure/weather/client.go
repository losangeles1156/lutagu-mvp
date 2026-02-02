package weather

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const (
	// Tokyo Coordinates
	Lat  = 35.6895
	Long = 139.6917
	// Open-Meteo API (Free, No Key)
	BaseURL = "https://api.open-meteo.com/v1/forecast"
)

type Client struct {
	httpClient *http.Client
}

func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

type WeatherResponse struct {
	CurrentWeather CurrentWeather `json:"current_weather"`
}

type CurrentWeather struct {
	Temperature float64 `json:"temperature"`
	WindSpeed   float64 `json:"windspeed"`
	WeatherCode int     `json:"weathercode"`
	Time        string  `json:"time"`
}

// GetCurrentWeather fetches the current weather for Tokyo
func (c *Client) GetCurrentWeather(ctx context.Context) (*CurrentWeather, error) {
	url := fmt.Sprintf("%s?latitude=%f&longitude=%f&current_weather=true", BaseURL, Lat, Long)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch weather: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("weather api returned status: %d", resp.StatusCode)
	}

	var wResp WeatherResponse
	if err := json.NewDecoder(resp.Body).Decode(&wResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &wResp.CurrentWeather, nil
}

// GetConditionText converts WMO code to human description
func (w *CurrentWeather) GetConditionText() string {
	// WMO Weather interpretation codes (WW)
	// https://open-meteo.com/en/docs
	switch w.WeatherCode {
	case 0:
		return "Clear sky"
	case 1, 2, 3:
		return "Partly cloudy"
	case 45, 48:
		return "Fog"
	case 51, 53, 55:
		return "Drizzle"
	case 61, 63, 65:
		return "Rain"
	case 71, 73, 75:
		return "Snow"
	case 80, 81, 82:
		return "Rain showers"
	case 95, 96, 99:
		return "Thunderstorm"
	default:
		return "Unknown"
	}
}

// IsRaining returns true if the weather code indicates rain, drizzle, snow, or thunderstorm
func (w *CurrentWeather) IsRaining() bool {
	code := w.WeatherCode
	// Drizzle (51,53,55), Rain (61,63,65), Snow (71,73,75), Showers (80,81,82), Thunderstorm (95,96,99)
	return (code >= 51 && code <= 55) ||
		(code >= 61 && code <= 65) ||
		(code >= 71 && code <= 75) ||
		(code >= 80 && code <= 82) ||
		(code >= 95 && code <= 99)
}
