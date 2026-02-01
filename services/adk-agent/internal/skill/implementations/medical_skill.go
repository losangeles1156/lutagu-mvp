package implementations

import (
	"context"
	"regexp"

	"github.com/lutagu/adk-agent/internal/skill"
)

// MedicalSkill handles medical triage and emergency queries
type MedicalSkill struct {
	skill.BaseSkill
	keywords []*regexp.Regexp
}

// NewMedicalSkill creates a new medical skill
func NewMedicalSkill() *MedicalSkill {
	s := &MedicalSkill{
		BaseSkill: skill.NewBaseSkill("medical", "Handles medical triage and emergency guidance", 110), // Highest Priority
	}
	s.initKeywords()
	return s
}

func (s *MedicalSkill) initKeywords() {
	s.keywords = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(醫生|醫院|診所|看病|不舒服|發燒|急診|119|救護車|doctor|hospital|clinic|sick|fever|medical|emergency|ambulance)`),
		regexp.MustCompile(`(?i)(受傷|流血|肚子痛|頭痛|暈|吐|cough|hurt|pain|dizzy)`),
	}
}

func (s *MedicalSkill) CanHandle(ctx context.Context, query string, skillCtx skill.SkillContext) float64 {
	for _, p := range s.keywords {
		if p.MatchString(query) {
			return 0.95
		}
	}
	return 0
}

func (s *MedicalSkill) Execute(ctx context.Context, request skill.SkillRequest) (*skill.SkillResponse, error) {
	locale := request.Context.Locale

	content := map[string]string{
		"zh-TW": `🏥 **日本醫療與急救指引**
		
**1. 緊急情況 (Emergency)**
如果您感到呼吸困難、劇烈胸痛或失去意識，請立即：
- 撥打 **119** (救護車)
- 向站務員或周圍的人求助：**「救急車を呼んでください！」** (請幫我叫救護車！)

**2. 一般病症 (Minor Illness)**
若只是發燒、感冒、腸胃不適：
- **建議前往「診所」(Clinic)** 而非大型綜合醫院。
- **原因**：日本大型醫院若無轉診單會收取額外的 **「選定療養費」** (約 ¥7,000+)。
- **搜尋關鍵字**：內科 (Internal Medicine)、小兒科 (Pediatrics)。

**3. 實用日語：**
- 「我不舒服」：**体調が悪いです (Taichou ga warui desu)**
- 「我想看醫生」：**病院に行きたいです (Byouin ni ikitai desu)**
- 「藥局在哪裡？」：**薬局はどこですか？ (Yakkyoku wa doko desuka?)**

**4. 諮詢專線：**
- **#7119**：非緊急醫療諮詢 (判斷是否需叫救護車)。

您現在有什麼具體症狀嗎？我可以幫您搜尋附近的診所資訊。`,
		"ja": `🏥 **医療・救急ガイド**

**1. 緊急の場合 (Emergency)**
呼吸困難、激しい胸痛、意識不明などの場合は、直ちに：
- **119番** に電話してください（救急車）
- 駅員や周囲の人に助けを求めてください：**「救急車を呼んでください！」**

**2. 軽症の場合 (Minor illness)**
発熱、風邪、胃腸の不調などの場合：
- 総合病院ではなく、まずは**「クリニック・診療所」**の受診をお勧めします。
- **理由**：紹介状なしで大病院を受診すると、**「選定療養費」**（¥7,000以上）がかかる場合があります。

**3. 便利な日本語：**
- 「体調が悪いです」
- 「病院に行きたいです」
- 「薬局はどこですか？」

**4. 相談窓口：**
- **#7119**：救急安心センター（救急車を呼ぶべきか迷った時）`,
	}

	return &skill.SkillResponse{
		Content:    getLocalized(content, locale),
		Category:   "medical_emergency",
		Confidence: 0.99,
		Sources: []skill.Source{
			{Title: "Japan National Tourism Organization (JNTO) - Medical Guide", URL: "https://www.jnto.go.jp/emergency/chc/medical_guide.html", Type: "link"},
		},
		Actions: []skill.Action{
			{Type: "call", Label: "Emergency (119)", Data: "119"},
			{Type: "call", Label: "Medical Guide (#7119)", Data: "#7119"},
		},
	}, nil
}
