# LUTAGU-MVP 技術審查報告
**審查日期**: 2026-01-08
**審查範圍**: AI 混合架構引擎 + 前端 UX 設計
**審查人**: Claude Code Audit

---

## 執行摘要

### 整體評分

| 面向 | 評分 | 狀態 |
|------|------|------|
| **AI 混合架構引擎** | 6.0/10 | ⚠️ 需要改進 |
| **前端 UX 設計** | 7.5/10 | ✅ 良好基礎 |
| **總體評估** | 6.8/10 | ⚠️ MVP 可用，但需強化 |

### 關鍵發現

**AI 引擎**:
- ❌ 「混合架構」主要為**規則引擎 + AI 備援**，而非真正的 AI 驅動決策
- ⚠️ Dify 整合存在但可能未在關鍵路徑中啟用
- ⚠️ 語意搜尋為佔位符（endpoint 不存在）
- ✅ Mistral AI Agent 整合有效運作

**前端 UX**:
- ⚠️ 規格文件與實作存在落差（3-tab vs 4-tab 導航）
- ⚠️ L4 介面實際使用 Chat，與規格的卡片式建議不同
- ✅ 多語系支援完善（4 種語言）
- ⚠️ 錯誤處理和無障礙功能需要強化

---

## 第一部分：AI 混合架構引擎審查

### 1.1 架構分析

