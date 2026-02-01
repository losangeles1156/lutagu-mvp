package weather

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Client for Open-Meteo API
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// NewClient creates a new weather client
func NewClient() *Client {
	return &Client{
		baseURL: "https://api.open-meteo.com/v1",
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// CurrentWeather represents the parsed weather state
type CurrentWeather struct {
	Temperature float64
	Condition   string
	IsRaining   bool
	PrecipProb  int
	Humidity    int
	WindSpeed   float64
	FetchedAt   time.Time
}

type openMeteoResponse struct {
	Current struct {
		Temperature2m      float64 `json:"temperature_2m"`
		RelativeHumidity2m int     `json:"relative_humidity_2m"`
		Precipitation      float64 `json:"precipitation"`
		WeatherCode        int     `json:"weather_code"`
		WindSpeed10m       float64 `json:"wind_speed_10m"`
	} `json:"current"`
}

// FetchTokyoWeather gets the current weather for Tokyo (Representative point)
func (c *Client) FetchTokyoWeather() (*CurrentWeather, error) {
	// Tokyo Coordinates: 35.6895, 139.6917
	url := fmt.Sprintf("%s/forecast?latitude=35.6895&longitude=139.6917&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=Asia%%2FTokyo", c.baseURL)

	resp, err := c.httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("weather api returned status: %d", resp.StatusCode)
	}

	var data openMeteoResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	w := &CurrentWeather{
		Temperature: data.Current.Temperature2m,
		Humidity:    data.Current.RelativeHumidity2m,
		WindSpeed:   data.Current.WindSpeed10m,
		FetchedAt:   time.Now(),
		Condition:   decodeWeatherCode(data.Current.WeatherCode),
		IsRaining:   isRaining(data.Current.WeatherCode),
	}

	// Open-Meteo 'precipitation' is current mm, not probability in this endpoint,
	// but purely for context 'IsRaining' based on code is surprisingly accurate for decision making.

	return w, nil
}

func isRaining(code int) bool {
	// 51-67: Drizzle/Rain, 80-82: Showers, 95-99: Thunderstorm
	return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99)
}

func decodeWeatherCode(code int) string {
	switch code {
	case 0:
		return "Clear sky (Sunny) ☀️"
	case 1, 2, 3:
		return "Mainly clear / Partly cloudy 🌤️"
	case 45, 48:
		return "Fog 🌫️"
	case 51, 53, 55:
		return "Drizzle 🌧️"
	case 56, 57:
		return "Freezing Drizzle 🌧️"
	case 61, 63, 65:
		return "Rain ☔"
	case 66, 67:
		return "Freezing Rain ☔"
	case 71, 73, 75:
		return "Snow fall ❄️"
	case 77:
		return "Snow grains ❄️"
	case 80, 81, 82:
		return "Rain showers ☔"
	case 85, 86:
		return "Snow showers ❄️"
	case 95:
		return "Thunderstorm ⚡"
	case 96, 99:
		return "Thunderstorm with hail ⛈️"
	default:
		return "Unknown"
	}
}
