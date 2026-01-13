---
description: "Luggage Logistics: Coin Locker & Hands-Free Service Finder"
version: "1.0"
---

# Luggage Logistics (行李寄存與空手觀光)

## 1. Trigger Conditions (觸發條件)
該技能在以下情況被觸發：
- **Explicit**: 用戶詢問「哪裡有置物櫃？」、「行李很重怎麼辦？」、「可以寄放行李嗎？」。
- **Context**: 用戶 Profile 包含 `largeLuggage`, `heavy`.
- **Keywords**: `locker`, `coin locker`, `baggage`, `luggage`, `heavy`, `store`, `keep`, `yamato`, `sagawa`, `hands-free`, `寄物`, `置物櫃`, `行李`, `重`, `寄放`, `宅急便`.

## 2. Core Logic (核心邏輯)
此技能旨在推廣 "Hands-Free Tourism" (空手觀光) 政策。

### Step 1: Real-time Authenticity Check (即時狀態檢查)
- 查詢當前車站的置物櫃 (Coin Locker) 狀態 API (模擬)。
- 判斷大型 (Large/Extra Large) 置物櫃的可用性。

### Step 2: Fallback Strategy (備援策略)
- 若置物櫃全滿 (Full)，**必須** 尋找替代方案：
  - **Baggage Storage Counters** (有人工管理的寄物處，如 Sagawa/Yamato/Tourist Center)。
  - **Ecbo Cloak** (店鋪寄放服務)。

### Step 3: Forwarding Suggestion (運送建議)
- 若行程是「前往機場」或「更換飯店」，主動建議 **Baggage Delivery** (行李宅急便) 直送飯店/機場。

## 3. Response Format (回覆架構)
```json
{
  "strategy": "luggage_logistics",
  "station": "Shinjuku Station",
  "locker_status": "Full (Critical)",
  "solution": {
    "type": "Manned Counter",
    "name": "Sagawa Hands-Free Center",
    "location": "South Exit (New South Gate)",
    "price": "800 JPY/day"
  },
  "user_message": "⚠️ 新宿站內的置物櫃目前**全滿**！帶著大行李會非常辛苦。強烈建議您前往南口的 **Sagawa Hands-Free Center** 人工寄物處，那裡保證有位子，而且可以直接把行李寄到您今晚入住的飯店喔！🎒"
}
```

## 4. Nuance & Tone (語氣指導)
- **急迫感**: 若置物櫃滿了，要表現出「拯救者」的姿態，因為拖著行李在東京移動是惡夢。
- **實用主義**: 直接給出確切地點 (如「南口」、「改札外」)。
