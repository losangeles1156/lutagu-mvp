# Tag Generator Logic (L1/L3)

## 🎯 Goal
自動化將原始地點資訊 (Raw POI Data) 轉換為符合 **Lutagu 3-5-8 規範** 的結構化標籤。
目標是讓每個地點都具備「可搜尋性 (Searchability)」與「情境匹配性 (Context Awareness)」。

## ⚙️ Trigger
*   **Data Ingestion**: 當新地點被加入資料庫時 (ETL Process)。
*   **User Query**: 當用戶詢問某地點的詳細資訊，而資料庫缺乏標籤時 (On-the-fly Generation)。
*   **Maintenance**: 定期掃描標籤覆蓋率過低的地點。

## 🧠 Algorithm: The "3-Stage Distillation"

此演算法模擬一個「蒸餾」過程，從雜亂的敘述中萃取精華。

### Stage 1: Raw Analysis & Categorization (原料分析)
*   **Input**: Store Name, Description, Reviews, Google Maps Category.
*   **Task**:
    1.  決定唯一的 `l1_category` (Taxonomy Check).
    2.  決定 `l1_subcategory` (Specific Niche).
    3.  分離功能性設施 (Facilities) 到 L3 欄位 (如：有插座、有廁所 -> L3，不進 tags)。

### Stage 2: The "3-5-8" Generation (核心生成)
利用 LLM (MiniMax or Gemini) 針對性生成三類標籤：

#### 1. Core Tags (3-4字 | limit: 3)
*   **定義**: 該地點的「本體屬性」，直觀的名詞。
*   **Rule**: 嚴格限制 4 字以內。
*   *Example*: `豚骨拉麵`, `老宅咖啡`, `親子景點`.

#### 2. Intent Tags (5-8字 | limit: 5)
*   **定義**: 用戶來這裡的「動機」或「解決的任務」。這是 SEO 與語意搜尋的關鍵。
*   **Rule**: 動詞+名詞，或描述性短句。
*   *Example*: `適合深夜聚餐`, `一個人也能吃`, `雨天備案首選`, `能看到晴空塔`.

#### 3. Visual Tags (視覺描述 | limit: 3)
*   **定義**: 用戶一眼看到的視覺特徵 (Visual Vibe)。
*   **Rule**: 顏色、材質、光線、建築風格。
*   *Example*: `紅燈籠高掛`, `清水模建築`, `昭和復古霓虹`.

### Stage 3: Verification & Formatting (驗證格式)
*   **Anti-Hallucination**: 檢查生成的 tag 是否存在於原始描述中 (若原文明明寫「禁菸」，tag 不能出「可抽菸」)。
*   **Format**: 輸出 JSON。

## 🤖 LLM Prompt Strategy

使用以下 System Prompt 結構進行生成：

```markdown
Role: Lutagu Tagging Specialist
Input: {raw_description}

Task: Generate tags following the 3-5-8 Policy.

Constraints:
1. Strip all "facilities" (WiFi, toilet) -> Output to 'l3_features' array.
2. CORE tags must be < 4 chars.
3. INTENT tags must reflect "Usage Context".
4. VISUAL tags must describe the physical look.

Output JSON:
{
  "l1_category": "dining",
  "l1_subcategory": "ramen",
  "tags_core": ["..."],
  "tags_intent": ["..."],
  "tags_visual": ["..."],
  "l3_features": ["wifi", "barrier_free"]
}
```

## 📝 Example Output

**Input**: "Afuri Ramen Harajuku. Stylish ramen place, famous for Yuzu Shio Ramen. Order via kiosk. Very crowded on weekends. Vegan options available. Concrete walls design."

**Generated Tags**:
```json
{
  "l1_category": "dining",
  "l1_subcategory": "ramen",
  "tags_core": [
    "柚子拉麵", "淡麗系", "原宿美食"
  ],
  "tags_intent": [
    "外國遊客友善", "清爽系湯頭", "素食者可食", "點餐機自助", "約會也適合"
  ],
  "tags_visual": [
    "工業風裝潢", "開放式廚房", "時髦明亮"
  ],
  "l3_features": ["ticket_kiosk", "vegan_option"]
}
```