```
┌─────────────────────────────────────────────────────────────┐
│                    使用者查詢流程                           │
├─────────────────────────────────────────────────────────────┤
│  用戶輸入 → ChatPanel.tsx → /api/agent/chat                │
│                    ↓                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  AgentOrchestrator (Mistral small-latest)          │   │
│  │  - 工具調用循環 (最多 5 次迭代)                      │   │
│  │  - 調用 get_timetable, get_train_status 等工具      │   │
│  └─────────────────────────────────────────────────────┘   │
│                    ↓                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  工具回傳結果後 → 若無高價值結果 → 規則引擎備援      │   │
│  │  DecisionEngine (100% 規則) + HardCalculationEngine │   │
│  └─────────────────────────────────────────────────────┘   │
│                    ↓                                        │
│  串流回應至前端                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 各層實作狀態

| 層級 | 類型 | AI 成分 | 檔案位置 |
|------|------|---------|----------|
| **L1 Location DNA** | 靜態資料 | ❌ 無 | `src/lib/l1/` |
| **L2 Live Sense** | 即時 API | ❌ 無 AI 處理 | `src/lib/l2/` |
| **L3 Facilities** | 資料庫查詢 | ❌ 無 | `src/lib/l3/` |
| **L4 Strategy** | 混合 | ⚠️ 主要規則 + AI 備援 | `src/lib/l4/` |

### 1.3 核心引擎詳細分析

#### DecisionEngine（決策引擎）
**檔案**: `src/lib/l4/decisionEngine.ts`

```typescript
// 實際實作：100% 規則匹配，無 AI
for (const rule of KNOWLEDGE_BASE) {
    if (this.checkTrigger(rule.trigger, stationId, lineIds, activeUserStates, currentDate)) {
        let score = rule.priority;
        if (rule.trigger.user_states) score += 20;
        if (rule.trigger.station_ids) score += 50;
    }
}
```

**評估**: ❌ **非 AI 驅動** - 純粹關鍵字/條件匹配

#### HardCalculationEngine（即時計算引擎）
**檔案**: `src/lib/l4/hardCalculationEngine.ts`

- ✅ 真實 ODPT API 整合（列車狀態、時刻表）
- ✅ Open-Meteo 天氣 API 整合
- ❌ 無 AI 處理 - 簡單條件判斷（if delay > 0, if weather is rain）

#### Dify 整合
**檔案**: `src/app/api/dify/classify-intent/route.ts`

```typescript
// 關鍵問題：大量依賴規則備援
try {
    const difyResponse = await fetch(`${DIFY_API_URL}/chat-messages`, { ... });
} catch (error) {
    // 備援：若 Dify 失敗，使用規則分類
    const fallbackResult = ruleBasedClassification(data);
    return NextResponse.json(fallbackResult);
}
```

**評估**: ⚠️ Dify 整合存在但**不確定是否在生產環境啟用**

#### Mistral Agent
**檔案**: `src/lib/agent/orchestrator.ts`

```typescript
// 真正的 AI 整合
const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: chatHistory,
        tools: AGENT_TOOLS,
        tool_choice: 'auto'
    })
});
```

**評估**: ✅ **真實 AI 整合** - 支援工具調用

### 1.4 知識庫分析

| 檔案 | 行數 | 類型 |
|------|------|------|
| `src/data/stationWisdom.ts` | 478 | 手動撰寫規則 |
| `src/lib/l4/expertKnowledgeBase.ts` | 1,397 | 手動策展知識 |
| **總計** | ~1,875 | **100% 靜態，無機器學習** |

**範例規則**:
```typescript
{
    id: 'tokyo-keiyo-transfer',
    trigger: {
        station_ids: ['odpt.Station:JR-East.Tokyo'],
        line_ids: ['odpt.Railway:JR-East.Keiyo'],
        keywords: ['transfer', 'keiyo', 'long_walk']
    },
    type: 'warning',
    priority: 90,
    title: { 'zh-TW': '轉乘預警', ja: '乗り換え注意', en: 'Transfer Warning' }
}
```

### 1.5 語意搜尋狀態

**檔案**: `src/lib/l4/semanticSearch.ts`

```typescript
// 呼叫的 endpoint 不存在！
await fetch('/api/l4/semantic-search', { ... });
```

**評估**: ❌ **佔位符實作** - API endpoint 未建立

### 1.6 AI 引擎問題總結

| 問題 | 嚴重度 | 說明 |
|------|--------|------|
| 語意搜尋未實作 | 🔴 高 | endpoint 不存在 |
| 決策引擎純規則 | 🟠 中 | 稱為「AI」但無 AI |
| Dify 可能未啟用 | 🟠 中 | 依賴環境變數 |
| 知識庫無法更新 | 🟠 中 | 硬編碼於原始碼 |
| 無回饋迴路 | 🟡 低 | 不會從使用者互動學習 |

---

## 第二部分：前端 UX 設計審查

### 2.1 架構概覽

```
┌─────────────────────────────────────────────────────────────┐
│                      主頁面結構                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Header (44px)                                      │   │
│  │  - LUTAGU 🦌 品牌                                    │   │
│  │  - 系統選單（語言切換、用戶資料）                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  地圖區域（React Leaflet）                          │   │
│  │  - 節點群集                                         │   │
│  │  - GPS 定位                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  節點詳情 Bottom Sheet                              │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  NodeTabs: DNA | LIVE | FACILITY | LUTAGU   │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  底部導航 (3 tabs): Explore | Trips | Me           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 規格 vs 實作對照

| 功能 | 規格文件 | 實際實作 | 狀態 |
|------|----------|----------|------|
| 四層 Tab (DNA/LIVE/FACILITY/LUTAGU) | 底部導航列 | 節點詳情內的 Tab | ⚠️ 不同 |
| 天氣警報橫幅 | 頂部紅色橫幅 | 主頁未顯示 | ❌ 缺失 |
| L1 AI 個性描述 | 頂部引言 | 未找到 | ❌ 缺失 |
| L1 導航按鈕 | Google Maps 連結 | 已實作 | ✅ |
| L3 設施詳情 Modal | 有 | 已實作 | ✅ |
| L4 用戶狀態標籤 | 輪椅、行李等 | 已實作 | ✅ |
| L4 路線建議 | 卡片式 UI | Chat 式 UI | ⚠️ 不同 |
| 多語系 | 3 種語言 | 4 種語言 | ✅ 超出 |

### 2.3 各層 Tab 組件分析

#### L1_DNA（地點基因）
**檔案**: `src/components/node/L1_DNA.tsx`

**優點**:
- ✅ 動態計算分類統計
- ✅ 氛圍標籤篩選
- ✅ 抽屜式分類展開

