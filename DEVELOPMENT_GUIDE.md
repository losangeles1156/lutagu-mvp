# Lutagu 後端 AI Agent 改造專案 - 開發執行指南

本文件說明如何執行 Lutagu 後端改造專案的開發、測試與部署工作。本專案旨在將原有的後端系統升級為具備「智慧導航員」能力的 AI Agent 架構。

## 1. 環境準備 (Prerequisites)

確保您的開發環境已安裝：
- **Node.js**: v18+
- **npm**: v9+
- **Supabase Account**: 需具備專案存取權限

確認專案根目錄下的 `.env.local` 檔案包含正確的 Supabase 連線資訊：
```bash
NEXT_PUBLIC_SUPABASE_URL=您的_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=您的_ANON_KEY
SUPABASE_SERVICE_KEY=您的_SERVICE_ROLE_KEY
```

## 2. 資料庫遷移 (Database Migration) - **關鍵步驟**

由於本環境無法直接透過 CLI 執行遷移，請依照以下步驟手動更新資料庫，以啟用高效能空間查詢 (KNN Index Optimization)：

1. 登入 **Supabase Dashboard**。
2. 進入 **SQL Editor**。
3. 開啟新查詢 (New Query)。
4. 複製專案檔案 `supabase/migrations/20260102_fix_pedestrian_rpc.sql` 的完整內容。
5. 點擊 **Run** 執行 SQL。
   - **目的**：建立 `get_nearby_accessibility_graph` RPC 函式，支援 `<->` 運算子的空間排序。
   - **預期結果**：應顯示 "Success" 或 "No rows returned"。

## 3. 啟動開發伺服器 (Start Development Server)

執行以下指令啟動 Next.js 開發環境：

```bash
npm run dev
# 或指定埠口
npm run dev -- -p 3001
```

伺服器啟動後，API 端點將位於：`http://localhost:3001/api/...`

## 4. 執行驗證測試 (Verification & Testing)

本專案包含自動化回歸測試腳本，用於驗證標籤引擎 (Tag Engine) 與 API 回應格式。

執行測試指令：
```bash
# 執行升級後的整合測試
npm run qa:upgrade
```

**測試涵蓋範圍**：
- **Tag Engine**: 驗證餘弦相似度 (Cosine Similarity) 匹配邏輯。
- **Accessibility API**: 驗證 `/api/station/accessibility` 回應是否包含 Traceability (可追溯性) 與 Confidence (信心分數)。
- **Performance Report**: 驗證 `/api/admin/reports/performance` 是否產生正確的指標格式。

## 5. Dify Agent 整合 (Integration)

將 `lutagu_agent_dsl.yml` 匯入 Dify 平台以更新 Agent 設定：
- **角色設定**: 更新為「智慧導航員 (Intelligent Navigator)」。
- **Prompt**: 包含效能指標監控與多維度標籤解析邏輯。

## 6. 專案結構參考

- `src/lib/tagging/TagEngine.ts`: 標籤關聯引擎核心 (Cosine Similarity)。
- `src/app/api/station/accessibility/route.ts`: 無障礙設施查詢 API (含 Bayesian Confidence)。
- `src/app/api/admin/reports/performance/route.ts`: 系統效能報告 API。
- `SYSTEM_AUDIT.md`: 系統架構審計報告。

---
**下一步開發計畫**:
- 實作 `src/app/api/navigation/graph/route.ts` 以完整串接優化後的 RPC，提供路徑規劃所需的圖資資料。
