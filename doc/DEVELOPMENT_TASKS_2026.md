# 2026 Q1 Development Plan: Deep Research & Intelligence

## Phase 1: 向量數據庫啟用 (Vector DB Activation) [優先]

### [x] 1.1 修復 vector-search-rs 持久化問題
- [x] 移除 `main.rs` 中的 `delete_collection` 啟動清除邏輯
- [x] 改為條件式初始化：僅在 collection 不存在時創建
- **驗證**: 重啟服務後確認數據仍存在

### [x] 1.2 連接主應用與向量服務
- [x] 在 `src/lib/api/` 新增 `vectorService.ts`
- [x] 實作 `searchVectorDB(query: string)` 函數
- [x] 在 `HybridEngine.ts` 中整合調用

### [ ] 1.3 知識庫遷移至向量庫
- [ ] 將 `expertKnowledgeBase.ts` 的靜態規則轉為 Embedding
- [ ] 將 `tokyo_transit_knowledge_base.md` 切片並上傳 Qdrant
- **驗證**: `FareRulesSkill` 可通過向量檢索回答

---

## Phase 2: 閉環學習機制 (Feedback Loop) [優先]

### [x] 2.1 建立 FeedbackLooper 服務
- [x] 新增 `src/lib/analytics/FeedbackLooper.ts`
- [x] 定時分析 `demand_signals` 表
- [x] 識別高頻未滿足需求 (Unmet Needs)

### 2.2 知識補充工作流
- [ ] 對於高頻缺失問題，自動生成 `CandidateKnowledge` (Draft)
- [ ] 通知管理員（或 User）審閱新知識

---

## Phase 3: 時間與情境智能 (Temporal Intelligence)

### 3.1 注入假日邏輯
- [ ] 修改 `L4DecisionEngine.evaluate(context)`
  - [ ] 增加 `dayType: 'weekday' | 'weekend' | 'holiday'` 欄位
  - [ ] 讀取 `timeUtils.ts` 的 `isHoliday`
- [ ] 更新 `KnowledgeTrigger` 介面，支援 `allowed_days: ['weekday']` 等設定

### 3.2 優化 L2 演算法上下文
- [ ] 修改 `findRoutes`，傳入 `isHoliday`
- [ ] 若後端支援，將此參數傳遞給 Rust Routing Engine

---

## Phase 4: UI 整合 (AI Insights)

### 4.1 新增 AI Insight 元件
- [ ] `src/components/chat/AmenityCard.tsx` (擴充顯示 Semantic Search 結果)
- [ ] 增加 "引用來源" (Citation) 樣式

### 4.2 驗證測試
- [ ] 編寫 `chat_flow.spec.ts` 測試案例：
  - [ ] "Where is strict/quiet?" -> 觸發 Vector Search
  - [ ] "Is it crowded today?" -> 觸發 Temporal Logic (Holiday check)
