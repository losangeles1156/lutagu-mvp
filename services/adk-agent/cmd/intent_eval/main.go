package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/lutagu/adk-agent/internal/orchestrator"
)

type testCase struct {
	Name            string   `json:"name"`
	Query           string   `json:"query"`
	ExpectedRoute   string   `json:"expected_route"`
	ExpectedAnyTags []string `json:"expected_any_tags"`
}

type result struct {
	Name          string
	Query         string
	ExpectedRoute string
	ActualRoute   string
	ExpectedTags  []string
	ActualTags    []string
	Passed        bool
	Reason        string
}

func main() {
	casesPath := flag.String("cases", "tests/intent_router_cases.json", "path to intent eval cases")
	flag.Parse()

	cases, err := loadCases(*casesPath)
	if err != nil {
		fmt.Printf("failed to load cases: %v\n", err)
		os.Exit(1)
	}
	if len(cases) == 0 {
		fmt.Println("no test cases found")
		os.Exit(1)
	}

	results := make([]result, 0, len(cases))
	passCount := 0
	for _, c := range cases {
		actualRoute, actualTags := orchestrator.AnalyzeIntentForQuery(c.Query)
		r := result{
			Name:          c.Name,
			Query:         c.Query,
			ExpectedRoute: c.ExpectedRoute,
			ActualRoute:   actualRoute,
			ExpectedTags:  c.ExpectedAnyTags,
			ActualTags:    actualTags,
		}
		r.Passed, r.Reason = judge(c, actualRoute, actualTags)
		if r.Passed {
			passCount++
		}
		results = append(results, r)
	}

	total := len(results)
	accuracy := float64(passCount) / float64(total) * 100
	fmt.Printf("Intent Eval Summary\n")
	fmt.Printf("- Cases: %d\n", total)
	fmt.Printf("- Passed: %d\n", passCount)
	fmt.Printf("- Accuracy: %.2f%%\n", accuracy)
	fmt.Println("")

	for _, r := range results {
		if r.Passed {
			continue
		}
		fmt.Printf("FAIL: %s\n", r.Name)
		fmt.Printf("  Query: %s\n", r.Query)
		fmt.Printf("  Expected Route: %s, Actual: %s\n", r.ExpectedRoute, r.ActualRoute)
		fmt.Printf("  Expected Tags(any): %s\n", strings.Join(r.ExpectedTags, ","))
		fmt.Printf("  Actual Tags: %s\n", strings.Join(r.ActualTags, ","))
		fmt.Printf("  Reason: %s\n", r.Reason)
	}

	if passCount != total {
		os.Exit(2)
	}
}

func loadCases(path string) ([]testCase, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(abs)
	if err != nil {
		return nil, err
	}
	var cases []testCase
	if err := json.Unmarshal(data, &cases); err != nil {
		return nil, err
	}
	return cases, nil
}

func judge(c testCase, actualRoute string, actualTags []string) (bool, string) {
	if c.ExpectedRoute != "" && c.ExpectedRoute != actualRoute {
		return false, "route mismatch"
	}
	if len(c.ExpectedAnyTags) == 0 {
		return true, ""
	}
	for _, want := range c.ExpectedAnyTags {
		for _, got := range actualTags {
			if want == got {
				return true, ""
			}
		}
	}
	return false, "missing expected tag"
}
