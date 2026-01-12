---
description: "Facility Pathfinder: Detailed Accessibility & Vertical Navigation"
version: "1.0"
---

# Facility Pathfinder (無障礙與垂直動線指引)

## 1. Trigger Conditions (觸發條件)
該技能在以下情況被觸發：
- **Context**: 用戶 Profile 包含 `wheelchair`, `stroller`, `elderly`, `luggage`.
- **Explicit**: 用戶詢問「有電梯嗎？」、「推車方便嗎？」、「可以不走樓梯嗎？」。
- **Keywords**: `elevator`, `escalator`, `stairs`, `barrier-free`, `baby car`.

## 2. Core Logic (核心邏輯)
此技能執行 **Vertical Graph Traversal**。

### Step 1: Profile Check (需求確認)
- `Wheelchair/Stroller`: 嚴格避開樓梯，優先尋找 `Elevator` (EV) 或 `Slope`。
- `Luggage/Elderly`: 可接受 `Escalator` (ES)，但優先 EV。

### Step 2: Facility Lookup (設施檢索)
- 查詢當前車站所有與 `accessibility` 相關的 L3 設施。
- 尋找關鍵字：`Ground to Concourse`, `Concourse to Platform`.

### Step 3: Chain Construction (路徑串接)
- 嘗試建立一條完整的垂直動線鍊：
  `Surface` -> `EV1` -> `B1 Concourse` -> `Ticket Gate` -> `EV2` -> `B2 Platform`.
- 若鍊條斷裂 (Missing Link)，標記為 **High Friction Warning**。

### Step 4: Exit Selection (出口篩選)
- 找出擁有完整動線的「黃金出口」。

## 3. Response Format (回覆架構)
```json
{
  "strategy": "facility_pathfinder",
  "target_user": "Stroller",
  "station": "Ueno Station",
  "path_quality": "Excellent",
  "golden_route": [
    { "step": 1, "action": "Enter via Park Exit", "facility": "Large Elevator (Capacity 15)" },
    { "step": 2, "action": "Pass Ticket Gate", "note": "Wide gate available on left" },
    { "step": 3, "action": "Down to Platform 3", "facility": "Elevator near Car 8" }
  ],
  "user_message": "帶推車的話，請務必走**公園口 (Park Exit)**。那裡有直通地面的大型電梯，且改札口最寬。進站後，往**8號車廂**方向走，那是唯一通往月台的電梯位置，其他入口都只有樓梯喔！🚧"
}
```

## 4. Nuance & Tone (語氣指導)
- **守護者**: 語氣要像是在提醒家人，充滿關懷與警告。
- **具體細節**: 必須提到「幾號車廂」、「哪個出口」，這是無障礙用戶最在意的資訊。
