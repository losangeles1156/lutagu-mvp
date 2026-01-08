# LUTAGU(ルタグ) 前端 UI 優化審查報告

**審查日期**: 2026-01-08
**審查範圍**: 地圖節點顯示、登入頁使用者流程、L1~L4 功能介面
**審查人**: Claude Code Audit

---

## 執行摘要

### 整體評分

| 面向 | 評分 | 狀態 |
|------|------|------|
| **地圖節點顯示優化** | 7.0/10 | ✅ 架構良好，需完善功能 |
| **登入頁使用者流程** | 6.5/10 | ⚠️ 功能完整，體驗待改善 |
| **L1~L4 功能介面** | 7.5/10 | ✅ 設計優秀，部分細節需調整 |
| **總體評估** | 7.0/10 | ✅ MVP 可用，建議重點優化 |

---

## 第一部分：地圖節點顯示優化

### 1.1 架構分析

```
MapContainer (主控制器, 894 行)
  ├─ ViewportNodeLoader (視窗載入模式)
  ├─ WardNodeLoader (行政區載入模式)
  └─ HubNodeLayer (節點渲染層)
      └─ NodeMarker (單一節點圖示)
```

**核心檔案**:
- `src/components/map/MapContainer.tsx` (894 行)
- `src/components/map/NodeMarker.tsx` (240 行)
- `src/components/map/HubNodeLayer.tsx` (100 行)
- `src/app/api/nodes/viewport/route.ts`

### 1.2 優點評價

| 項目 | 評價 | 說明 |
|------|------|------|
| **雙模式載入** | ⭐⭐⭐⭐⭐ | 視窗自由探索 + 行政區結構瀏覽 |
| **Hub 聚合機制** | ⭐⭐⭐⭐ | 母節點自動合併子站資料 |
| **快取策略** | ⭐⭐⭐⭐ | 版本控制 + TTL + 去重複請求 |
| **視覺層次** | ⭐⭐⭐⭐ | 營運商色彩編碼 + Hub 標記 |
| **效能優化** | ⭐⭐⭐⭐ | Memoization + Icon 快取 |

**快取實作亮點**:
```typescript
// 智能視窗步進計算
function viewportStepForZoom(zoom: number) {
    if (zoom >= 17) return 0.002;    // 高縮放精確定位
    if (zoom >= 15) return 0.005;
    if (zoom >= 13) return 0.02;
    return 0.2;                       // 低縮放粗略區域
}
```

### 1.3 問題與建議

| 問題 | 嚴重度 | 建議改善 |
|------|--------|----------|
| **無真正幾何聚類** | 🔴 高 | 在 zoom 13-14 時，密集區域顯示過多節點。建議實作 grid-based 聚合或使用 Mapbox clustering |
| **Deep Linking 未實作** | 🔴 高 | 無法分享車站連結。建議新增 URL 參數: `?node=<id>&zoom=<z>` |
| **子節點無視覺指示** | 🟠 中 | Hub 節點應顯示「可展開」指示，預覽成員數量 |
| **單頁載入限制** | 🟠 中 | 每次視窗只載入一頁。建議自動載入多頁或提供分頁 UI |
| **Emoji 無障礙問題** | 🟠 中 | 轉乘類型使用 Emoji (🔗📍🚶)，螢幕閱讀器無法解讀 |
| **Icon 快取未限制** | 🟡 低 | 最多 500 項但非 LRU。建議改用 LRU 快取 |

**Deep Linking 實作建議**:
```typescript
// 在 MapController 或 app layout 中
useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nodeId = params.get('node');
    if (nodeId && !currentNodeId) {
        setCurrentNode(nodeId);
        // 自動載入並飛行至該節點
    }
}, []);
```

### 1.4 節點視覺設計評價

**目前設計**:
- 基本節點: 48px, 圓形 + MapPin 圖示
- Hub 節點: 56px, 圓角方形 + Train 圖示
- 主要車站 (上野、東京等): Crown 徽章 + 自訂顏色

**營運商色彩編碼**:
```typescript
OPERATOR_COLORS = {
    'JR': '#008A3C',      // 綠色
    'Metro': '#00A7DB',   // 藍色
    'Toei': '#E73387',    // 洋紅
    'Private': '#6B7280', // 灰色
};
```

**建議改善**:
1. 為不同節點類型 (停車場、無障礙設施) 增加獨特樣式
2. 使用 SVG 圖示取代 Emoji 以改善無障礙
3. 高縮放時標籤可能重疊，需要碰撞檢測

