# PLAN-phase11-optimization

> **Status**: APPROVED
> **Mode**: PLANNING
> **Focus**: Verification, QA, and Performance Hardening

## Overview
Phase 11 聚焦於 **「全面驗證與優化」 (Verification & Optimization)**。
在 Phase 4-10 完成了功能開發與 Deep Research 修復後，Phase 11 的目標是確保系統達到 **「商業發布標準」 (Production Ready)**。
這不只是修 Bug，更是對效能、安全、體驗的最後打磨。

## Success Criteria
1.  **測試覆蓋率**: 核心算法 (L4) 單元測試覆蓋率 > 80%。
2.  **多語系完整性**: 100% UI/Backend 字串支援 en/ja/zh-TW (無 Hardcoded strings)。
3.  **效能指標**: 首屏加載 (LCP) < 1.5s，API 響應 (P95) < 200ms。
4.  **穩定性**: 無 Critical/High 級別的安全漏洞或邏輯錯誤。

## Tech Stack
*   **Testing**: Vitest (Unit), Playwright (E2E)
*   **Performance**: Lighthouse CI, Bundle Analyzer
*   **Security**: OWASP ZAP (Scripted), Supabase RLS Audit

## Phase 11: Task Breakdown

### 11.1 Test Suite Expansion (測試擴展)
*   [ ] **TASK-11.1.1**: 建立 `AlgorithmProvider` 完整測試案例 (Mock Rust/DB)。
    *   *Input*: `src/lib/l4/algorithms/AlgorithmProvider.ts`
    *   *Output*: `src/lib/l4/algorithms/AlgorithmProvider.test.ts`
    *   *Verify*: Pass with multiple scenarios (Normal, Holiday, Suspended).
*   [ ] **TASK-11.1.2**: 建立 `DynamicContextService` 邊界測試。
    *   *Input*: `src/lib/l4/DynamicContextService.ts`
    *   *Output*: `src/lib/l4/DynamicContextService.test.ts`
    *   *Verify*: Test threshold logic (15min delay vs 5min delay).
*   [ ] **TASK-11.1.3**: 建立 `DataMux` 快取邏輯測試。
    *   *Input*: `src/lib/data/DataMux.ts`
    *   *Output*: `src/lib/data/DataMux.test.ts`
    *   *Verify*: Validate `Promise.allSettled` fallback behavior.

### 11.2 Multilingual Audit (多語系審查)
*   [ ] **TASK-11.2.1**: 全域掃描 Hardcoded English Strings。
    *   *Action*: 使用 Regex 掃描 `src/**/*` 尋找未 wrap `t()` 的字串。
    *   *Output*: `docs/audit/i18n_report.md`
*   [ ] **TASK-11.2.2**: 補全 `messages/*.json` 缺漏鍵值。
    *   *Action*: 將掃描到的字串提取至字典檔。
    *   *Verify*: `npm run dev` 切換語言確認無 fallback 警告。

### 11.3 Performance Tuning (效能調優)
*   [ ] **TASK-11.3.1**: 分析 Next.js Bundle Size。
    *   *Action*: 執行 `@next/bundle-analyzer`。
    *   *Output*: 優化建議報告 (e.g. Tree-shaking 調整)。
*   [ ] **TASK-11.3.2**: 驗證 Redis/Supabase Cache Hit Rate。
    *   *Action*: 模擬高併發請求，檢查 `l2_cache` 與 `route_cache` 命中率。

### 11.4 UX Polish (體驗打磨)
*   [ ] **TASK-11.4.1**: 實作 Global Error Boundary。
    *   *Input*: `src/app/global-error.tsx`
    *   *Output*: 優雅的錯誤畫面 (避免白屏)。
*   [ ] **TASK-11.4.2**: 優化 Loading Skeletons。
    *   *Action*: 檢查 Route 結果頁面的 Loading 狀態是否平滑。

## Phase X: Verification Checklist
- [ ] 所有新測試案例通過 (`npm test`)
- [ ] 多語系無缺漏
- [ ] Lighthouse Performance 分數 > 90
- [ ] 無 Type Errors (`tsc --noEmit`)
