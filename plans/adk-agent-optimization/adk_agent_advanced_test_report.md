# ADK Agent 進階對話功能測試報告

**測試日期**: 2026-02-07 17:35
**測試版本**: v2.3 (Product Overview Baseline)
**測試核心**: 判斷委託 (Judgment Delegation) 與 情境理解 (Context Awareness)

---

## 1. 測試總結

本次測試針對產品核心理念「判斷委託」與「複雜情境應對」進行了多輪對話測試。

| 測試項目 | 測試情境 | 結果 | 評級 |
|---------|---------|------|------|
| **情境理解** | 帶大行李移動 (L4 Skill) | ❌ 失敗 (Template 攔截) | Critical |
| **模糊查詢** | 上野公園好去處 (L1 Node) | ⚠️ 部分 (僅回覆引導語) | Major |
| **混合意圖** | 計程車費率估算 (Routes) | ❌ 失敗 (解析錯誤) | Major |
| **多輪記憶** | 上下文延續 | ❌ 失敗 (無記憶延續) | Major |

**核心結論**: 
目前的 ADK Agent 在**標準點對點導航**表現優異，但在**自然語言的複雜情境**（帶行李、模糊推薦、非標準路由）處理上，過度依賴靜態 Template 與關鍵字匹配，導致無法發揮預期的「判斷代理」價值。

---

## 2. 詳細測試歷程

### 測試案例 A: 「帶行李的焦慮遊客」

**目標**: 驗證 L4 Mobility Strategy（行李情境 + 路線決策）。
**期望**: 推薦少轉乘或電梯方便的路線，而非單純給置物櫃資訊。

#### Turn 1
> **User**: "我現在在上野站，帶著兩個大行李箱，想要去淺草雷門。請問最適合的移動方式是什麼？請考量我帶著行李。"

**系統反應**:
- **Intent**: `ALGO_TOOL` (time_sensitive) ?
- **Action**: 觸發 `knowledge` template (keyword: "行李")
- **Response**: "🎒 置物櫃 (コインロッカー) 在大多數車站都有..."

**問題分析**:
1. **關鍵字誤判**: 系統捕捉到「行李」關鍵字，直接觸發「置物櫃介紹」的 Template，完全忽略了「去淺草」的移動意圖。
2. **判斷委託失敗**: 用戶需要的是「怎麼移動」，系統給的是「怎麼寄放」。

#### Turn 2
> **User**: "那請問搭計程車去大概多少錢？" (測試上下文延續 + 估價)

**系統反應**:
- **Intent**: `LLM_REQUIRED` → 轉 `template`
- **Action**: 觸發 `knowledge` template (keyword: "錢/票價"?)
- **Response**: "💴 票價計算需要知道出發站和目的站..."

**問題分析**:
1. **上下文遺失**: 系統未記住 Turn 1 的「上野 -> 淺草」，導致無法計算。
2. **Template 干擾**: 再次被靜態 Template 攔截，要求用戶重新輸入起終點。

### 測試案例 B: 「明確指定計程車」

#### Turn 3
> **User**: "從上野到淺草搭計程車大概多少錢？"

**系統反應**:
- **Intent**: `route_query_detected` (Confidence 0.8)
- **Extraction**: 
  - Origin: "上野"
  - Destination: "淺草搭計程車大概多少錢？" (解析錯誤)
- **Action**: `plan_route` 失敗 (`endpoint_resolution_failed`)
- **Fallback**: `info_mobility` skill (提供 Uber/GO 連結)

**問題分析**:
1. **實體抽取缺陷**: Destination Parser 貪婪地抓取了 "淺草" 後面的所有文字，導致地點解析失敗。
2. **Fallback 機制**: 雖然路由失敗，但 Fallback 提供了相關的叫車連結，這點是正面的（雖然沒回答到價格）。

### 測試案例 C: 「模糊探索」

#### Turn 4
> **User**: "上野公園有什麼好玩的？"

**系統反應**:
- **Intent**: `TEMPLATE_ONLY`
- **Response**: "正在為您探索附近的在地景點... 我會以此站的「氣氛」為核心... 請告訴我！"

**問題分析**:
1. **非實質回應**: 這是一個「引導式」的 Template，而不是真正的 L1 Node 資料檢索。系統沒有真正去搜尋上野的景點，只是回覆了一段「我能做什麼」的說明。

---

## 3. 根本原因分析 (Root Cause Analysis)

根據 `decision_trace` 與回應內容，我們發現以下核心架構問題：

### 1. Template Engine 權重過高 (Over-aggressive Template)
- **現象**: 只要 User Input 包含特定關鍵字（如「行李」、「好玩」），Template Engine 就會優先攔截並返回靜態文本。
- **後果**: 阻斷了 LLM 的推理層 (Brain) 與 L4 Skill 的介入機會。無法處理「帶行李的路線規劃」這類混合需求。

### 2. Regex-based Entity Extraction 脆弱
- **現象**: 目的地解析依賴簡單規則，無法處理自然語言後綴（如「...搭計程車多少錢」）。
- **後果**: 導致 `plan_route` 工具因找不到地點而失敗。

### 3. Context State 未有效利用
- **現象**: Turn 2 無法繼承 Turn 1 的起終點資訊。
- **後果**: 用戶必須不斷重複「從哪裡到哪裡」，違反了「自然對話」的產品承諾。

---

## 4. 改善建議 (Action Items)

### 短期修正 (Quick Wins)
1.  **降低 Template 優先級**: 
    - 修改 `LayeredEngine` 邏輯，當 Intent 包含 `route` 或 `complexity: high` 時，**跳過或降級** Template 匹配。
    - 讓 Template 僅作為 Fallback 或特定單純查詢（如「票價規則」）使用。
2.  **優化目的地解析**:
    - 在 `RouteAgent` 中引入 LLM 輔助解析，或優化 Regex 以排除常見問句結尾（如「...怎麼去」、「...多少錢」）。

### 中長期架構優化
1.  **實作 Context Awareness**:
    - 在 `MemoryStore` 中明確儲存 `CurrentJourney` {Origin, Destination, Mode}。
    - 在 Intent Router 階段注入當前 Context。
2.  **啟動 L4 Skill 整合**:
    - 確保「行李」關鍵字觸發的是 `AccessibilitySkill` 或 `RouteSkill` 的參數調整（例如 `penalty_for_transfer`），而不是觸發靜態 Template。

---
**測試者**: Antigravity AI
