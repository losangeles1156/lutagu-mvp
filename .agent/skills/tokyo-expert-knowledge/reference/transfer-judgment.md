# Transfer Judgment Knowledge (轉乘判斷)

本文件定義 L4 轉乘建議的核心邏輯。
目標是回答：「怎麼搭最輕鬆？」與「我該在哪個車廂下車？」

## 1. TPI 轉乘痛苦評估 (Transfer Pain Index)

**應用場景**: 當有多條路線可選時，依據用戶狀態（行李、嬰兒車）推薦最不痛苦的路徑，而非單純最短時間。

### 評估維度
| 維度 | 說明 | 權重 (高/中/低) |
| :--- | :--- | :--- |
| **垂直移動** | 階梯 vs 電扶梯 vs 電梯。 | 高 (對攜帶行李者為 Critical) |
| **水平距離** | 轉乘通道長度 (例如東京站京葉線轉乘約 500m)。 | 中 |
| **人潮密度** | 該時段/路線的擁擠程度 (新宿 vs 代代木)。 | 中 |
| **動線複雜度** | 是否需要出站再進站 (橘色改札口)。 | 低 |

### 判斷邏輯 (Pseudo-Code)
```typescript
function calculateTPI(route: Route, userState: UserState): number {
  let painScore = 0;
  if (userState.hasLuggage && route.hasStairsOnly) painScore += 50;
  painScore += route.walkingDistance / 10; // 每 10m +1 分
  return painScore;
}
```

## 1.1 路線規劃權重邏輯 (Route Planning Weighting)

**應用場景**: 當 AI 需自行計算 A 到 B 的最佳路徑時 (Graph Search)。
**核心權重函數**: $Cost = W_t \times Time + W_p \times Price + W_e \times Effort$

### 權重係數表 (Weighting Coefficients)

| 用戶模式 (Persona) | $W_t$ (時間) | $W_p$ (價格) | $W_e$ (輕鬆度) | 策略說明 |
| :--- | :--- | :--- | :--- | :--- |
| **Business (商務)** | **2.0** | 0.1 | 0.8 | 時間就是金錢，只求最快。 |
| **Budget (小資)** | 0.5 | **2.5** | 0.5 | 願意轉乘 3 次只為省 100 円。 (Pass 優先) |
| **Family (親子)** | 0.8 | 0.2 | **3.0** | 絕對避開樓梯與長通道，只要有電梯遠一點也行。 |
| **Tourist (一般)** | 1.0 | 1.0 | 1.0 | 平衡模式 (預設)。 |

### 節點懲罰 (Node Penalties)
在 Graph 搜索中，特定節點需加上額外 Cost：
*   **轉乘懲罰 (Transfer Penalty)**: 每次轉乘 base cost +5 mins。
*   **迷宮懲罰 (Maze Penalty)**: 新宿/澀谷/東京轉乘 +10 mins (模擬迷路風險)。
*   **天氣懲罰 (Weather Penalty)**: 雨天時，非地下連鎖轉乘 +15 mins (避免濕身)。

---

## 2. 月台相對位置 (Platform & Car Positioning)

**應用場景**: 「搭哪節車廂比較好？」
**核心數據**: 每個車站/路線的「最佳車廂表」。

*   **最近出口**: 離主要改札口最近的車廂。
*   **轉乘最短**: 離轉乘通道/樓梯最近的車廂。
*   **電梯專用**: 離電梯最近的車廂 (對應 TPI 高優先級)。
*   **空車率高**: 通常頭尾車廂較空 (例外：轉乘站靠近頭尾時)。

---

## 3. 出口選擇邏輯 (Exit Selection)

**應用場景**: 「我該走哪個出口？」
**防呆機制**: 東京車站有 20+ 出口，必須精準指引。

*   **地面 POI 綁定**: 每個 L1 POI 需標記 `nearest_exit_id`。
*   **樓層資訊**: 標註出口位於 B1, 1F, 或 2F (如澀谷站複雜地形)。
*   **設施對應**: 該出口是否有手扶梯/電梯。

---

## 4. 直通運轉與轉乘陷阱 (Through-Service & Traps)

**應用場景**: 「這班車會直達嗎？App 叫我這裡轉車？」

### 4.1 直通運轉 (Through Service)
*   **常見誤區**:
    *   **半藏門線 -> 東急田園都市線**: 直通，不需下車。
    *   **東西線 -> JR 中央總武線**: 直通，但僅限特定班次。
*   **App 轉乘陷阱**:
    *   *現象*: 導航 App 有時會因「路線名稱變更」而建議下車由 A 線轉 B 線 (例如此為直通車)，其實根本不用動。
    *   *AI 對策*: 若看到「直通」字樣，請告訴 User **「坐著別動 (Stay on board)」**。

### 4.2 惡名昭彰的轉乘站 (Notorious Traps)
*   **蔵前站 (Kuramae Trap)**:
    *   *地雷*: **淺草線** 與 **大江戶線** 的蔵前站是**地上轉乘** (非站內直結)。
    *   *後果*: 必須刷出站，走一般道路 200-300 公尺，再刷進站。雨天極慘。
    *   *替代*: 建議改在「大門站」轉乘 (雖然遠一點但至少在室內)。
*   **東京站京葉線**: 詳細請見 `station-dungeon.md`。

**AI 提示語**:
> 「雖然 App 說在蔵前轉車比較快，但要走到戶外淋雨喔！建議多坐幾站去**大門站**轉比較輕鬆。」
