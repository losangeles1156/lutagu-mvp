# Spatial Reasoner (Alternative Routing)

## 🎯 Goal
當發生「人身事故」、「運休」或「嚴重延誤」時，計算不依賴原本路線的替代路徑 (Detour)。
利用東京綿密的鐵路網 (JR vs Metro vs Toei vs Private) 進行異系統轉乘。

## ⚙️ Trigger
當用戶詢問：
*   "[路線 A] 停駛了怎麼辦？"
*   "人身事故卡住了，怎麼去 [目的地]？"
*   "我要去 [X]，但電車不動了"

## 🧠 Execution Steps

1.  **Identify Bottleneck (確認此路不通)**:
    *   確認用戶所在的車站與受影響的路線。
    *   *Example*: "JR 山手線停駛，人在新宿"。

2.  **Search Parallel Lines (搜尋平行替代線)**:
    *   利用 `mcp_supabase_execute_sql` 查詢同站或鄰近站的其他路線。
    *   **"Furikae Yusou" (振替輸送) Logic**: 尋找持有 Pass 或票券可免費搭乘的替代系統。

3.  **Calculate Detour (計算迂迴路徑)**:
    *   **Rule**: 避免經過「受影響區段」。
    *   **Tactics**:
        *   *U-Shape Detour*: 往反方向坐到轉乘大站，再換線切過去。
        *   *Walk to Neighbors*: 走到距離 < 800m 的鄰近不同系統車站 (如：人形町 -> 水天宮前)。

4.  **Validate Feasibility (驗證可行性)**:
    *   確認替代路線沒有同時也掛了 (常見於直通運轉同時延誤)。

## 📝 Example Scenarios

### Case: JR 山手線停駛 (Shinjuku -> Shibuya)
*   **Direct Route (Blocked)**: JR Yamanote Line.
*   **Solution**:
    *   **Option 1 (Subway)**: 轉乘 **Tokyo Metro 副都心線 (Fukutoshin Line)** (新宿三丁目 -> 澀谷)，最快。
    *   **Option 2 (Subway)**: 轉乘 **都營大江戶線** (新宿 -> 代代木)，再走過去(雖不建議但可行)。
    *   **Option 3 (Walk)**: 距離不遠，亦可考慮步行或 Taxi。

### Case: 東西線停駛 (Toyocho -> Otemachi)
*   **Direct Route (Blocked)**: Metro Tozai Line.
*   **Solution**:
    *   這區段平行線少，替代方案通常是 **都營巴士** 或 **Walk to Toei Shinjuku Line** (需步行一段距離)。
    *   建議用戶開啟 Google Maps 確認公車動態。

## 🗣️ Response Template
"由於 **[路線 A]** 目前停駛/延誤，建議改用以下替代方案：
1.  **[最佳替代]**: 走到 **[鄰近車站/路線]** 搭乘 **[路線 B]**。
    *   *優點*: 不受影響，時間差不多。
2.  **[備份方案]**: 如果有 JR Pass，可以改搭 [路線 C]。
⚠️ 注意：現在該路線可能人潮擁擠，請預留更多時間。"
