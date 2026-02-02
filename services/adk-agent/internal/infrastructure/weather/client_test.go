package weather

import (
	"context"
	"fmt"
	"testing"
)

func TestGetCurrentWeather(t *testing.T) {
	// Create client
	client := NewClient()

	// Call API (System Integration Test)
	weather, err := client.GetCurrentWeather(context.Background())
	if err != nil {
		t.Fatalf("Failed to fetch weather: %v", err)
	}

	// Logging for Debug
	fmt.Printf("DEBUG: Fetched Weather for Tokyo\n")
	fmt.Printf("Tick: %s\n", weather.Time)
	fmt.Printf("Temp: %.1f °C\n", weather.Temperature)
	fmt.Printf("Wind: %.1f km/h\n", weather.WindSpeed)
	fmt.Printf("Code: %d (%s)\n", weather.WeatherCode, weather.GetConditionText())

	// Assertions
	if weather.Temperature < -20 || weather.Temperature > 50 {
		t.Errorf("Temperature value seems invalid: %.1f", weather.Temperature)
	}

	if weather.Time == "" {
		t.Error("Returned time is empty")
	}
}