---

## 第二部分：登入頁使用者流程

### 2.1 認證方式

| 方式 | 狀態 | 說明 |
|------|------|------|
| **Google OAuth** | ✅ 主要 | 完整實作，包含重導向驗證 |
| **Magic Link** | ✅ 次要 | 無密碼 Email 登入 |
| **訪客模式** | ✅ 完整 | 可完整使用 App 無需登入 |

**檔案位置**: `src/app/[locale]/login/page.tsx` (419 行)

### 2.2 優點評價

| 項目 | 評價 | 說明 |
|------|------|------|
| **訪客存取** | ⭐⭐⭐⭐⭐ | 完整功能無需登入 |
| **安全防護** | ⭐⭐⭐⭐⭐ | Rate Limiting + CSRF + 審計日誌 |
| **URL 驗證** | ⭐⭐⭐⭐ | 防止 Open Redirect 攻擊 |
| **多語系支援** | ⭐⭐⭐⭐ | 4 種語言完整翻譯 |
| **無障礙功能** | ⭐⭐⭐⭐ | 18 個 ARIA 屬性 |
| **漸進式認證** | ⭐⭐⭐⭐ | Demo 情境鼓勵先探索再登入 |

**安全機制實作**:
```typescript
// Rate Limiting (middleware.ts)
const capacity = isSafe ? 300 : 120;  // GET: 300/min, POST: 120/min

// CSRF 驗證 (csrf.ts)
const csrfCookie = getCookieValue(request, 'bg_csrf');
const csrfHeader = request.headers.get('x-csrf-token');
```

### 2.3 問題與建議

| 問題 | 嚴重度 | 建議改善 |
|------|--------|----------|
| **Session 不持久** | 🔴 高 | 頁面重新載入後登入狀態遺失。建議啟用 `persistSession: true` |
| **Token 無自動刷新** | 🔴 高 | 長時間使用會意外登出。建議實作 `autoRefreshToken: true` |
| **Profile 初始化阻塞** | 🔴 高 | `/api/me` 失敗會導致登入失敗。建議允許優雅降級 |
| **載入回饋不足** | 🟠 中 | 僅顯示 "..." 文字。建議改用動畫 Spinner |
| **錯誤訊息模糊** | 🟠 中 | 使用者無法區分錯誤類型。建議提供具體指引 |
| **Email 無驗證** | 🟡 低 | 依賴瀏覽器驗證。建議新增正則驗證 |

**Session 持久化修復建議**:
```typescript
// 修改 supabaseAuth.ts
createClientWithPersistence(accessToken: string): SupabaseClient {
    return createClient(url, key, {
        auth: {
            persistSession: true,        // 啟用 localStorage 持久化
            autoRefreshToken: true,      // 自動刷新 Token
            detectSessionInUrl: true     // 處理 OAuth 回調
        }
    });
}
```

**改善載入狀態建議**:
```tsx
// 取代 "..." 為動畫 Spinner
{busy ? (
    <div className="flex gap-1 items-center justify-center">
        <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-150" />
        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-300" />
    </div>
) : t('continue')}
```

### 2.4 使用者流程圖

