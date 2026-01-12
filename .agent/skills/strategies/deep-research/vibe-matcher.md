---
description: "Vibe Matcher: Crowd Flow & Semantic Location Strategy"
version: "1.0"
---

# Vibe Matcher (人潮與氛圍分流策略)

## 1. Trigger Conditions (觸發條件)
該技能在以下情況被觸發：
- **Explicit**: 用戶直接詢問「有沒有類似的地方？」、「喜歡這種氣氛但這裡太多人」。
- **Implicit**: 用戶抱怨「太擠了」、「人太多」、「想找安靜的地方」，且當前位置為熱門景點（如淺草、澀谷）。
- **Keywords**: `crowded`, `too many people`, `similar vibe`, `quiet place`, `alternative`.

## 2. Core Logic (核心邏輯)
此技能不進行傳統的關鍵字搜尋，而是執行 **Vectors Semantics Matching**。

### Step 1: Extract Vibe DNA (提取氛圍基因)
- 獲取當前地點 (Anchor Spot) 的 `vibe_vector`。
- 若無向量，使用地點的標籤 (Tags) 組合（如 `Energy: Lively`, `Category: Temple`, `Vibe: Shitamachi`）生成臨時查詢向量。

### Step 2: Radius Search (半徑搜索)
- 在半徑 **2.0 km** (步行或短程電車可達) 範圍內搜索。
- 計算 **Cosine Similarity**。
- 過濾標準：Similarity > **0.85**。

### Step 3: Crowd Filter (人流過濾)
- 獲取候選地點的即時人流狀態 (Live Crowd Level)。
- **排除** Crowd Level >= 4 (Crowded/Packed) 的地點。
- **優先** Crowd Level <= 2 (Empty/Sparse) 的地點。

### Step 4: Semantic Reasoning (語意推理)
- 比較 Anchor Spot 與 Candidate Spot 的異同。
- 生成推薦理由。

## 3. Response Format (回覆架構)
AI 必須輸出 JSON 格式的推理結果，並包含給用戶的自然語言建議。

```json
{
  "strategy": "vibe_matching",
  "anchor_spot": "Senso-ji (Asakusa)",
  "detected_vibe": ["Traditional", "Bustling", "Temple Town"],
  "recommendation": {
    "name": "Shibamata Taishaken",
    "similarity_score": 0.92,
    "crowd_level": 1,
    "reasoning": "Both are historic temple towns with old shopping streets, but Shibamata is significantly quieter right now.",
    "travel_tip": "Take Keisei Line from Oshiage (15 mins)."
  },
  "user_message": "覺得淺草人太多嗎？推薦你去**柴又**。那裡保留了和淺草一樣的「下町風情」與老街參道，但少了觀光客人潮，搭電車過去只要 15 分鐘，非常適合想要安靜感受老東京的你。"
}
```

## 4. Nuance & Tone (語氣指導)
- **同理心**: 先認同用戶的困擾（「人真的很多對吧？」）。
- **專業感**: 強調推薦地點在「氛圍上」的高度相似性，但在「舒適度」上的優越性。
- **行動導向**: 務必附上簡單的交通指引。
