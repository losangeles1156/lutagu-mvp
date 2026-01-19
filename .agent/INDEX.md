# Agent Toolkit 完整索引

> 快速查找已安裝的 Skills、Workflows、Agents 和 Scripts

---

## 📚 Skills (6)

### 🔴 高優先級

#### 1. nextjs-best-practices
- **檔案**: `skills/nextjs-best-practices.md`
- **用途**: Next.js 14 App Router 最佳實踐
- **關鍵主題**:
  - Server vs Client Components 決策樹
  - Data Fetching 模式 (Static/ISR/Dynamic)
  - Routing 慣例 (page/layout/loading/error)
  - API Routes 設計
  - 效能優化 (Image/Bundle)
  - Metadata 管理
  - Caching 策略
  - Server Actions

#### 2. i18n-localization
- **檔案**: `skills/i18n-localization.md`
- **用途**: 國際化與在地化管理
- **關鍵主題**:
  - i18n vs L10n 概念
  - React (react-i18next) 實作
  - Next.js (next-intl) 整合
  - Locale 檔案結構
  - RTL 支援 (Arabic/Hebrew)
  - 硬編碼字串偵測
- **腳本**: `scripts/i18n/i18n_checker.py`

#### 3. performance-profiling
- **檔案**: `skills/performance-profiling.md`
- **用途**: 效能分析與優化
- **關鍵主題**:
  - Core Web Vitals (LCP/INP/CLS)
  - 4-Step 效能優化流程
  - 工具選擇 (Lighthouse/Bundle Analyzer)
  - Bundle 分析
  - Runtime Profiling
  - 常見瓶頸診斷
- **腳本**: `scripts/performance/lighthouse_audit.py`

### 🟡 中優先級

#### 4. api-patterns
- **檔案**: `skills/api-patterns.md`
- **用途**: API 設計模式指導
- **關鍵主題**:
  - REST vs GraphQL vs tRPC
  - API 路由設計
  - 錯誤處理
  - 驗證與授權
  - Rate Limiting
  - API 文件化

#### 5. testing-patterns
- **檔案**: `skills/testing-patterns.md`
- **用途**: 測試策略與實踐
- **關鍵主題**:
  - Jest/Vitest 設定
  - 單元測試策略
  - 整合測試模式
  - E2E 測試 (Playwright)
  - TDD Workflow
  - Coverage 目標
  - Mock/Stub 策略

#### 6. typescript-expert
- **檔案**: `skills/typescript-expert.md`
- **用途**: TypeScript 進階技巧
- **關鍵主題**:
  - 型別層級程式設計
  - Utility Types
  - Generic 最佳實踐
  - Type Guards
  - tsconfig 優化
  - 效能考量

---

## 🔄 Workflows (5)

### 1. /test
- **檔案**: `workflows/test.md`
- **用途**: 測試產生與執行
- **子命令**:
  - `/test` - 執行所有測試
  - `/test [file]` - 為特定檔案產生測試
  - `/test coverage` - 顯示覆蓋率報告
  - `/test watch` - Watch 模式
- **輸出**: 測試計畫 + 測試程式碼 + 執行指令

### 2. /debug
- **檔案**: `workflows/debug.md`
- **用途**: 系統化除錯流程
- **步驟**:
  1. 問題描述與重現
  2. 假設形成
  3. 證據收集
  4. 根因分析
  5. 修復驗證
- **輸出**: 除錯報告 + 修復建議

### 3. /plan
- **檔案**: `workflows/plan.md`
- **用途**: 任務規劃與拆解
- **輸出格式**:
  - 任務目標
  - 技術決策
  - 實作步驟
  - 檔案清單
  - 風險評估
  - 測試策略

### 4. /enhance
- **檔案**: `workflows/enhance.md`
- **用途**: 改善現有程式碼
- **改善面向**:
  - 效能優化
  - 可讀性提升
  - 型別安全
  - 錯誤處理
  - 測試覆蓋率
- **輸出**: 改善建議 + 程式碼重構

### 5. /brainstorm
- **檔案**: `workflows/brainstorm.md`
- **用途**: 蘇格拉底式探索
- **方法**:
  - 問題探索
  - 多方案比較
  - 權衡分析
  - 決策建議
- **輸出**: 方案比較表 + 推薦方案

---

## 🤖 Agents (5)

### 1. performance-optimizer
- **檔案**: `agents/performance-optimizer.md`
- **專長**: 速度與 Web Vitals 優化
- **關鍵技能**:
  - Core Web Vitals 診斷
  - Bundle Size 優化
  - Runtime 效能分析
  - Caching 策略
  - Image/Font 優化
- **使用場景**: PWA 效能瓶頸分析、首屏載入優化

