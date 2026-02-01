package validation

import (
	"fmt"
	"regexp"
	"strings"
)

// FactCheckResult contains the result of an anti-hallucination check
type FactCheckResult struct {
	HasHallucination  bool
	Issues            []FactCheckIssue
	CorrectedResponse string
}

type FactCheckIssue struct {
	Type       string
	Severity   string
	Claim      string
	Correction string
}

var (
	// Hallucination patterns (Ported from TS)
	directToTokyoPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)京急[線]?[^，。]*直達[^品川]*東京`),
		regexp.MustCompile(`(?i)京急[線]?[^，。]*直接[^品川]*東京`),
		regexp.MustCompile(`(?i)Keikyu[^,.\n]*direct[^Shinagawa]*Tokyo Station`),
		regexp.MustCompile(`(?i)直達東京車站[^，。]*京急`),
	}
	noTransferPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)羽田[^，。]*東京車站[^，。]*不[用需]?轉[乘車換]`),
		regexp.MustCompile(`(?i)從羽田[^，。]*直達[^，。]*東京車站`),
		regexp.MustCompile(`(?i)Haneda[^,.\n]*direct[^,.\n]*Tokyo Station`),
	}
)

// FactChecker validates LLM responses against ground truth
type FactChecker struct {
	groundTruth *GroundTruth
}

// NewFactChecker creates a new fact checker
func NewFactChecker() (*FactChecker, error) {
	gt, err := GetGroundTruth()
	if err != nil {
		return nil, err
	}
	return &FactChecker{groundTruth: gt}, nil
}

// Check validates a response for a given query
func (f *FactChecker) Check(query, response, locale string) FactCheckResult {
	result := FactCheckResult{
		CorrectedResponse: response,
	}

	isHanedaToTokyo := strings.Contains(strings.ToLower(query), "haneda") &&
		strings.Contains(strings.ToLower(query), "tokyo") ||
		(strings.Contains(query, "羽田") && strings.Contains(query, "東京"))

	if isHanedaToTokyo {
		// Detection keywords
		hasKeikyu := strings.Contains(response, "京急") || strings.Contains(strings.ToLower(response), "keikyu")
		hasTokyo := strings.Contains(response, "東京站") || strings.Contains(response, "東京駅") || strings.Contains(strings.ToLower(response), "tokyo station")
		hasDirect := strings.Contains(response, "直達") || strings.Contains(response, "直通") || strings.Contains(strings.ToLower(response), "direct")
		hasNoTransfer := strings.Contains(response, "不需轉乘") || strings.Contains(response, "不需要轉乘") || strings.Contains(response, "不用轉乘") ||
			strings.Contains(response, "乗り換えなし") || strings.Contains(strings.ToLower(response), "no transfer")

		// Check for direct claim hallucination
		if hasKeikyu && hasTokyo && hasDirect {
			result.Issues = append(result.Issues, FactCheckIssue{
				Type:       "direct_claim",
				Severity:   "critical",
				Claim:      getTranslation("claim_direct_keikyu", locale),
				Correction: getTranslation("corr_direct_keikyu", locale),
			})
			result.HasHallucination = true
		}

		// Check for no transfer hallucination
		if hasTokyo && hasNoTransfer {
			// Avoid duplicate issues if already flagged by direct_claim
			found := false
			for _, iss := range result.Issues {
				if iss.Type == "direct_claim" {
					found = true
					break
				}
			}
			if !found {
				result.Issues = append(result.Issues, FactCheckIssue{
					Type:       "no_transfer",
					Severity:   "critical",
					Claim:      getTranslation("claim_no_transfer", locale),
					Correction: getTranslation("corr_no_transfer", locale),
				})
				result.HasHallucination = true
			}
		}
	}

	if result.HasHallucination {
		result.CorrectedResponse = f.applyCorrections(response, result.Issues, locale)
	}

	return result
}

func (f *FactChecker) applyCorrections(response string, issues []FactCheckIssue, locale string) string {
	corrected := response
	for _, issue := range issues {
		if route, ok := f.groundTruth.Routes["haneda_to_tokyo_station"]; ok {
			best := route.CorrectRoutes[0]

			header := getTranslation("correction_header", locale)
			template := getTranslation("correction_template", locale)

			// Template: "%s %s。建議路線：%s，在%s轉車，總時間約%d分鐘，票價約¥%d。"
			// Note: We'll follow the user's requested style while accommodating locale.

			correction := fmt.Sprintf(template,
				header,
				issue.Correction,
				best.Name,
				best.TransferStation,
				best.TotalTimeMinutes,
				best.TotalFareYen)

			// Only append once
			if !strings.Contains(corrected, header) {
				corrected += "\n\n" + correction
			}
		}
	}
	return corrected
}

func getTranslation(key, locale string) string {
	locals := map[string]map[string]string{
		"zh-TW": {
			"claim_direct_keikyu": "京急線直達東京車站",
			"corr_direct_keikyu":  "京急線只直達品川站，需要在品川轉乘 JR 才能到東京車站",
			"claim_no_transfer":   "羽田機場到東京車站不需轉乘",
			"corr_no_transfer":    "從羽田機場到東京車站必須轉乘（在品川或濱松町）",
			"correction_header":   "⚠️ **重要更正**",
			"correction_template": "%s：%s。建議路線：%s，在%s轉車，總時間約%d分鐘，票價約¥%d。",
		},
		"en": {
			"claim_direct_keikyu": "Keikyu line direct to Tokyo Station",
			"corr_direct_keikyu":  "Keikyu line only goes direct to Shinagawa; you must transfer to JR at Shinagawa to reach Tokyo Station.",
			"claim_no_transfer":   "No transfer from Haneda to Tokyo Station",
			"corr_no_transfer":    "Transfer is required from Haneda to Tokyo Station (at Shinagawa or Hamamatsucho).",
			"correction_header":   "⚠️ **Important Correction**",
			"correction_template": "%s: %s Recommended route: %s, transfer at %s, travel time ~%d min, fare ~¥%d.",
		},
		"ja": {
			"claim_direct_keikyu": "京急線で東京駅まで直通",
			"corr_direct_keikyu":  "京急線は品川駅までの直通です。東京駅へは品川でJRへの乗り換えが必要です。",
			"claim_no_transfer":   "羽田から東京駅まで乗り換えなし",
			"corr_no_transfer":    "羽田から東京駅へは乗り換え（品川または浜松町）が必要です。",
			"correction_header":   "⚠️ **重要なお知らせ**",
			"correction_template": "%s：%s。推奨ルート：%s、%sで乗り換え、所要時間約%d分、運賃約¥%d。",
		},
	}

	// Normalize locale
	l := "zh-TW"
	if strings.HasPrefix(strings.ToLower(locale), "en") {
		l = "en"
	} else if strings.HasPrefix(strings.ToLower(locale), "ja") {
		l = "ja"
	}

	if m, ok := locals[l]; ok {
		if val, ok := m[key]; ok {
			return val
		}
	}
	// Fallback to zh-TW
	return locals["zh-TW"][key]
}
