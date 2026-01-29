# AI Chat 調試修復 - 優先任務清單

> 建立日期：2026-01-27  
> 狀態：🟡 診斷完成，待執行修復

---

## 背景

AI Chat 手動輸入無法送出，瀏覽器 Console 顯示認證錯誤：
```
n: You haven't signed in yet. Please sign in to continue.
```

**驗證結論**：
- ✅ 後端正常（Cloud Run + Local API 皆可透過 curl 正確回應）
- 🔴 前端失敗（瀏覽器環境中輸入無法觸發 API 呼叫）

---

## 任務清單

### P0 - 緊急（必須先完成）

- [x] **繞過 SDK 直接 fetch 測試**
  - 在 `useAgentChat.sendMessage()` 新增直接 `fetch` 測試功能
  - 啟用方式：在瀏覽器 Console 執行 `localStorage.setItem('LUTAGU_DEBUG_BYPASS_SDK', 'true')`
  - 測試完畫後可執行 `localStorage.removeItem('LUTAGU_DEBUG_BYPASS_SDK')` 恢復正常模式
  - ✅ 已實作

- [x] **AI SDK v6 Tool Calling 序列化修復 (Critical)**
  - 問題：`tool()` Helper property mismatch 導致 Schema 空白，OpenRouter 報錯 `type: None`。
  - 修復：將 `AgentTools.ts` 中的 `parameters` 更名為 `inputSchema`。
  - 驗證：API E2E 測試通過。
  - ✅ 已修復

- [ ] **XHR 斷點追蹤錯誤來源**
  - 在 Chrome DevTools 中設定 "signed in" 字串斷點
  - 追蹤 minified code 呼叫堆疊找出真正來源
  - 預估：1hr
  - 難度：中

### P1 - 高優先

- [ ] **無痕模式測試**
  - 排除瀏覽器擴充套件干擾可能
  - 預估：15min
  - 難度：低

- [ ] **檢查 TextStreamChatTransport 配置**
  - 審查 `credentials` / `headers` 設定
  - 比對 AI SDK v6 官方範例
  - 預估：30min
  - 難度：中

### P2 - 中優先

- [ ] **AI SDK v6 版本相容性**
  - 檢查 `ai@6.0.23` 與 `@ai-sdk/react@3.0.23` 是否有已知問題
  - 考慮升級或降級測試
  - 預估：2hr
  - 難度：高

---

## 技術參考

### 程式碼路徑
```
ChatInput → handleSend → sendMessage()
                ↓
         useAgentChat.sendMessage()
                ↓
    @ai-sdk/react.sendAiMessage() + TextStreamChatTransport
                ↓
         POST /api/agent/chat
```

### 關鍵檔案
| 檔案 | 說明 |
|------|------|
| `src/hooks/useAgentChat.ts` | Chat Hook 主邏輯 |
| `src/components/chat/ChatInput.tsx` | 輸入組件 |
| `src/components/chat/ChatPanel.tsx` | 面板容器 |
| `src/app/api/agent/chat/route.ts` | Next.js API Route |
| `src/lib/l4/HybridEngine.ts` | AI 引擎（超時邏輯） |

---

## 完成標準

- [ ] 手動輸入可成功送出到 `/api/agent/chat`
- [ ] Console 無認證相關錯誤
- [ ] AI 回應正確顯示在 Chat Panel