```
┌─────────────────────────────────────────────────────────────┐
│                      登入頁流程                              │
├─────────────────────────────────────────────────────────────┤
│  頁面載入 → 檢查現有 Session                                 │
│      ↓                                                      │
│  ┌─ 有 Session ───────────────→ 初始化 Profile → 跳轉目標頁 │
│  │                                    ↓                     │
│  │                              失敗 → ❌ 顯示錯誤           │
│  │                                                          │
│  └─ 無 Session ───→ 顯示登入選項                            │
│                        │                                    │
│        ┌───────────────┼───────────────┐                   │
│        ↓               ↓               ↓                   │
│   Google OAuth    Magic Link      訪客模式                  │
│        │               │               │                   │
│        └───────────────┴───────────────┘                   │
│                        ↓                                    │
│                   完整使用 App                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 第三部分：L1~L4 功能介面

### 3.1 Tab 導航系統

**檔案**: `src/components/node/NodeTabs.tsx`

| Tab | 色彩 | 圖示 | 用途 |
|-----|------|------|------|
| DNA (L1) | Sky 藍 | Compass | 地點基因、周邊 POI |
| LIVE (L2) | Emerald 綠 | Activity | 即時狀態、天氣 |
| FACILITY (L3) | Amber 橙 | Building2 | 服務設施 |
| LUTAGU (L4) | Violet 紫 | Lightbulb | 智慧建議 (主要) |

**優點**:
- ✅ Framer Motion 平滑切換動畫
- ✅ 色彩編碼清晰區分層級
- ✅ ErrorBoundary 防止連鎖崩潰

**問題**:
- ❌ 預設開啟 L4 Tab，但使用者可能先需要 L1 探索
- ❌ 缺少鍵盤導航 (方向鍵切換)
- ❌ 缺少 `aria-selected` 無障礙屬性

### 3.2 L1 DNA 組件評價

**檔案**: `src/components/node/L1_DNA.tsx`

| 功能 | 評分 | 說明 |
|------|------|------|
| POI 分類顯示 | ⭐⭐⭐⭐⭐ | 動態計算、響應式網格 |
| 氛圍標籤篩選 | ⭐⭐⭐⭐ | 互動式過濾、水平滾動 |
| 抽屜詳情 | ⭐⭐⭐⭐ | 平滑動畫、子分類切換 |
| 地圖導航 | ⭐⭐⭐⭐ | Google Maps 備援連結 |

**問題與建議**:

| 問題 | 建議 |
|------|------|
| 氛圍標籤篩選狀態不持久 | 使用 URL 參數或 localStorage 保存 |
| 抽屜內項目動畫延遲過長 | 減少 `animationDelay: ${idx * 50}ms`，或使用虛擬滾動 |
| 無搜尋功能 | 在抽屜內新增搜尋輸入框 |
| 空狀態無行動呼籲 | 顯示「探索其他車站」按鈕 |

### 3.3 L2 Live 組件評價

**檔案**: `src/components/node/L2_Live.tsx`

| 功能 | 評分 | 說明 |
|------|------|------|
| 列車狀態顯示 | ⭐⭐⭐⭐ | 延誤/正常分開顯示、色彩編碼 |
| 天氣整合 | ⭐⭐⭐ | SmartWeatherCard 整合 |
| 人潮投票 | ⭐⭐⭐⭐ | Emoji 直覺 UI、樂觀更新 |
| VACAN 整合 | ⭐⭐⭐ | 外部人流地圖連結 |

**問題與建議**:

| 問題 | 嚴重度 | 建議 |
|------|--------|------|
| **無即時更新** | 🔴 高 | SSR 資料無輪詢。建議新增 30 秒自動刷新 |
| 天氣範圍固定「TOKYO WIDE」 | 🟠 中 | 應根據車站位置顯示區域天氣 |
| VACAN 連結硬編碼 | 🟠 中 | 僅東京站有效，需動態生成 |
| 投票無確認回饋 | 🟡 低 | 新增「感謝回報！」Toast |

**即時更新實作建議**:
```typescript
// 在 L2_Live 中新增輪詢
useEffect(() => {
    const interval = setInterval(() => {
        refetch();  // SWR 或自訂 fetch
    }, 30000);  // 30 秒
    return () => clearInterval(interval);
}, []);
```

### 3.4 L3 Facilities 組件評價

**檔案**: `src/components/node/L3_Facilities.tsx`

| 功能 | 評分 | 說明 |
|------|------|------|
| 設施圖示映射 | ⭐⭐⭐⭐ | 完整圖示庫、不區分大小寫 |
| 外部服務連結 | ⭐⭐⭐ | ecbo、計程車、自行車 |
| Modal 詳情 | ⭐⭐⭐⭐ | 無障礙資訊整合 |
| 活動追蹤 | ⭐⭐⭐⭐ | 外部連結點擊紀錄 |

**問題與建議**:

| 問題 | 建議 |
|------|------|
| 東京站專屬連結硬編碼 | 建立 station-links 資料表管理 |
| 每類別限制 10 項 | 新增「查看更多」按鈕 |
| 無障礙類別隱藏 | 顯示但標記「資料品質待改善」 |
| 設施無排序 | 按重要性或距離排序 |

### 3.5 L4 Dashboard/Chat 組件評價

**檔案**:
- `src/components/node/L4_Dashboard.tsx`
- `src/components/node/L4_Chat.tsx`
- `src/components/node/IntentSelector.tsx`

| 功能 | 評分 | 說明 |
|------|------|------|
| 需求狀態選擇 | ⭐⭐⭐ | 11 個布林值，過於複雜 |
| 意圖分類 | ⭐⭐⭐⭐ | AI 驅動 + 手動備援 |
| 建議卡片 | ⭐⭐⭐⭐ | StrategyCards 清晰呈現 |
| 對話介面 | ⭐⭐⭐⭐ | 角色區分、思考指示器 |

**問題與建議**:

| 問題 | 嚴重度 | 建議 |
|------|--------|------|
| **Demand 狀態不同步** | 🔴 高 | L4_Dashboard 與 L4_Chat 的需求狀態獨立。建議統一至 Zustand Store |
| 對話紀錄不持久 | 🟠 中 | 頁面刷新後遺失。建議存入 localStorage |
| 11 個布林值 UX 差 | 🟠 中 | 改用預設情境 (輪椅族、家庭、銀髮族) |
| 建議無理由說明 | 🟡 低 | 顯示「為何推薦此建議」 |

**Demand 狀態統一建議**:
```typescript
// 在 appStore.ts 中
interface AppState {
    demandState: L4DemandState;
    setDemandState: (state: Partial<L4DemandState>) => void;
}

