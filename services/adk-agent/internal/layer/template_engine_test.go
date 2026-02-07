package layer

import "testing"

func TestTemplateGating_SkipsOnComplexity(t *testing.T) {
	ctx := TemplateContext{Query: "我帶大行李要去淺草", Locale: "zh-TW"}
	if AllowTemplate(ctx, "compound") {
		t.Fatalf("expected template gate to block compound intent")
	}
}
