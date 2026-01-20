# LUTAGU 知識幻覺深度分析報告

**日期**: 2026-01-20
**問題**: AI 錯誤聲稱京急線從羽田機場可以「直達」東京車站
**狀態**: 🔴 嚴重知識錯誤

---

## 問題摘要

用戶詢問「羽田機場去東京車站怎麼走」時，AI 可能錯誤回應京急線可以「直達」，實際上：

**正確答案**: 京急線從羽田機場到東京車站**需要在品川轉乘**

**路線實情**:
1. 羽田機場 → (京急線) → 品川站
2. 品川站 → (JR 山手線 / 京濱東北線) → 東京車站

---

## 根因分析

### 1. 知識庫錯誤（L4 層）

**錯誤位置**: `knowledge/stations/riding_knowledge/area12_haneda_airport.md:63`

**錯誤內容**:
```markdown
- [Hack] 🛫 **入境後交通選擇**: 入境後可選擇京急或東京單軌電車。
  京急直達品川、東京；東京單軌電車直達濱松町、澀谷（需轉乘）。
```

**問題**: 「京急直達品川、東京」中的「東京」是錯誤的。京急線**不直達**東京車站。

### 2. 知識不完整（缺少關鍵轉乘資訊）

**缺少內容**:
- 沒有明確說明「羽田機場 → 東京車站需要在品川轉乘」
- 沒有在 `transferDatabase.ts` 中定義品川站的京急 → JR 轉乘資訊
- 沒有在常見問題中列出「羽田機場到東京車站」的標準路線

### 3. 模型預訓練知識干擾

**LLM 預訓練知識**可能包含：
- 過時的交通資訊（如舊時代的直通運轉計畫）
- 混淆「都營淺草線直通運轉」與「京急直達東京車站」的概念
- 將「可以到達東京」誤解為「直達東京車站」

**頑固性**:
- 即使 Prompt 中提供正確資訊，模型仍可能堅持己見
- 模型對預訓練知識的信心度過高，覆蓋外部知識注入

### 4. Prompt 工程不足

**當前 System Prompt 問題**:
- 缺少「Database facts OVERRIDE your pre-trained knowledge」的明確指令
- 沒有強制模型引用資料來源
- 缺少「如果不確定轉乘資訊，說不知道」的指令

---

## 知識正確性驗證

### 京急線實際路線

**京急本線** (`odpt.Railway:Keikyu.Main`):
- 起點: 泉岳寺（與都營淺草線直通）
- 經過: 品川、京急蒲田、京急川崎、橫濱
- 終點: 浦賀

**京急機場線** (`odpt.Railway:Keikyu.Airport`):
- 起點: 京急蒲田（從本線分岐）
- 終點: 羽田機場第3航廈

**直通運轉**:
- 京急線 ⇄ 都營淺草線（直通運轉）
- 都營淺草線可達: 淺草橋、日本橋、大門（濱松町附近）
- **重點**: 都營淺草線**不經過東京車站**

### 正確路線（羽田 → 東京車站）

**方案 1: 京急線 + JR**（最常見）
1. 羽田機場第1・2航廈 → (京急機場快特, 11分) → 品川
2. 品川 → (JR 山手線/京濱東北線, 9分) → 東京車站
- **總時間**: 約 25 分鐘（含轉乘）
- **票價**: ¥483（京急 ¥300 + JR ¥183）

**方案 2: 東京單軌電車 + JR**
1. 羽田機場第3航廈 → (東京單軌電車, 17分) → 濱松町
2. 濱松町 → (JR 山手線, 6分) → 東京車站
- **總時間**: 約 28 分鐘（含轉乘）
- **票價**: ¥653（單軌 ¥500 + JR ¥153）

**方案 3: 京急線 + Metro**（較少人用）
1. 羽田機場 → (京急) → 日本橋
2. 日本橋 → (步行/Metro 轉乘, 10分) → 東京車站
- **總時間**: 約 35 分鐘
- **票價**: 較複雜

---

## 影響範圍評估

### 高風險查詢

所有包含以下組合的查詢都可能受影響：

1. **羽田機場 + 東京車站**
   - 「羽田機場去東京車站」
   - 「羽田到東京怎麼走」
   - 「從機場到東京站最快路線」

2. **京急線 + 直達聲稱**
   - 「京急線可以到東京車站嗎」
   - 「京急線需要轉車嗎」