// L4_Dashboard 和 L4_Chat 都使用相同 store
const { demandState, setDemandState } = useAppStore();
```

---

## 第四部分：整體優化建議

### 4.1 高優先級（應立即處理）

| # | 項目 | 檔案 | 預估工時 |
|---|------|------|----------|
| 1 | Session 持久化 | `supabaseAuth.ts` | 2h |
| 2 | Deep Linking 支援 | `MapContainer.tsx`, `layout.tsx` | 4h |
| 3 | L2 即時更新 | `L2_Live.tsx` | 2h |
| 4 | L4 Demand 狀態統一 | `appStore.ts`, `L4_*.tsx` | 3h |
| 5 | Profile 初始化降級 | `login/page.tsx` | 2h |

### 4.2 中優先級（1-2 週內）

| # | 項目 | 檔案 | 預估工時 |
|---|------|------|----------|
| 6 | 幾何聚類 (zoom 13-14) | `viewport/route.ts` | 8h |
| 7 | 對話紀錄持久化 | `L4_Chat.tsx` | 3h |
| 8 | 載入狀態 Spinner | `login/page.tsx` | 1h |
| 9 | Tab 鍵盤導航 | `NodeTabs.tsx` | 2h |
| 10 | 動態 VACAN 連結 | `L2_Live.tsx`, `L3_Facilities.tsx` | 4h |

### 4.3 低優先級（長期改進）

| # | 項目 | 說明 |
|---|------|------|
| 11 | 虛擬滾動 | L1 抽屜、L3 設施列表 |
| 12 | 需求預設情境 | 取代 11 個布林值 |
| 13 | 建議理由顯示 | L4 為何推薦 |
| 14 | 無障礙色彩對比稽核 | WCAG AAA |
| 15 | 效能監控 | Sentry/PostHog 整合 |

---

## 第五部分：評價總結

### 5.1 各面向評價

```
地圖節點顯示  ████████░░  7.0/10
  架構設計優秀，快取策略完善
  需改善：Deep Linking、幾何聚類

登入頁流程    ██████░░░░  6.5/10
  訪客存取完整，安全防護到位
  需改善：Session 持久化、錯誤訊息

L1 DNA       ████████░░  7.5/10
  分類清晰、動畫流暢
  需改善：篩選持久化、搜尋功能

L2 Live      ███████░░░  6.5/10
  狀態顯示清楚、投票直覺
  需改善：即時更新、位置感知天氣

L3 Facilities ███████░░░  7.0/10
  設施完整、追蹤到位
  需改善：去除硬編碼、排序邏輯

L4 Dashboard  ███████░░░  7.0/10
  意圖分類創新、對話流暢
  需改善：狀態同步、紀錄持久化
```

### 5.2 最終建議

專案前端 UI **已達到 MVP 發布水準**，但有以下重點需要優先處理：

1. **使用者體驗連貫性**
   - Session 持久化問題會導致使用者流失
   - Deep Linking 缺失影響分享和書籤功能

2. **資料即時性**
   - L2 列車狀態無輪詢，資訊可能過時
   - 需要明確標示資料更新時間

3. **狀態管理一致性**
   - L4 需求狀態分散在多個組件
   - 建議統一至全域 Store

4. **無障礙合規**
   - Tab 鍵盤導航缺失
   - Emoji 圖示需替換為可描述 SVG

---

**報告完成**: 2026-01-08
**審查檔案數**: 15+ 核心組件
**審查程式碼行數**: 3,000+
