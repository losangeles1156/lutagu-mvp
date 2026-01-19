# Dify Agent 工具配置規格書

> **版本**: 1.1 (簡化版)
> **更新日期**: 2026-01-05
> **目標**: 串接 LUTAGU L1-L3 數據，為 Agent 提供核心交通決策資訊

---

## 工具列表依據

本規格書中的工具是基於 LUTAGU 專案現有的後端 API 路由設計。透過分析 `src/app/api/` 目錄下的路由定義，確認以下工具對應的 API 端點**已經存在於後端**。

---

## 精簡後的工具總覽 (6 個核心工具)

| # | 工具名稱 | API 端點 | 提供數據 | 資料層 |
|---|----------|----------|----------|--------|
| 1 | `get_japan_time` | `/api/util/time` | 日期、時間、時段 (尖峰/深夜) | L2 |
| 2 | `get_weather` | `/api/weather/live` | 即時天氣、溫度 | L2 |
| 3 | `search_route` | `/api/odpt/route` | 路徑規劃 + 票價 (時間、轉乘、費用) | L1+L2 |
| 4 | `get_train_status` | `/api/odpt/train-status` | 延誤、停駛情報 | L2 |
| 5 | `get_station_context` | `/api/station/context` | 車站設施、POI、氛圍標籤、繁忙度 | L1+L3 |
| 6 | `search_expert_knowledge` | `/api/l4/knowledge` | 專家知識 (轉乘技巧/無障礙/票券) | L4 |

---

## 詳細工具規格

### 1. get_japan_time - 日本時間與時段

**用途**：判斷當前時間是否為尖峰時段，影響出行建議

**API 端點**：`GET /api/util/time`

**參數**：無

**回應格式**：
```json
{
  "jst_time": "2026-01-05 11:35:00",
  "hour_jst": 11,
  "period": "day",
  "day_of_week": "Monday"
}
```

---

### 2. get_weather - 即時天氣

**用途**：天氣影響出行決策，特別是戶外轉乘

**API 端點**：`GET /api/weather/live`

**參數**：無

**回應格式**：
```json
{
  "weather": "晴れ",
  "temp": 12.5,
  "humidity": 45,
  "icon": "sunny"
}
```

---

### 3. search_route - 路徑規劃 (含票價)

**用途**：**核心功能** - 規劃起點到終點的路線，同時返回票價資訊

**API 端點**：`GET /api/odpt/route`

**參數**：
| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `from` | string | ✅ | 出發站名 (日文或英文) |
| `to` | string | ✅ | 目的地站名 |
| `datetime` | string | ❌ | 出發時間 (ISO 8601) |

**回應格式**：
```json
{
  "routes": [
    {
      "distance": 15.2,
      "duration": 35,
      "transfers": 1,
      "fare": 210,
      "from": "上野",
      "to": "銀座",
      "legs": [
        {
          "line": "東京地鐵銀座線",
          "from": "上野",
          "to": "銀座",
          "departure_time": "11:40",
          "arrival_time": "11:50"
        }
      ]
    }
  ]
}
```

---

### 4. get_train_status - 運行狀態

**用途**：查詢各線路的延誤、停駛情報

**API 端點**：`GET /api/odpt/train-status`

**參數**：
| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `operator` | string | ❌ | 營運商 (如 "JR-East", "TokyoMetro") |

**回應格式**：
```json
{
  "status": [
    {
      "operator": "JR-East",
      "line": "山手線",
      "status": "normal",
      "delay_minutes": null
    },
    {
      "operator": "JR-East",
      "line": "京浜東北線",
      "status": "delay",
      "delay_minutes": 15,
      "description": "Signal trouble near Akihabara"
    }
  ]
}
```

---

### 5. get_station_context - 車站上下文

**用途**：獲取車站的完整資訊，含設施、POI、氛圍標籤、繁忙度

**API 端點**：`GET /api/station/context`

**參數**：
| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `station_id` | string | ✅ | 車站 ID (ODPT 格式) |
| `locale` | string | ❌ | 回應語言 (ja/en/zh-TW) |

