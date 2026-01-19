# LUTAGU Agent Toolkit

> **Version**: 1.0 (基於 Antigravity Kit v2.0)
> **Last Updated**: 2026-01-18

這是 LUTAGU 專案的 AI Agent 工具包，包含精選的 Skills、Workflows 和 Agents，用於提升開發效率和程式碼品質。

---

## 📁 目錄結構

```
.agent/
├── README.md           # 本文件
├── skills/             # 6 個核心技能模組
├── workflows/          # 5 個工作流程命令
├── agents/             # 5 個專業 Agent
└── scripts/            # 自動化腳本
    ├── i18n/          # 國際化檢查
    └── performance/   # 效能稽核
```

---

## 🧠 已安裝的 Skills (6)

| Skill | 用途 | 優先級 |
|-------|------|--------|
| **nextjs-best-practices** | Next.js 14 App Router 最佳實踐 | 🔴 高 |
| **i18n-localization** | 多語系管理 (繁中/英/日) | 🔴 高 |
| **performance-profiling** | PWA 效能優化指導 | 🔴 高 |
| **api-patterns** | API 設計模式 (REST/GraphQL) | 🟡 中 |
| **testing-patterns** | 測試策略 (Jest/Vitest) | 🟡 中 |
| **typescript-expert** | TypeScript 進階用法 | 🟡 中 |

### 如何使用 Skills

Skills 會根據任務內容**自動載入**。你也可以在對話中明確提及：

```
請使用 performance-profiling skill 來分析 PWA 載入速度
請參考 i18n-localization skill 來檢查多語系實作
```

---

## 🔄 已安裝的 Workflows (5)

Workflows 是可執行的斜線命令，用於標準化開發流程。

| Command | 用途 | 範例 |
|---------|------|------|
| `/test` | 產生測試案例並執行 | `/test src/lib/l4/HybridEngine.ts` |
| `/debug` | 系統化除錯流程 | `/debug L2 real-time data not updating` |
| `/plan` | 任務拆解與規劃 | `/plan implement Trip Guard notifications` |
| `/enhance` | 改善現有程式碼 | `/enhance improve route calculation performance` |
| `/brainstorm` | 蘇格拉底式探索 | `/brainstorm caching strategies for ODPT API` |

### 使用範例

```bash
# 1. 為核心模組產生測試
/test src/lib/l4/HybridEngine.ts

# 2. 系統化除錯 L2 即時資料問題
/debug L2 real-time train delays not showing

# 3. 規劃新功能實作
/plan add offline mode for PWA

# 4. 優化效能瓶頸
/enhance reduce bundle size for mobile users

# 5. 探索技術方案
/brainstorm alternative embedding models for knowledge base
```

---

## 🤖 已安裝的 Agents (5)

Agents 是專業領域的 AI 人格，可直接在對話中呼叫。

| Agent | 專長 | 使用時機 |
|-------|------|---------|
| **performance-optimizer** | 速度與 Web Vitals | PWA 效能瓶頸分析 |
| **security-auditor** | 安全合規稽核 | 審查 PII 加密、Rate Limiting |
| **test-engineer** | 測試策略設計 | 提升測試覆蓋率 |
| **frontend-specialist** | React/Next.js 專家 | PWA 介面優化 |
| **database-architect** | PostgreSQL/Supabase | 查詢效能調校 |

### 如何呼叫 Agents

```
請使用 performance-optimizer agent 分析首頁載入效能
請讓 security-auditor agent 審查使用者認證流程
請讓 test-engineer agent 設計 L4 決策引擎的測試策略
```

---

## 🔧 自動化腳本

### 1. i18n 硬編碼字串檢查

**目的**：找出未翻譯的硬編碼字串，確保繁中/英/日三語完整性

```bash
# 檢查整個 src 目錄
python .agent/scripts/i18n/i18n_checker.py src/

# 檢查特定檔案
python .agent/scripts/i18n/i18n_checker.py src/app/page.tsx
```

**輸出範例**：
```
❌ Hardcoded string found: src/components/MapView.tsx:42
   "Loading map..."
   → Should use: t('map.loading')

✅ Locale coverage:
   zh-TW: 95% (190/200)
   en: 100% (200/200)
   ja: 98% (196/200)
```

### 2. Lighthouse 效能稽核

**目的**：自動化 Core Web Vitals 檢測

