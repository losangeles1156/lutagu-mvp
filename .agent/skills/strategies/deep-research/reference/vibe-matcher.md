# Vibe Matcher Strategy

## 🎯 Goal
尋找具有「相似氛圍 (Vibe)」但可能更符合用戶特定需求（如：較少人、更便宜、更適合親子）的替代地點。
解決：「我很喜歡 A 地點的感覺，但我想要找別的地方」這類模糊搜尋需求。

## ⚙️ Trigger
當用戶詢問包含以下意圖時觸發：
*   "類似 [地點 X] 的地方"
*   "像 [地點 X] 但不要那麼擠"
*   "有沒有其他像 [地點 X] 的選擇？"

## 🧠 Execution Steps (Vector Search Strategy)

1.  **Extract Vibe Keywords (萃取氛圍關鍵字)**:
    *   分析用戶提及的 [地點 X] 之核心 L1 標籤 (例如：`#下町`, `#文青`, `#夜生活`).
    *   參考 `location-dna.md` 來識別 DNA。

2.  **Define Constraints (定義限制條件)**:
    *   Crowd Level: "Less crowded" -> 排除熱門觀光大站。
    *   Price: "Cheaper" -> 排除 `#Upscale` 標籤。
    *   Access: "Near [Location Y]" -> 限制地理範圍。

3.  **Semantic Search (語意搜尋)**:
    *   使用 `mcp_supabase-mcp-server_search_docs` 或 `execute_sql` 查詢 `location_embeddings` (假設有此向量表)。
    *   Query: "[Vibe Keywords] [Constraints]"
    *   *Fallback*: 若無向量搜尋，使用 SQL 標籤對應: `SELECT * FROM nodes WHERE tags @> '{#tag}' AND NOT tags @> '{#overcrowded}'`.

4.  **Rank & Filter (排序與過濾)**:
    *   優先推薦「觀光客較少」的隱藏版地點 (Hidden Gems)。

## 📝 Example Scenarios

### Case 1: "像淺草但不要那麼多觀光客"
*   **Target Vibe**: Old Tokyo, Temple, Traditional Street food, Retro.
*   **Source**: Asakusa (#Popuplar, #Overcrowded).
*   **Recommendation**:
    *   **柴又 (Shibamata)**: 真正的老街，有帝釋天參道，觀光客少。
    *   **深大寺 (Jindaiji)**: 歷史悠久，有鬼太郎茶屋，清幽。

### Case 2: "像秋葉原但更專注於復古電玩"
*   **Target Vibe**: Otaku, Anime, Electronics, Chaos.
*   **Source**: Akihabara.
*   **Recommendation**:
    *   **中野 (Nakano Broadway)**: 濃度更高，專攻收藏品與老玩具。

## 🗣️ Response Template
"如果你喜歡 **[原地點]** 的 **[氛圍特質]**，我強烈推薦你去 **[推薦地點]**！
那裡同樣有 **[相同的優點]**，但是 **[差異點/優勢，如：人少很多]**，特別適合 **[適合場景]**。"