**缺失**:
- ❌ 無 AI 個性描述引言
- ❌ 水平滾動標籤在手機上可能溢出

#### L2_Live（即時狀態）
**檔案**: `src/components/node/L2_Live.tsx`

**優點**:
- ✅ 列車狀態顏色編碼
- ✅ 人潮投票 (5 級表情)
- ✅ 機場航班板整合

**缺失**:
- ❌ 延誤/正常狀態視覺區分不足
- ❌ 投票後無確認回饋

#### L3_Facilities（服務設施）
**檔案**: `src/components/node/L3_Facilities.tsx`

**優點**:
- ✅ 完整設施圖示映射
- ✅ 外部服務連結追蹤
- ✅ Modal 詳情檢視

**缺失**:
- ❌ Modal 缺少鍵盤導航（無 focus trap）

#### L4_Dashboard（智慧導航）
**檔案**: `src/components/node/L4_Dashboard.tsx`

**問題**:
- ⚠️ 實際 UI 使用 `L4_Chat` 而非規格的卡片式建議
- ❌ 無「取得建議」按鈕
- ❌ MaaS 整合連結不明顯

### 2.4 響應式設計

| 斷點 | 佈局 | 狀態 |
|------|------|------|
| < 1024px（手機） | 全螢幕地圖 + 底部 sheet | ✅ |
| ≥ 1024px（桌面） | 分割面板（60%/40%） | ✅ |

**優點**:
- ✅ 44-48px 最小觸控尺寸
- ✅ Safe area inset 支援
- ✅ LocalStorage 保存面板比例

**問題**:
- ❌ 4 個 Tab 在小螢幕可能溢出
- ❌ 無橫向模式優化
- ❌ Bottom sheet 無法部分收合

### 2.5 無障礙功能

**ARIA 屬性**: 找到 21 個 aria- 屬性

**優點**:
- ✅ Modal 有 `role="dialog"` + `aria-modal="true"`
- ✅ 圖示按鈕有 `aria-label`
- ✅ Tab 有 `role="tablist"`, `role="tab"`

**問題**:
- ❌ Modal 無 focus trap
- ❌ 無 skip-to-content 連結
- ❌ 載入狀態無螢幕閱讀器公告
- ❌ 表單輸入缺少 `<label>`

### 2.6 多語系支援

| 語言 | 字串數 | 完整度 |
|------|--------|--------|
| 繁體中文 (zh-TW) | 475 | ✅ 100% |
| 日本語 (ja) | 478 | ✅ 100% |
| English (en) | 475 | ✅ 100% |
| 簡體中文 (zh) | 458 | ⚠️ 96% |

### 2.7 前端問題總結

| 問題 | 嚴重度 | 說明 |
|------|--------|------|
| L4 UI 與規格不符 | 🔴 高 | Chat 式 vs 卡片式 |
| 導航結構不一致 | 🟠 中 | 3-tab vs 4-tab |
| Error Boundary 無詳情 | 🟠 中 | 僅顯示 "Error" |
| Modal 無 focus trap | 🟠 中 | 無障礙問題 |
| 手機 Tab 溢出 | 🟡 低 | < 320px 螢幕 |
| 簡體中文不完整 | 🟡 低 | 缺 17 個字串 |

---

## 第三部分：建議改進事項

### 3.1 高優先級（應立即處理）

#### AI 引擎
1. **實作語意搜尋 API**
   - 建立 `/api/l4/semantic-search` endpoint
   - 考慮使用向量資料庫（如 Pinecone、Supabase pgvector）

2. **確認 Dify 整合狀態**
   - 驗證生產環境 API key 是否設定
   - 新增整合狀態監控端點

3. **減少規則引擎依賴**
   - 將 Mistral AI 用於更多決策，而非僅作備援
   - 建立 AI 優先、規則備援的架構

#### 前端 UX
4. **實作 focus trap**
   - 使用 `@radix-ui/react-dialog` 或類似函式庫
   - 確保 Modal 內鍵盤導航正確

