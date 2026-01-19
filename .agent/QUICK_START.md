# Agent Toolkit 快速上手指南

> 5 分鐘快速了解如何使用 LUTAGU Agent Toolkit

---

## 🚀 立即可用的功能

### 1. 檢查多語系完整度 (2 分鐘)

```bash
# 執行 i18n 硬編碼字串檢查
cd /Users/zhuangzixian/Documents/LUTAGU_MVP
python .agent/scripts/i18n/i18n_checker.py src/

# 預期輸出：
# - 找出所有硬編碼的字串
# - 顯示繁中/英/日三語的覆蓋率
# - 列出缺少翻譯的 key
```

**立即行動**：
- ✅ 找出未翻譯的字串
- ✅ 確保三語完整性
- ✅ 改善 i18n 品質

---

### 2. 效能稽核 (3 分鐘)

```bash
# 啟動開發伺服器
npm run dev

# 在另一個終端執行 Lighthouse 稽核
python .agent/scripts/performance/lighthouse_audit.py http://localhost:3000

# 預期輸出：
# - Performance 分數 (0-100)
# - LCP, INP, CLS 指標
# - 優化建議
```

**立即行動**：
- ✅ 了解目前效能基準
- ✅ 識別優化機會
- ✅ 追蹤 Core Web Vitals

---

### 3. 產生測試案例 (5 分鐘)

```
在 Claude Code 對話中輸入：

/test src/lib/l4/HybridEngine.ts

# AI 會自動：
# 1. 分析程式碼
# 2. 識別測試場景
# 3. 產生測試檔案
# 4. 提供執行命令
```

**立即行動**：
- ✅ 快速提升測試覆蓋率
- ✅ 遵循最佳實踐
- ✅ 節省寫測試時間

---

## 💬 三種使用方式

### 方式 1: Workflow 命令 (斜線命令)

直接在對話中使用：

```bash
/test src/lib/adapters/tokyo.ts     # 產生測試
/debug L2 data not updating          # 系統化除錯
/plan implement offline mode         # 任務規劃
/enhance reduce bundle size          # 改善程式碼
/brainstorm caching strategies       # 探索方案
```

### 方式 2: 呼叫專業 Agent

在對話中提及 Agent 名稱：

```
請使用 performance-optimizer agent 分析首頁載入速度
請讓 security-auditor agent 審查認證流程
請讓 test-engineer agent 設計測試策略
請讓 frontend-specialist agent 優化 PWA 介面
請讓 database-architect agent 優化查詢效能
```

### 方式 3: 參考 Skill 知識

在對話中提及 Skill：

```
請參考 nextjs-best-practices skill 來優化 App Router 結構
請參考 i18n-localization skill 來修正多語系問題
請參考 performance-profiling skill 來優化 LCP 指標
請參考 api-patterns skill 來設計 RESTful API
請參考 testing-patterns skill 來改善測試架構
請參考 typescript-expert skill 來優化型別定義
```

---

## 🎯 常見使用場景

### 場景 1: 我要開發新功能

```bash
# Step 1: 規劃
/plan implement Trip Guard push notifications

# Step 2: 實作 (參考 Skills)
請參考 nextjs-best-practices skill 來實作 Server Actions

# Step 3: 測試
/test src/app/api/trip-guard/route.ts

# Step 4: 優化
請使用 performance-optimizer agent 檢查效能影響
```

---

### 場景 2: 我遇到 Bug 需要除錯

```bash
# Step 1: 系統化除錯
/debug L2 real-time train delays not showing in UI

# Step 2: 修復後測試
/test src/lib/l2/live-status.ts

# Step 3: 驗證修復
請確認修復後沒有引入新的問題
```

---

### 場景 3: 我要提升程式碼品質

```bash
# Step 1: 檢查多語系
python .agent/scripts/i18n/i18n_checker.py src/

# Step 2: 檢查效能
python .agent/scripts/performance/lighthouse_audit.py http://localhost:3000

# Step 3: 提升測試覆蓋率
/test src/lib/l4/
/test src/lib/adapters/

# Step 4: 安全稽核
請讓 security-auditor agent 審查整體安全性
```

---

### 場景 4: 我要優化現有程式碼

```bash
# Step 1: 分析問題
請使用 performance-optimizer agent 分析 bundle size

# Step 2: 改善程式碼
/enhance reduce bundle size for mobile users

# Step 3: 驗證改善
python .agent/scripts/performance/lighthouse_audit.py http://localhost:3000
```

---

## 📋 今天就試試看

### ✅ 任務檢查清單

- [ ] 執行 `i18n_checker.py` 檢查多語系
- [ ] 執行 `lighthouse_audit.py` 檢查效能
- [ ] 使用 `/test` 為核心模組產生測試
- [ ] 使用 `/debug` 解決一個實際問題
- [ ] 使用 `/plan` 規劃下一個功能
- [ ] 呼叫一個 Agent 來協助開發
- [ ] 參考一個 Skill 來學習最佳實踐

---

## 🆘 需要幫助？

### 查看完整文件
```bash
cat .agent/README.md
```

### 查看已安裝的內容
```bash
ls .agent/skills/      # 查看 Skills
ls .agent/workflows/   # 查看 Workflows
ls .agent/agents/      # 查看 Agents
ls .agent/scripts/     # 查看腳本
```

### 閱讀個別 Skill 文件
```bash
cat .agent/skills/nextjs-best-practices.md
cat .agent/skills/i18n-localization.md
cat .agent/skills/performance-profiling.md
```

---

## 💡 Pro Tips

1. **組合使用更強大**：先用 `/plan` 規劃，再用 Skills 實作，最後用 `/test` 驗證
2. **自動化腳本整合 CI/CD**：在 GitHub Actions 中執行 i18n 和 performance 檢查
3. **Agent 可以協作**：可以同時呼叫多個 Agent 來處理複雜任務
4. **Workflows 可以巢狀**：在 `/plan` 產生的計畫中使用 `/test` 和 `/enhance`

---

**開始使用吧！🚀**
