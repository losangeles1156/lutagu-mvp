package orchestrator

import "strings"

var faqAirportTokens = []string{
	"成田", "narita", "nrt",
	"羽田", "haneda", "hnd",
	"機場", "机场", "airport",
}

var faqCityTokens = []string{
	"東京", "tokyo", "新宿", "shinjuku", "渋谷", "澀谷", "shibuya",
	"上野", "ueno", "池袋", "ikebukuro", "品川", "shinagawa",
}

func isFAQHit(query, locale string) bool {
	q := strings.ToLower(strings.TrimSpace(query))
	if q == "" {
		return false
	}
	if hasAnyToken(q, faqAirportTokens) && hasAnyToken(q, faqCityTokens) {
		return true
	}
	return false
}

func hasAnyToken(query string, tokens []string) bool {
	for _, t := range tokens {
		if t == "" {
			continue
		}
		if strings.Contains(query, strings.ToLower(t)) {
			return true
		}
	}
	return false
}