5. **新增錯誤詳情與重試**
   ```tsx
   // 改進 ErrorBoundary
   <ErrorFallback
     error={error}
     onRetry={() => this.setState({ hasError: false })}
   />
   ```

6. **人潮投票確認回饋**
   - 新增 toast 通知：「感謝您的回報！」

### 3.2 中優先級（1-2 週內）

#### AI 引擎
7. **知識庫移至資料庫**
   - 從硬編碼轉為 Supabase 表格
   - 支援後台管理介面更新

8. **新增使用者回饋迴路**
   - 追蹤哪些建議被採用
   - 作為未來訓練數據

#### 前端 UX
9. **對齊 L4 UI 與規格**
   - 實作卡片式建議 UI
   - 保留 Chat 作為進階選項

10. **新增天氣警報橫幅**
    - 主頁面頂部紅色警示
    - 連結至 L2 詳情

11. **修復手機 Tab 溢出**
    - 加入水平滾動 + 溢出指示器
    - 或改為 2x2 網格佈局

12. **完成簡體中文翻譯**
    - 補齊缺少的 17 個字串

### 3.3 低優先級（長期改進）

#### AI 引擎
13. **實作真正的語意理解**
    - 使用 embedding 模型進行相似度搜尋
    - 考慮 fine-tuning 特定領域模型

14. **A/B 測試框架**
    - 比較規則 vs AI 建議效果

#### 前端 UX
15. **尊重 prefers-reduced-motion**
    ```css
    @media (prefers-reduced-motion: reduce) {
      * { animation-duration: 0.01ms !important; }
    }
    ```

16. **PWA 離線支援**
    - 建立 offline.html 備援頁面
    - 實作明確的快取策略

17. **無障礙測試整合**
    ```bash
    npx axe-core ./src/components --tags wcag2a
    ```

---

## 第四部分：風險評估

### 4.1 技術風險

| 風險 | 機率 | 影響 | 緩解措施 |
|------|------|------|----------|
| Mistral API 不可用 | 中 | 高 | 已有離線模式備援 ✅ |
| Dify API 配置錯誤 | 中 | 中 | 新增健康檢查端點 |
| 知識庫過時 | 高 | 中 | 移至資料庫 + 後台管理 |
| ODPT API 變更 | 低 | 高 | 監控 + 版本化整合 |

### 4.2 UX 風險

| 風險 | 機率 | 影響 | 緩解措施 |
|------|------|------|----------|
| 用戶困惑於 L4 介面 | 高 | 高 | 對齊規格，新增引導 |
| 無障礙投訴 | 中 | 中 | 實作 focus trap + ARIA |
| 低端手機效能問題 | 中 | 低 | 減少動畫，延遲載入 |

---

## 第五部分：結論

### 現狀總結

**LUTAGU-MVP** 是一個**架構完善但部分功能為佔位符**的專案：

- **AI 混合架構**：名義上是 AI 驅動，實際上**規則引擎佔主導**，AI 僅作備援。這可能導致使用者期望落差。

- **前端 UX**：基礎良好，但**規格文件與實作存在明顯落差**，特別是 L4 介面和導航結構。

### 建議下一步

1. **短期**（1 週內）：
   - 確認並修復 Dify 整合
   - 實作前端 focus trap 和錯誤詳情

2. **中期**（2-4 週）：
   - 實作語意搜尋 API
   - 對齊 L4 UI 與規格文件
   - 完成簡體中文翻譯

3. **長期**（1-2 月）：
   - 知識庫遷移至資料庫
   - 實作使用者回饋迴路
   - 進行無障礙稽核

### 最終建議

專案**可作為 MVP/Beta 發布**，但需明確向利害關係人說明：
- 「AI 驅動」功能實際上大量依賴規則引擎
- L4 介面設計與原始規格有差異
- 建議在正式發布前完成高優先級改進項目

---

**報告完成**: 2026-01-08
**審查檔案數**: 50+ 元件，跨 src/components, src/app, src/lib
**審查程式碼行數**: 5,000+