```bash
# 稽核本地開發伺服器
python .agent/scripts/performance/lighthouse_audit.py http://localhost:3000

# 稽核生產環境
python .agent/scripts/performance/lighthouse_audit.py https://lutagu.app
```

**輸出範例**：
```
📊 Lighthouse Audit Results:

Performance: 92/100 ✅
  LCP: 1.8s ✅ (target: <2.5s)
  INP: 150ms ✅ (target: <200ms)
  CLS: 0.05 ✅ (target: <0.1)

Opportunities:
  - Reduce unused JavaScript: 120KB
  - Enable text compression: 45KB savings
```

---

## 💡 LUTAGU 專屬使用場景

### 場景 1: 提升測試覆蓋率

```bash
# 1. 使用 /test workflow 產生測試
/test src/lib/l4/HybridEngine.ts

# 2. 呼叫 test-engineer agent 設計策略
請讓 test-engineer agent 設計 L4 決策引擎的整合測試策略

# 3. 參考 testing-patterns skill
請參考 testing-patterns skill 來優化現有測試結構
```

### 場景 2: 多語系品質檢查

```bash
# 1. 執行自動化檢查
python .agent/scripts/i18n/i18n_checker.py src/

# 2. 修正問題
請參考 i18n-localization skill 來修正硬編碼字串

# 3. 驗證 RTL 支援
請確認 Arabic locale 的 RTL 排版是否正確
```

### 場景 3: PWA 效能優化

```bash
# 1. 執行效能稽核
python .agent/scripts/performance/lighthouse_audit.py http://localhost:3000

# 2. 呼叫 performance-optimizer agent
請讓 performance-optimizer agent 分析 bundle size 並提供優化建議

# 3. 參考 performance-profiling skill
請參考 performance-profiling skill 來優化 LCP 指標
```

### 場景 4: API 設計審查

```bash
# 1. 使用 /plan workflow 規劃新 API
/plan design L5 evacuation decision API

# 2. 參考 api-patterns skill
請參考 api-patterns skill 來設計 RESTful API 結構

# 3. 呼叫 security-auditor agent
請讓 security-auditor agent 審查 API 安全性 (CORS, Rate Limiting)
```

---

## 🎯 建議使用流程

### 新功能開發

1. **規劃階段**：使用 `/plan` workflow
2. **實作階段**：參考相關 Skills (nextjs, typescript)
3. **測試階段**：使用 `/test` workflow
4. **優化階段**：呼叫 `performance-optimizer` agent
5. **審查階段**：呼叫 `security-auditor` agent

### Bug 修復

1. **除錯階段**：使用 `/debug` workflow
2. **修復階段**：參考相關 Skills
3. **驗證階段**：使用 `/test` workflow

### 程式碼品質提升

1. **分析階段**：呼叫專業 Agents
2. **改善階段**：使用 `/enhance` workflow
3. **驗證階段**：執行自動化腳本

---

## ⚙️ 與 LUTAGU 現有工具的整合

| 現有工具 | Agent Toolkit 增強 |
|---------|-------------------|
| **CLAUDE.md** | Skills 作為知識庫補充 |
| **MCP Tools** | Workflows 可呼叫 PostgreSQL/GitHub MCP |
| **agent-browser** | `/test` 可整合 E2E 測試 |
| **n8n ETL** | 腳本可觸發 n8n workflow |

---

## 📊 預期效益指標

| 指標 | 目標 | 驗證方式 |
|------|------|---------|
| 測試覆蓋率 | 70%+ | `/test` workflow + coverage report |
| i18n 完整度 | 100% | `i18n_checker.py` 腳本 |
| Core Web Vitals | 全綠 | `lighthouse_audit.py` 腳本 |
| 開發效率 | +30% | Sprint velocity 比較 |

---

## 🔗 參考資源

- **原始專案**: [Antigravity Kit](https://github.com/vudovn/antigravity-kit)
- **LUTAGU 主規則**: [CLAUDE.md](../CLAUDE.md)
- **專案規則**: [project_rules.md](rules/project_rules.md)

---

## 📝 維護日誌

| 日期 | 版本 | 變更內容 |
|------|------|---------|
| 2026-01-18 | 1.0 | 初始安裝：6 Skills, 5 Workflows, 5 Agents, 2 Scripts |

---

*此工具包專為 LUTAGU 專案客製化，基於 Antigravity Kit v2.0*
