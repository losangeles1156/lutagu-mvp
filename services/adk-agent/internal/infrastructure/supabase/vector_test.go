package supabase

import "testing"

func TestFilterByNodes(t *testing.T) {
	input := []SearchResult{
		{ID: "1", Metadata: map[string]interface{}{"node_id": "tokyo"}},
		{ID: "2", Metadata: map[string]interface{}{"node_id": "shinjuku"}},
		{ID: "3", Metadata: map[string]interface{}{}},
	}
	out := filterByNodes(input, []string{"tokyo"})
	if len(out) != 2 {
		t.Fatalf("expected 2 results (tokyo + global), got %d", len(out))
	}
}

func TestFilterByTags(t *testing.T) {
	input := []SearchResult{
		{ID: "1", Metadata: map[string]interface{}{"tags": []interface{}{"route", "airport"}}},
		{ID: "2", Metadata: map[string]interface{}{"tags": []interface{}{"food"}}},
		{ID: "3", Metadata: map[string]interface{}{}},
	}
	out := filterByTags(input, []string{"route"})
	if len(out) != 2 {
		t.Fatalf("expected 2 results (route + untagged), got %d", len(out))
	}
}
