# Daily News Feed: 動態旅遊情報系統規劃書

## 1. 專案目標 (Objective)
建立一套 **「自動化每日情報收集系統」**，讓 Lutagu AI 具備即時 (T-0) 的東京旅遊資訊能力。
解決 LLM 訓練資料截止 (Knowledge Cutoff) 問題，讓 AI 能回答：「這週新宿有什麼快閃店？」或「現在哪裡有草莓甜點展？」。

## 2. 系統架構 (Architecture)

### 核心流水線 (Pipeline)
```mermaid
graph TD
    A[每日排程 (Cron)] -->|觸發| B(News Scraper)
    B -->|1. 請求 HTML| C{目標網站}
    C -->|Fashion Press / TimeOut| B
    B -->|2. Raw HTML| D[資訊萃取 (Information Extraction)]
    D -->|使用 Gemini 2.5 Flash Lite| E(結構化 Event JSON)
    E -->|3. 生成向量| F[Embedding Service]
    F -->|4. UPSERT| G[(Supabase: news_events)]
    
    H[User: '新宿甜點'] -->|5. Query| I[LocalGuide Skill]
    I -->|RAG Search| G
    I -->|Context + Prompt| J[DeepSeek V3]
    J -->|最終回覆| K[Client]
```

## 3. 實作細節 (Implementation Details)

### 3.1 資料來源 (Sources)
初期鎖定高品質、更新頻率穩定的來源：
1.  **Fashion Press (Gourmet/Art)**: 東京最強的甜點、快閃店、展覽情報源。結構清晰，圖片品質高。
2.  **TimeOut Tokyo (Event)**: 針對外國遊客的活動精選。

### 3.2 資訊萃取模型 (LLM Extractor)
使用 **Gemini 2.5 Flash Lite** 進行 HTML 解析。
*   **輸入**: 網頁列表頁的原始 HTML (去除 script/style)。
*   **Prompt**: 「請從 HTML 中提取活動資訊：標題、日期起訖、地點、摘要、圖片 URL。輸出為 JSON。」
*   **優勢**: Flash Lite Context Window 大且極其便宜，適合處理整頁 HTML。

### 3.3 資料庫模型 (Database Schema)
新增 `news_events` 資料表：

```sql
create table news_events (
  id uuid primary key default gen_random_uuid(),
  source_url text unique not null,
  title text not null,
  summary text,
  location text, -- e.g. "新宿高島屋"
  start_date date,
  end_date date,
  image_url text, -- 用於前端卡片展示
  tags text[], -- [sweets, popup, art]
  embedding vector(768), -- 用於語意搜尋
  created_at timestamptz default now()
);

-- 距今 30 天內的活動才加入索引搜尋
create index on news_events using ivfflat (embedding vector_cosine_ops)
where end_date >= current_date; 
```

### 3.4 技能整合 (Skill Integration)
修改 `LocalGuideSkill` (`implementations.ts`)：
1.  收到用戶請求 (e.g. "甜點")。
2.  先對 `news_events` 進行 Vector Search (Filter: `end_date >= today`)。
3.  若有高相關結果 (Similarity > 0.75)，將新聞摘要插入 Prompt。
4.  DeepSeek 回答：「根據最新情報，這週新宿正好有...」

## 4. 執行計畫 (Action Plan)

### Phase 1: 基礎建設 (Infrastructure)
- [ ] 建立 `news_events` 資料表與 RAG 函數 (`match_news_events`)。
- [ ] 設定 Supabase Edge Function 或 Local Cron Script。

### Phase 2: 爬蟲開發 (Scraper Dev)
- [ ] 開發 `scripts/crawl_fashion_press.ts`。
- [ ] 實作 Gemini Flash Lite 解析邏輯。
- [ ] 測試抓取與寫入流程。

### Phase 3: 技能升級 (Skill Upgrade)
- [ ] 更新 `LocalGuideSkill` 加入新聞 RAG 檢索。
- [ ] 調整 Prompt 讓 DeepSeek 優先引用新聞資料。

## 5. 預期效益
*   **消除幻覺**: 明確引用真實活動來源。
*   **時效性**: 每日更新，掌握最新展覽與快閃店。
*   **豐富度**: 提供圖片與活動日期，轉化率更高。
