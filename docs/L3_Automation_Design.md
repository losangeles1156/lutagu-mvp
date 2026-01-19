# L3 車站設施自動化收集系統設計書 (Station Facility Automation Design)

## 1. 系統概要 (System Overview)
本系統旨在自動化收集、清洗、整合東京千代田、中央、台東三區內各鐵路交會站的「靜態服務設施資訊」。透過 Headless Browser 技術定期抓取各營運商官網，並經由正規化處理寫入資料庫，供前端即時查詢。

## 2. 資料範圍 (Scope)
### 2.1 目標區域與車站
-   **行政區**: 千代田區 (Chiyoda), 中央區 (Chuo), 台東區 (Taito)
-   **涵蓋鐵路業者**:
    -   Tokyo Metro (東京地鐵)
    -   Toei Subway (都營地鐵)
    -   JR East (JR東日本)
    -   Keisei (京成電鐵 - 上野/日暮里)
    -   Tsukuba Express (秋葉原/淺草)
    -   Tobu (東武 - 淺草)

### 2.2 設施類型 (Target Data)
-   🚻 廁所 (Toilet): 位置、無障礙、溫水洗淨
-   🛅 置物櫃 (Lockers): 位置、尺寸 (S/M/L/XL)、數量
-   🛗 電梯 (Elevator): 位置、運行樓層
-   📶 WiFi: SSID、連線限制
-   🍼 育嬰室 (Nursing): 是否有熱水、尿布台
-   🏧 ATM: 銀行類型

## 3. 系統架構 (Architecture)

```mermaid
graph TD
    Trigger[手動/排程觸發] --> Runner[Runner (Orchestrator)]
    Runner --> ScraperA[Metro Scraper]
    Runner --> ScraperB[Toei Scraper]
    Runner --> ScraperC[JR/Others Scraper]

    ScraperA --Raw JSON--> Processor[Data Processor]
    ScraperB --Raw JSON--> Processor
    ScraperC --Raw JSON--> Processor

    subgraph Processing Logic
        Processor --> Normalize[正規化 (Normalization)]
        Normalize --> Merge[節點合併 (Node Merging)]
        Merge --> Validate[資料驗證 (Validation)]
    end

    Validate --> |Success| Snapshot[DB Snapshot (JSONB)]
    Validate --> |Failure| ErrorLog[Error Logs]

    Snapshot --> API[API Endpoint]
    API --> Client[LUTAGU Frontend]
```

## 4. 詳細流程設計 (Workflow Details)

### Phase 1: Data Collection (Scrapers)
使用 `puppeteer` 建立針對不同業者的爬蟲腳本。
-   **Headless Mode**: 模擬真實瀏覽器行為，處理 JavaScript Render 內容。
-   **Retry Mechanism**: 每個請求失敗時自動重試 3 次，間隔 5 秒。
-   **Rate Limiting**: 請求間隔至少 1 秒，避免被封鎖。

### Phase 2: Data Processing (Core Logic)
#### 2.1 正規化 (Normalization)
定義標準介面 `StationFacility`，將各家業者的用詞統一。
-   Ex: "多機能トイレ" (Metro) / "だれでもトイレ" (Toei) -> `type: "toilet", attributes: { wheelchair: true }`

#### 2.2 多語系處理 (Translation)
-   優先使用官網提供的多語系對應（如有）。
-   若無，使用預定義的「設施詞典」進行翻譯。
-   格式：`{ ja: "改札内", en: "Inside Gate", zh: "驗票口內" }`

#### 2.3 節點合併 (Node Merging)
-   **規則**: 若不同業者的站名相同且行政區一致 (或相距 <200m)，視為同一 `StationID`。
-   **案例**: 上野站 (JR + Metro + Keisei)。將三者的設施清單合併至 `StationWisdom["Ueno"].l3Facilities` 陣列中。

### Phase 3: Storage & Snapshot
-   **表格設計**:
    -   `l3_snapshots` table
    -   `id`: UUID
    -   `station_id`: String (e.g., `odpt:Station:TokyoMetro.Ueno`)
    -   `data`: JSONB (完整設施陣列)
    -   `created_at`: Date
    -   `hash`: String (資料內容雜湊，用於比對是否有變更)

### Phase 4: API Serving
-   **Endpoint**: `GET /api/station/:id/facilities`
-   **Logic**:
    1.  查詢 `l3_snapshots` 取得最新一筆資料。
    2.  若無資料，Fallback 讀取 `src/data/stationWisdom.ts`。
    3.  根據 Request Header `Accept-Language` 回傳對應語系。

## 5. 品質保證 (QA & Monitoring)
### 5.1 驗證清單 (Validation Checklist)
-   [ ] **Schema Check**: 確保所有必要欄位 (type, location) 非空。
-   [ ] **Logic Check**: 樓層資訊是否符合 Regex (e.g., `B\d`, `\dF`)。
-   [ ] **Consistency**: 同一車站內不應有完全重複的設施項目。

### 5.2 異常監控
-   **HTML Structure Change**: 若抓取失敗率 > 20% 或選擇器失效，標記該 Scraper 為 `BROKEN` 並通知管理員。
-   **Zero Data Check**: 若某主要車站設施數為 0，視為異常。

## 6. 技術棧 (Tech Stack)
-   **Runtime**: Node.js (TypeScript)
-   **Browser**: Puppeteer
-   **DB**: Supabase (PostgreSQL)
-   **Framework**: Next.js 14 API Routes
-   **Validation**: Zod
