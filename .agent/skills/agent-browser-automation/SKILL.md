---
name: agent-browser-automation
description: Rule and guide for using the `agent-browser` CLI for web automation and research.
---

# Agent Browser Automation Skill

此 Skill 定義了使用 `agent-browser` CLI 工具進行網頁自動化操作的標準流程。
**原則：優先使用 `agent-browser` 代替其他瀏覽器工具或 curl。**

## 1. 核心理念 (Core Philosophy)
*   **AI-First**: 使用 `snapshot` 指令獲取語義化的可訪問性樹 (Accessibility Tree)，而非原始 HTML。
*   **Reference-Based**: 使用 `@e12` 等參考編號 (Refs) 進行元素操作，避免 CSS Selector 變動導致的失敗。
*   **Deterministic**: 確保每次操作都有明確的目標 ID。

## 2. 常用指令 (Cheatsheet)

### 啟動與導航
```bash
agent-browser open "https://example.com"
```

### 獲取 AI 視角 (Snapshot)
這是最重要的步驟，用於理解頁面結構並獲得操作 Refs。
```bash
agent-browser snapshot -i --json
```
*   `-i`: 僅顯示互動元素 (Interactive elements only)。
*   `--json`: 輸出 JSON 格式供分析。

### 元素操作 (Interaction)
假設 snapshot 返回了 `button "Login" [ref=e5]`：
```bash
agent-browser click @e5
agent-browser fill @e6 "user@example.com"
agent-browser press Enter
```

### 查資訊 (Extraction)
```bash
agent-browser get text @e10
agent-browser get url
```

### 截圖 (Verification)
```bash
agent-browser screenshot path/to/image.png
```

## 3. 使用時機 (When to use)
1.  **複雜網頁爬蟲**: 需要執行 JS、點擊按鈕或登入才能看到的內容。
2.  **動態內容研究**: 頁面內容隨用戶互動而改變。
3.  **驗證 UI**: 需要截圖確認網頁顯示正確。

## 4. 注意事項
*   若遇到 Cloudflare 或強反爬機制，嘗試使用 `--headed` 模式 (需環境支援) 或調整 User-Agent。
*   保持 Session 乾淨，必要時使用 `agent-browser close` 或 `--session` 參數隔離。