### 2. security-auditor
- **檔案**: `agents/security-auditor.md`
- **專長**: 安全合規稽核
- **關鍵技能**:
  - OWASP Top 10 檢查
  - XSS/CSRF 防護
  - SQL Injection 偵測
  - 認證與授權審查
  - PII 資料保護
  - Rate Limiting 驗證
- **使用場景**: 安全稽核、漏洞掃描、合規檢查

### 3. test-engineer
- **檔案**: `agents/test-engineer.md`
- **專長**: 測試策略設計
- **關鍵技能**:
  - 測試金字塔設計
  - 測試案例產生
  - Coverage 分析
  - CI/CD 整合
  - TDD 指導
- **使用場景**: 提升測試覆蓋率、設計測試策略

### 4. frontend-specialist
- **檔案**: `agents/frontend-specialist.md`
- **專長**: React/Next.js 專家
- **關鍵技能**:
  - React Hooks 優化
  - Next.js App Router
  - UI/UX 改善
  - 狀態管理
  - 效能優化
  - PWA 最佳實踐
- **使用場景**: PWA 介面優化、React 重構

### 5. database-architect
- **檔案**: `agents/database-architect.md`
- **專長**: PostgreSQL/Supabase 專家
- **關鍵技能**:
  - Schema 設計
  - 查詢優化
  - Index 策略
  - Migration 管理
  - RLS (Row Level Security)
  - 效能調校
- **使用場景**: Supabase 查詢優化、Schema 重構

---

## 🔧 Scripts (2)

### 1. i18n_checker.py
- **位置**: `scripts/i18n/i18n_checker.py`
- **用途**: 硬編碼字串偵測
- **使用**:
  ```bash
  python .agent/scripts/i18n/i18n_checker.py src/
  ```
- **輸出**:
  - 硬編碼字串清單
  - Locale 覆蓋率統計
  - 缺少翻譯的 keys
- **整合**: 可用於 pre-commit hook 或 CI/CD

### 2. lighthouse_audit.py
- **位置**: `scripts/performance/lighthouse_audit.py`
- **用途**: 自動化效能稽核
- **使用**:
  ```bash
  python .agent/scripts/performance/lighthouse_audit.py http://localhost:3000
  ```
- **輸出**:
  - Performance 分數
  - LCP/INP/CLS 指標
  - 優化建議清單
  - 資源載入分析
- **整合**: 可用於 CI/CD 效能閾值檢查

---

## 🔗 交叉參考

### 按技術領域分類

#### Next.js 開發
- **Skills**: nextjs-best-practices, typescript-expert
- **Agents**: frontend-specialist
- **Workflows**: /plan, /enhance

#### 多語系
- **Skills**: i18n-localization
- **Scripts**: i18n_checker.py
- **Workflows**: /test (驗證翻譯)

#### 效能優化
- **Skills**: performance-profiling
- **Agents**: performance-optimizer
- **Scripts**: lighthouse_audit.py
- **Workflows**: /enhance

#### 測試
- **Skills**: testing-patterns
- **Agents**: test-engineer
- **Workflows**: /test, /debug

#### API 開發
- **Skills**: api-patterns
- **Agents**: security-auditor, database-architect
- **Workflows**: /plan, /test

#### 安全
- **Skills**: (無)
- **Agents**: security-auditor
- **Workflows**: /debug (安全問題)

---

## 📊 使用組合建議

### 組合 1: 新功能開發
```
/plan → nextjs-best-practices → /test → performance-optimizer
```

### 組合 2: Bug 修復
```
/debug → typescript-expert → /test → security-auditor
```

### 組合 3: 效能優化
```
lighthouse_audit.py → performance-profiling → /enhance → performance-optimizer
```

### 組合 4: 品質提升
```
i18n_checker.py → testing-patterns → /test → test-engineer
```

### 組合 5: 架構重構
```
/brainstorm → api-patterns → database-architect → /plan
```

---

## 🎯 快速查找表

| 我想要... | 使用... |
|-----------|---------|
| 產生測試 | `/test` workflow |
| 除錯問題 | `/debug` workflow |
| 規劃任務 | `/plan` workflow |
| 改善程式碼 | `/enhance` workflow |
| 探索方案 | `/brainstorm` workflow |
| 檢查多語系 | `i18n_checker.py` script |
| 檢查效能 | `lighthouse_audit.py` script |
| 學習 Next.js | `nextjs-best-practices` skill |
| 學習測試 | `testing-patterns` skill |
| 優化效能 | `performance-optimizer` agent |
| 稽核安全 | `security-auditor` agent |
| 設計測試 | `test-engineer` agent |
| 優化介面 | `frontend-specialist` agent |
| 優化資料庫 | `database-architect` agent |

---

*完整文件請參閱 [README.md](README.md)*
