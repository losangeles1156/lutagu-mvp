# 2026 MaaS 1.0 落差補齊開發任務

> **目標**: 解決 GAP_ANALYSIS_2026.md 中識別的核心技術落差
> **優先級排序**: 基礎架構啟用 → 閉環學習 → L3 數據補完 → 路由個人化

---

## Phase 1: 向量數據庫啟用 (Vector DB Activation) ✅ 完成

### [x] 1.1 修復 vector-search-rs 持久化問題
- 移除 `main.rs` 中的 `delete_collection` 啟動清除邏輯
- 改為條件式初始化：僅在 collection 不存在時創建
- **驗證**: 通過

### [x] 1.2 連接主應用與向量服務
- 新增 `src/lib/api/vectorService.ts`
- 實作 `searchVectorDB(query: string)` 函數
- 在 `HybridEngine.ts` 中整合調用

### [x] 1.3 知識庫遷移至向量庫
- HybridEngine 已整合向量檢索至 RAG 流程
- **待辦**: 實際數據上傳至 Qdrant (需啟動服務)

---

## Phase 2: 閉環學習機制 (Feedback Loop) ⏳ 進行中

### [x] 2.1 建立 FeedbackLooper 服務
- 新增 `src/lib/analytics/FeedbackLooper.ts`
- 定時分析 `demand_signals` 表
- 識別高頻未滿足需求 (Unmet Needs)

### [ ] 2.2 自動知識補充觸發
- 當某站點 Unmet Need 超過閾值時，生成開發工單
- 或觸發爬蟲/LLM 自動補充知識

### [ ] 2.3 權重調整機制
- 實作 `WeightAdjuster`
- 將調整後的權重回寫至用戶 Profile

---

## Phase 3: L3 數據補完 (L3 Topology) ⏸️ 待執行

### [ ] 3.1 合成拓撲數據計畫
### [ ] 3.2 垂直移動阻力標註

---

## Phase 4: 路由個人化 (Personalized Routing) ⏸️ 待執行

### [ ] 4.1 重構 Rust Routing API
### [ ] 4.2 動態權重計算

---

## 參考文件
- [GAP_ANALYSIS_2026.md](./GAP_ANALYSIS_2026.md)
