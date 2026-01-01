# 無障礙步行路網工具 (Pedestrian Accessibility Tool) 整合指南

本文件旨在指導 AI Agent 如何正確理解與使用 `get_nearby_accessibility_graph` 工具，以提供使用者精確的無障礙導航建議。

---

## 1. 工具使用說明 (Tool Specification)

### 1.1 功能描述
此工具用於檢索指定座標周邊的詳細步行路網數據，包含節點（Node）與路徑（Link）。數據經過優化，包含無障礙設施資訊（電梯、坡度、導盲磚等），適合用於回答輪椅使用者、推嬰兒車家長或視障人士的導航詢問。

### 1.2 API 接口規範

**函數名稱**: `get_nearby_accessibility_graph` (Supabase RPC)

**輸入參數 (Input Parameters)**:
| 參數名 | 類型 | 必填 | 預設值 | 說明 |
|---|---|---|---|---|
| `query_lat` | float | 是 | - | 查詢中心點緯度 (WGS84) |
| `query_lon` | float | 是 | - | 查詢中心點經度 (WGS84) |
| `radius_meters` | float | 否 | 100 | 搜尋半徑 (公尺)，建議範圍 50-200 |

**輸出格式 (Output Format)**:
回傳一個 JSON 物件陣列，包含 `node` 和 `link` 兩種類型的物件。

```json
[
  {
    "id": "node_123",
    "type": "node",
    "description": "Node ID: node_123. Floor: G. Outdoor. Connected to station: Ueno",
    "distance_from_query": 12.5,
    "coordinates": { "type": "Point", "coordinates": [139.7, 35.7] }
  },
  {
    "id": "link_456",
    "type": "link",
    "description": "Path segment from node_123 to node_789. Distance: 15m. Type: Walkway. Wheelchair Accessible (Elevator). Width Class: 3.",
    "distance_from_query": 10.2,
    "coordinates": { "type": "LineString", "coordinates": [...] }
  }
]
```

### 1.3 使用限制與邊界條件
1.  **覆蓋範圍**: 目前主要覆蓋東京都心重點車站（如上野、大江戶線沿線）。若查詢座標超出範圍，將回傳空陣列。
2.  **搜尋半徑**: 最大有效半徑約為 500m。過大的半徑可能導致回傳數據量過大或超時。
3.  **室內外銜接**: 數據包含部分室內節點，但複雜的站內立體結構（如多層轉乘）建議搭配 L3 站內設施數據使用。

---

## 2. 問題分類框架 (Question Classification Framework)

AI Agent 應根據使用者意圖，判斷是否調用此工具。

### 2.1 適用場景 (Trigger Scenarios)
| 分類代碼 | 場景描述 | 關鍵字範例 | 處理流程 |
|---|---|---|---|
| **NAV_WHEELCHAIR** | 輪椅使用者尋找路徑 | "輪椅怎麼去...", "有無障礙坡道嗎" | 調用工具 -> 過濾 `has_elevator_access`=true 的路徑 -> 生成建議 |
| **NAV_STROLLER** | 推嬰兒車家長詢問路況 | "推車方便嗎", "有電梯嗎" | 調用工具 -> 檢查路寬與坡度 -> 確認電梯連接 |
| **NAV_VISUALLY_IMPAIRED** | 視障人士詢問導引 | "有導盲磚嗎", "路好走嗎" | 調用工具 -> 過濾 `has_braille_tiles`=true 的路徑 -> 描述路況 |
| **NAV_WEATHER** | 雨天/惡劣天氣路徑 | "下雨走哪裡", "有地下道嗎" | 調用工具 -> 過濾 `has_roof`=true 或 `is_indoor`=true 的路徑 |

### 2.2 不適用場景 (Non-Trigger Scenarios)
*   詢問列車時刻表 (使用 ODPT API)。
*   詢問票價 (使用 Fare Calculator)。
*   詢問店鋪評價 (使用 Google Places 或 L1 Data)。

---

## 3. 使用者回饋機制 (User Feedback Mechanism)

為了持續優化 AI 的回答品質，建立結構化的回饋系統。

### 3.1 雙向回饋通道
*   **前端介面**: 在 AI 回答下方提供 👍 (Helpful) / 👎 (Not Helpful) 按鈕。
*   **詳細回饋**: 若點擊 👎，彈出選項：
    *   "路徑不存在"
    *   "無障礙資訊錯誤 (如電梯故障)"
    *   "繞路太遠"
    *   "其他"

### 3.2 數據庫結構 (Proposed Schema)
```sql
CREATE TABLE ai_tool_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT,
    tool_used TEXT DEFAULT 'get_nearby_accessibility_graph',
    user_rating BOOLEAN, -- true=good, false=bad
    feedback_category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. 數據品質保障 (Data Quality Assurance)

### 4.1 驗證規則
1.  **連通性檢查**: 確保所有 Link 的 `start_node` 和 `end_node` 都存在於 Nodes 表中。
2.  **屬性完整性**: 檢查關鍵欄位 (`width`, `slope`, `barrier_free_flag`) 是否有 NULL 值。
3.  **孤島檢測**: 找出無法連接到主路網的孤立節點群。

### 4.2 自動化檢測流程
*   **週期**: 每週執行一次 `scripts/qa/audit_pedestrian_graph.ts`。
*   **警報**: 若孤立節點超過 5% 或關鍵屬性缺失率 > 1%，發送通知給維護團隊。

---

## 5. 功效評估體系 (Efficacy Evaluation)

### 5.1 關鍵效能指標 (KPIs)
1.  **工具調用成功率 (Tool Success Rate)**: AI 決定調用工具後，成功回傳非空數據的比例。
2.  **回答滿意度 (CSAT)**: 使用者對無障礙相關問題的按讚率。
3.  **路徑有效性 (Path Validity)**: (需人工抽樣) AI 建議的路徑在現實中是否可行。

### 5.2 評估報表
*   利用 Supabase Dashboard 或自定義腳本生成月報，分析哪些區域 (Geo-hash) 的查詢滿意度最低，作為下個月數據採集的重點區域。