**回應格式**：
```json
{
  "station_id": "odpt.Station:JR-East.Ueno",
  "busy_level": "Moderate",
  "annual_journeys": 180000000,
  "vibe_tags": {
    "zh-TW": ["文化", "購物"],
    "ja": ["文化", "アメ横"],
    "en": ["culture", "shopping"]
  },
  "facilities": {
    "toilets": ["B1F 驗票口內", "1F 南口"],
    "elevators": ["JR 側電梯通往月台"],
    "lockers": ["大型置物櫃 50 個, 北口附近"]
  },
  "nearby_pois": [
    {"name": "上野恩賜公園", "distance": "50m", "type": "park"},
    {"name": "阿美橫町", "distance": "100m", "type": "market"}
  ],
  "active_alerts": []
}
```

---

### 6. search_expert_knowledge - 專家知識庫

**用途**：搜尋轉乘技巧、無障礙指引、票券建議等專家知識

**API 端點**：`GET /api/l4/knowledge`

**參數**：
| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `type` | string | ✅ | 知識類型 |
| `id` | string | ❌ | 站 ID 或路線 ID |
| `tags` | string | ❌ | 標籤篩選 |
| `locale` | string | ❌ | 回應語言 |

**type 支援值**：
| type | 說明 |
|------|------|
| `railway` | 路線專家建議 |
| `station` | 車站專家建議 |
| `accessibility` | 無障礙指引 |
| `location` | 特殊地點資訊 |
| `passes` | 票券建議 |
| `crowd` | 避開人潮建議 |

**回應格式**：
```json
{
  "type": "station",
  "station_id": "odpt.Station:JR-East.Tokyo",
  "tips": [
    {
      "title": "京葉線月台位置",
      "content": "京葉線月台在地下 B1F，從丸之內線月台步行約 5 分鐘。建議預留 10 分鐘轉乘時間。",
      "tags": ["轉乘", "月台位置"],
      "accessibility_note": "有電梯可直達京葉線月台"
    }
  ],
  "count": 1
}
```

---

## Context Variables 注入

| 變數名稱 | 說明 | 範例 |
|----------|------|------|
| `current_station` | 用戶目前所在站 | "上野" |
| `user_profile` | 用戶類型 | "wheelchair", "stroller", "luggage", "general" |
| `locale` | 偏好語言 | "zh-TW", "ja", "en" |
| `realtime_status` | L2 即時狀態 | "{'京葉線': 'delay'}" |
| `weather` | 即時天氣 | "晴, 12°C" |

---

## 數據來源對照表 (簡化版)

| 數據需求 | 對應 API | 資料層 | 更新頻率 | 對應工具 |
|----------|----------|--------|----------|----------|
| 日期時間 | `/api/util/time` | L2 | 每次請求 | get_japan_time |
| 天氣 | `/api/weather/live` | L2 | 每 5 分鐘 | get_weather |
| 路徑規劃 | `/api/odpt/route` | L1+L2 | 即時 | search_route |
| 票價 | `/api/odpt/route` | L1 | 靜態 (內含) | search_route |
| 延誤情報 | `/api/odpt/train-status` | L2 | 每 1 分鐘 | get_train_status |
| 車站設施 | `/api/station/context` | L3 | 每次請求 | get_station_context |
| 專家知識 | `/api/l4/knowledge` | L4 | 定期更新 | search_expert_knowledge |

---

## 結論

**6 個核心工具**覆蓋您需求的所有數據來源：

- ✅ 日期時間 → `get_japan_time`
- ✅ 天氣 → `get_weather`
- ✅ 路徑規劃 + 票價 → `search_route` (合併)
- ✅ 延誤情報 → `get_train_status`
- ✅ 車站設施 → `get_station_context`
- ✅ 專家知識 (轉乘技巧/無障礙/票券) → `search_expert_knowledge`

**簡化重點**：
- ❌ 移除 `get_jma_alerts` - 氣象警報獨立工具
- ❌ 移除 `get_fare` - 票價獨立工具，整合至 `search_route`
- ❌ 移除 `get_hub_info` - 轉乘獨立工具，整合至 `get_station_context` 或 `search_expert_knowledge`

所有工具皆已存在於 LUTAGU 後端 API 中，可直接配置至 Dify 後台使用。
