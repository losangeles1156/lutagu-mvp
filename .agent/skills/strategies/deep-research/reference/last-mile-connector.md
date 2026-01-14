# Last Mile Connector

## 🎯 Goal
解決「車站到目的地」之間 >800m 或路況複雜的移動問題。
整合步行、計程車、共享單車 (LUUP/Hello Cycling) 與巴士方案。

## ⚙️ Trigger
當用戶詢問：
*   "[車站] 到 [景點] 怎麼去？" (且距離不近)
*   "走過去要多久？"
*   "有沒有公車？"

## 🧠 Execution Steps

1.  **Distance Check (距離檢核)**:
    *   `< 500m`: 步行 (Walking).
    *   `500m - 1.5km`: 邊走邊逛 (if scenic) OR 共享單車/巴士.
    *   `> 1.5km`: 計程車 (Taxi) OR 巴士.

2.  **Scenario Analysis (情境分析)**:
    *   **User Context**: 行李多？ -> Taxi only.
    *   **Vibe Context**: 沿途是商店街 (Fun to walk) 還是無聊住宅區 (Boring)？
    *   **Weather**: 下雨？ -> Taxi priority.

3.  **Mode Recommendation**:
    *   **LUUP (E-scooter)**: 適合單人、短程、趕時間。需提醒下載 App。
    *   **Taxi (Go/Uber)**: 適合多人分擔車資、有行李。提供預估車資 (Base Fare 500 yen + ...)。
    *   **Bus (Toei/Community Bus)**: 適合省錢，但需提供精確站牌與班次頻率 (如：1小時僅1班則不推)。

## 📝 Example Scenarios

### Case: 淺草站 -> 今戶神社 (招財貓神社)
*   **Distance**: ~1.3km.
*   **Analysis**: 走路約 15-20 分，沿途風景普通。
*   **Recommendation**:
    *   **Option A (趣)**: 租借淺草附近的 **LUUP** 滑板車，沿隅田川騎過去 (約 5-8 分)。
    *   **Option B (省)**: 搭乘 **熊貓巴士 (Panda Bus)** 免費巡迴車。

### Case: 六本木 -> 西麻布 (Nishi-Azabu)
*   **Distance**: ~1km.
*   **Analysis**: 上下坡多，走路累。
*   **Recommendation**:
    *   **Taxi**: 起步價內可到 (約 500-700 日圓)，多人share 很划算。 All-nighter 族群首選。

## 🗣️ Response Template
"從 [車站] 到 [目的地] 距離約 [X] 公里，走路需要 [Y] 分鐘。
建議方案：
*   **[推薦方案 1 - 舒適]**: 搭計程車約 [Z] 日圓，省力。
*   **[推薦方案 2 - 體驗]**: 沿途會經過 [有趣的點]，天氣好可以散步。
*   ⚠️ 注意：那邊是 [上坡/複雜路口]，帶著行李建議直接搭車。"
