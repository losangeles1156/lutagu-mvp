---
description: "Spatial Reasoner: Anomaly Decision & Cross-Station Geometry"
version: "1.0"
---

# Spatial Reasoner (異常決策與空間幾何推理)

## 1. Trigger Conditions (觸發條件)
該技能在以下情況被觸發：
- **Context**: 偵測到路線延遲 (`status: delay/suspended`) 且 用戶有明確目的地 (Intent: `Navigation` to `B`).
- **Explicit**: 用戶詢問「車停了怎麼辦？」、「趕時間有別條路嗎？」。
- **Keywords**: `delay`, `stopped`, `rush`, `alternative route`, `how to get to`.

## 2. Core Logic (核心邏輯)
此技能執行 **Cross-Station Geometry Search**。

### Step 1: Identify Conflict (識別衝突)
- 鎖定用戶目前位置 (Station A) 與 目標路線 (Route X)。
- 確認 Route X 狀態異常。

### Step 2: Neighbor Scan (鄰近掃描)
- 搜尋半徑 **1.5 km** 內的其他鐵路站點 (Station B, C...)。
- **排除** 同屬 Route X 的站點。

### Step 3: Exit-to-Destination Calc (出口路徑計算)
- 對於每個替代站 (Station B)，計算其 **最優出口** 到使用者 **目的地** 的步行距離。
- 使用 Haversine 或 Google Maps Distance Matrix (模擬)。
- 關鍵比較：`T(Waiting) + T(Slow Train)` vs `T(Walk to B) + T(Fast Train) + T(Walk from B Exit)`.

### Step 4: Decision Making (決策)
- 若 `Path B` 總耗時 < `Path A` (含等待預估)，推薦換乘。
- 若 `Path B` 步行距離 > 800m 且天氣不佳 (Rain)，則降低權重。

## 3. Response Format (回覆架構)
```json
{
  "strategy": "spatial_reasoner",
  "anomaly": "Chuo Line (Severe Delay)",
  "current_location": "Shinjuku Station",
  "destination": "Tokyo Metropolitan Gov",
  "recommendation": {
    "action": "Switch Station",
    "target_station": "Nishi-Shinjuku (Marunouchi Line)",
    "target_exit": "Exit C13 (Underground Tunnel)",
    "reasoning": "Nishi-Shinjuku is physically closer to the destination (400m vs 900m from JR). Avoids the delayed Chuo Line.",
    "time_saved_est": "15 mins"
  },
  "user_message": "中央線目前嚴重延遲，建議你改搭**丸之內線**到**西新宿站**。雖然要轉乘，但西新宿站 C13 出口有地下連通道直通都廳，走過去反而比從 JR 新宿站走更近，也能避開混亂人潮。"
}
```

## 4. Nuance & Tone (語氣指導)
- **冷靜果斷**: 在混亂中給予明確指令，不要模稜兩可。
- **數據支撐**: 提及「距離更近」、「直通」等具體空間優勢，增加說服力。