3. **其他潛在錯誤**
   - 任何涉及「直通運轉」的路線（可能混淆概念）
   - 跨運營商的路線規劃

### 潛在後果

- **用戶信任度下降**: 提供錯誤資訊導致用戶迷路
- **品牌形象受損**: 「連基本路線都錯誤」的負面評價
- **競爭力喪失**: 用戶改用 Google Maps 等更可靠的工具

---

## 修復方案設計

### 方案 1: 緊急知識庫修正（1-2 小時）✅ 推薦立即執行

**執行內容**:
1. **修正錯誤知識** (`area12_haneda_airport.md:63`)
   - 原文: 「京急直達品川、東京」
   - 修正: 「京急直達品川（需轉乘 JR 到東京車站）」

2. **添加「交通真相資料庫」** (Ground Truth DB)
   - 建立 `services/chat-api/src/data/transit_ground_truth.json`
   - 收錄高風險路線的正確答案

   ```json
   {
     "haneda_to_tokyo_station": {
       "origin": "羽田機場",
       "destination": "東京車站",
       "correct_answer": {
         "requires_transfer": true,
         "transfer_station": "品川",
         "route": [
           {"leg": 1, "from": "羽田機場", "to": "品川", "line": "京急線", "time_min": 11},
           {"leg": 2, "from": "品川", "to": "東京車站", "line": "JR 山手線", "time_min": 9}
         ],
         "total_time_min": 25,
         "total_fare_yen": 483
       },
       "incorrect_claims": [
         "京急線直達東京車站",
         "不需要轉乘",
         "京急可以直接到東京"
       ]
     }
   }
   ```

3. **強化常見問題** (`area12_haneda_airport.md`)
   - 新增 Q&A: 「羽田機場到東京車站怎麼走？」
   - 明確說明需要在品川轉乘

**優點**:
- 立即可執行
- 低成本
- 直接修正錯誤來源

**缺點**:
- 無法保證模型會遵守
- 需要持續監控其他潛在錯誤

---

### 方案 2: 知識驗證層（3-5 天）✅ 推薦作為中期方案

**實施方式**:

1. **建立 Fact Checker 中間件**

   建立 `services/chat-api/src/lib/validation/FactChecker.ts`:

   ```typescript
   interface FactCheckRule {
     pattern: RegExp;
     checkFunction: (response: string, context: any) => Promise<{
       valid: boolean;
       correction?: string;
       confidence: number;
     }>;
   }

   // 檢測「直達」聲稱
   const DIRECT_ROUTE_RULE: FactCheckRule = {
     pattern: /(直達|不需轉乘|直接到達)/,
     checkFunction: async (response, context) => {
       // 檢查 Ground Truth DB
       // 檢查 ODPT 路線資料
       // 檢查 transferDatabase
       return {
         valid: false,
         correction: "京急線需要在品川轉乘 JR 才能到達東京車站",
         confidence: 0.95
       };
     }
   };
   ```

2. **整合到 HybridEngine**

   在 `HybridEngine.processRequest()` 中添加：

   ```typescript
   // AI 生成回應後
   const factCheckResult = await FactChecker.verify(
     aiResponse,
     {origin, destination, route: routeData}
   );

   if (!factCheckResult.valid && factCheckResult.confidence > 0.8) {
     // 自動修正或標記警告
     aiResponse = factCheckResult.correction;
     logger.warn('[FactCheck] Auto-corrected hallucination', {
       original: aiResponse,
       corrected: factCheckResult.correction
     });
   }
   ```

**優點**:
- 可捕捉多種幻覺類型
- 不依賴模型的自律性
- 可累積錯誤案例資料庫

**缺點**:
- 需要額外開發時間
- 可能增加回應延遲（需優化）

---

### 方案 3: 強化 Prompt 工程（1 天）✅ 推薦作為短期輔助

**執行內容**:

