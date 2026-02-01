package validation

import "encoding/json"

// GroundTruth represents the correctly verified transit information
type GroundTruth struct {
	Routes               map[string]RouteInfo `json:"routes"`
	CommonMisconceptions []Misconception      `json:"common_misconceptions"`
}

type RouteInfo struct {
	Origin           StationInfo    `json:"origin"`
	Destination      StationInfo    `json:"destination"`
	RequiresTransfer bool           `json:"requires_transfer"`
	CorrectRoutes    []CorrectRoute `json:"correct_routes"`
	IncorrectClaims  []Claim        `json:"incorrect_claims"`
	KeyFacts         []string       `json:"key_facts"`
}

type StationInfo struct {
	Name   string   `json:"name"`
	NameEn string   `json:"name_en"`
	IDs    []string `json:"station_ids"`
}

type CorrectRoute struct {
	Name             string `json:"name"`
	TotalTimeMinutes int    `json:"total_time_minutes"`
	TotalFareYen     int    `json:"total_fare_yen"`
	TransferStation  string `json:"transfer_station"`
	Notes            string `json:"notes"`
}

type Claim struct {
	Claim        string `json:"claim"`
	WhyIncorrect string `json:"why_incorrect"`
}

type Misconception struct {
	Misconception  string   `json:"misconception"`
	Truth          string   `json:"truth"`
	AffectedRoutes []string `json:"affected_routes"`
}

var rawGroundTruth = `
{
  "routes": {
    "haneda_to_tokyo_station": {
      "origin": { "name": "羽田機場", "name_en": "Haneda Airport" },
      "destination": { "name": "東京車站", "name_en": "Tokyo Station" },
      "requires_transfer": true,
      "correct_routes": [
        {
          "name": "京急線 + JR (品川轉乘)",
          "total_time_minutes": 25,
          "total_fare_yen": 483,
          "transfer_station": "品川"
        }
      ],
      "incorrect_claims": [
        { "claim": "京急線直達東京車站", "why_incorrect": "京急線只直達品川站，需要在品川轉乘 JR 才能到東京車站" }
      ]
    }
  }
}`

func GetGroundTruth() (*GroundTruth, error) {
	var gt GroundTruth
	err := json.Unmarshal([]byte(rawGroundTruth), &gt)
	return &gt, err
}