1. **在 System Prompt 中添加強制指令**

   ```typescript
   const SYSTEM_PROMPT = `
   You are LUTAGU, a Tokyo transit AI assistant.

   CRITICAL RULES:
   1. Database facts ALWAYS OVERRIDE your pre-trained knowledge
   2. If the knowledge base says "requires transfer", you MUST NOT say "direct"
   3. When unsure about transfer requirements, say "I'm not certain"
   4. ALWAYS cite your data source when providing route information

   KNOWN FACTS (Ground Truth):
   - Keikyu Line from Haneda Airport REQUIRES TRANSFER at Shinagawa to reach Tokyo Station
   - Keikyu Line does NOT directly connect to Tokyo Station
   - Use JR Yamanote Line or Keihin-Tohoku Line from Shinagawa to Tokyo Station

   If your pre-trained knowledge conflicts with these facts, TRUST THE FACTS ABOVE.
   `;
   ```

2. **使用 Few-shot 範例**

   ```typescript
   const FEW_SHOT_EXAMPLES = [
     {
       user: "羽田機場到東京車站怎麼走",
       assistant: "從羽田機場到東京車站需要轉乘一次：\n1. 搭乘京急機場快特到品川（約11分鐘）\n2. 在品川轉乘JR山手線到東京車站（約9分鐘）\n總時間約25分鐘。"
     },
     {
       user: "京急線可以直達東京車站嗎",
       assistant: "不可以。京急線不直達東京車站，需要在品川轉乘JR山手線或京濱東北線。"
     }
   ];
   ```

**優點**:
- 快速實施
- 直接影響模型行為
- 可與方案 1、2 結合

**缺點**:
- 效果依賴模型能力
- 對於頑固幻覺可能無效

---

### 方案 4: 升級模型（長期，高成本）

**選項**:
1. **升級 Brain 到 Claude Opus 4.5**
   - 更強的推理能力
   - 更好的知識遵守性
   - 成本: ~3-5倍

2. **實施 RAG 架構**
   - 強制從知識庫檢索
   - 降低幻覺風險
   - 需要重新架構

3. **Fine-tune 專用模型**
   - 在東京交通資料上訓練
   - 最徹底的解決方案
   - 需要大量資料與成本

**建議**: 暫緩，先執行方案 1-3 並觀察效果

---

## 建議執行計畫（優先級排序）

### 🔴 P0: 立即執行（今日完成）

1. **修正知識庫錯誤**
   - 修改 `area12_haneda_airport.md:63`
   - 添加常見問題 Q&A
   - 估計時間: 30 分鐘

2. **建立交通真相資料庫**
   - 建立 `transit_ground_truth.json`
   - 收錄 10 個高風險路線
   - 估計時間: 1 小時

### 🟠 P1: 短期執行（1-2 天）

3. **強化 System Prompt**
   - 添加「Database facts override」指令
   - 添加 Few-shot 範例
   - 估計時間: 2 小時

4. **測試與驗證**
   - 執行幻覺測試腳本
   - 收集用戶反饋
   - 估計時間: 3 小時

### 🟡 P2: 中期執行（3-5 天）

5. **實施 Fact Checker 中間件**
   - 建立驗證層
   - 整合到 HybridEngine
   - 估計時間: 2 天

6. **擴充 Ground Truth DB**
   - 收錄 50 個常見路線
   - 添加多語言版本
   - 估計時間: 1 天

---

## 預期效果

### 方案 1 執行後:
- ✅ 修正已知錯誤
- ⚠️ 無法保證模型遵守
- 📊 預期改善率: 50-60%

### 方案 1 + 2 + 3 執行後:
- ✅ 多層防護機制
- ✅ 自動檢測與修正
- ✅ 強化模型指令
- 📊 預期改善率: 85-90%

### 長期目標:
- 建立完整的交通知識驗證系統
- 累積錯誤案例資料庫
- 持續優化 Prompt 工程

---

## 監控指標

### 關鍵指標:
1. **幻覺檢出率**: 每 100 次查詢中發現的錯誤次數
2. **自動修正率**: Fact Checker 成功修正的比率
3. **用戶反饋 NPS**: 路線建議的滿意度評分
4. **錯誤回報率**: 用戶主動回報錯誤的次數

### 監控方式:
- 在 `ai_chat_metrics` 表中添加 `hallucination_detected` 欄位
- 定期（每週）執行幻覺測試腳本
- 分析用戶 thumbs-down 反饋的內容

---

**報告結論**: 知識幻覺問題根源於知識庫錯誤與模型頑固性，建議立即執行 P0 修復方案，並在 1 週內完成 P1 方案部署。

**負責人**: Claude Code
**預計完成時間**: 2026-01-20（P0）、2026-01-22（P1）、2026-01-27（P2）
