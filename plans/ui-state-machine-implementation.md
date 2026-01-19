# 前端 UI 狀態機實作計劃

> **版本**：v1.0
> **日期**：2026-01-07
> **模式**：Architect
> **任務**：實作狀態機模式管理 UI 介面互動與狀態持久化

---

## 1. 狀態機架構設計

### 1.1 三種核心狀態定義

```
┌─────────────────────────────────────────────────────────────────┐
│                    UI 狀態機架構                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    點擊登入按鈕     ┌───────────────────┐       │
│  │   登入頁     │ ─────────────────► │  全螢幕對話狀態    │       │
│  │  (Login)    │                    │  (Fullscreen)     │       │
│  └─────────────┘                    └─────────┬─────────┘       │
│                                               │                 │
│                                               ▼                 │
│  ┌─────────────┐    關閉對話框        ┌───────────────────┐       │
│  │   登入頁     │ ◄────────────────── │   側邊收合狀態     │       │
│  │  (Login)    │                    │   (Collapsed)     │       │
│  └─────────────┘                    └─────────┬─────────┘       │
│                                               │                 │
│                          ┌────────────────────┴──────┐         │
│                          │                           │         │
│                          ▼                           ▼         │
│              ┌───────────────────┐        ┌───────────────────┐  │
│              │  地圖探索狀態      │        │  重新登入/初始化   │  │
│              │  (Explore)        │        │  (Re-auth)        │  │
│              └───────────────────┘        └───────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 狀態詳細定義

| 狀態名稱 | 狀態值 | 說明 | 裝置差異 |
|----------|--------|------|----------|
| `LOGIN` | `'login'` | 登入頁面，等待使用者登入 | 無差異 |
| `FULLSCREEN` | `'fullscreen'` | 全螢幕對話，對話框佔據整個視窗 | 無差異 |
| `COLLAPSED_DESKTOP` | `'collapsed_desktop'` | 右側垂直面板，寬度 20%-25% | 桌機 (>768px) |
| `COLLAPSED_MOBILE` | `'collapsed_mobile'` | 底部水平面板，高度 25%-30% | 手機 (≤768px) |
| `EXPLORE` | `'explore'` | 地圖探索，地圖佔據 90% 視窗 | 無差異 |

### 1.3 狀態轉換矩陣

```
事件 →    登入按鈕    關閉對話    點擊對話面板    返回按鈕
─────────────────────────────────────────────────────────────
LOGIN      → FULLSCREEN    -           -              -
FULLSCREEN → -            COLLAPSED_*  -              -
COLLAPSED_* → -            -           EXPLORE        LOGIN
EXPLORE    → -            -           -              COLLAPSED_*
```

---

## 2. 狀態管理設計

### 2.1 擴展 Zustand Store

```typescript
// src/stores/uiStateMachine.ts
interface UIState {
  // 核心狀態
  uiState: 'login' | 'fullscreen' | 'collapsed_desktop' | 'collapsed_mobile' | 'explore';

  // 裝置偵測
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;

  // 對話相關
  messages: ChatMessage[];
  pendingInput: string;
  inputFocus: boolean;

  // 動畫控制
  isAnimating: boolean;
  animationDirection: 'forward' | 'backward' | null;

  // 持久化
  lastState: 'login' | 'fullscreen' | 'collapsed_desktop' | 'collapsed_mobile' | 'explore';
  sessionStartTime: number;
}

// 動作定義
type UIAction =
  | { type: 'LOGIN_SUCCESS' }
  | { type: 'CLOSE_CHAT' }
  | { type: 'EXPAND_CHAT' }
  | { type: 'TOGGLE_EXPLORE' }
  | { type: 'SET_DEVICE_TYPE'; payload: { isMobile: boolean; isTablet: boolean; isDesktop: boolean } }
  | { type: 'SET_INPUT_TEXT'; payload: string }
  | { type: 'SET_INPUT_FOCUS'; payload: boolean }
  | { type: 'START_ANIMATION'; payload: { direction: 'forward' | 'backward' } }
  | { type: 'END_ANIMATION' }
  | { type: 'RESET_SESSION' };
```

### 2.2 持久化策略

```typescript
// 使用 localStorage 持久化
const persistConfig = {
  name: 'lutagu-ui-state',
  partialize: (state: UIState) => ({
    lastState: state.lastState,
    sessionStartTime: state.sessionStartTime,
    messages: state.messages.slice(-50), // 只保留最近 50 條訊息
    pendingInput: state.pendingInput,
  }),
};
```

---

## 3. 組件架構

### 3.1 新增目錄結構

```
src/
├── components/
│   ├── ui-state/
│   │   ├── UIStateManager.tsx      # 狀態管理器
│   │   ├── StateTransition.tsx     # 動畫過渡組件
│   │   ├── LoginPanel.tsx          # 登入面板
│   │   ├── ChatCollapsedPanel.tsx  # 收合對話面板
│   │   └── ExploreModeTrigger.tsx  # 探索模式觸發器
│   │
│   └── layout/
│       ├── ResponsiveLayout.tsx    # 響應式佈局
│       └── MainLayout.tsx          # 更新版主佈局
│
├── hooks/
│   ├── useUIStateMachine.ts        # 狀態機 Hook
│   ├── useDeviceType.ts            # 裝置類型偵測
│   └── useStatePersistence.ts      # 持久化 Hook
│
└── stores/
    ├── uiStateMachine.ts           # 狀態機 Store
    └── appStore.ts                 # 現有 Store (更新)
```

### 3.2 組件職責

| 組件 | 職責 |
|------|------|
| `UIStateManager` | 監控狀態變化，觸發對應的 UI 渲染 |
| `StateTransition` | 使用 framer-motion 管理動畫過渡 |
| `LoginPanel` | 處理登入邏輯，成功後切換至 FULLSCREEN |
| `ChatCollapsedPanel` | 顯示收合狀態的對話預覽與輸入框 |
| `ExploreModeTrigger` | 在收合狀態下提供進入探索模式的入口 |

---

## 4. 響應式設計

### 4.1 斷點定義

```typescript
// src/lib/constants/breakpoints.ts
export const BREAKPOINTS = {
  MOBILE: 768,      // ≤768px 為手機
  TABLET: 1024,     // 769-1024px 為平板
  DESKTOP: 1025,    // >1024px 為桌機
};

export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
} as const;
```

### 4.2 裝置適配佈局

```
┌─────────────────────────────────────────────────────────────────┐
│                    桌機 (>768px) 收合狀態                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐  ┌──────────────────────────┐      │
│  │                         │  │                          │      │
│  │        地圖區域          │  │      對話面板            │      │
│  │    (佔據 75%-80%)        │  │    (寬度 20%-25%)        │      │
│  │                         │  │                          │      │
│  │  ┌───────────────────┐  │  │  ┌────────────────────┐  │      │
│  │  │   [地圖節點縮圖]   │  │  │  │  最近對話訊息      │  │      │
│  │  └───────────────────┘  │  │  │  └────────────────────┘  │      │
│  │                         │  │  │                          │      │
│  │                         │  │  │  ┌────────────────────┐  │      │
│  │                         │  │  │  │     輸入框         │  │      │
│  │                         │  │  │  └────────────────────┘  │      │
│  │                         │  │  │                          │      │
│  └─────────────────────────┘  └──────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    手機 (≤768px) 收合狀態                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐                                     │
│  │                         │                                     │
│  │        地圖區域          │                                     │
│  │    (佔據 70%-75%)        │                                     │
│  │                         │                                     │
│  └─────────────────────────┘                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │                    對話面板                             │    │
│  │                  (高度 25%-30%)                          │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │              最近對話訊息                        │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │                   輸入框                         │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 動畫過渡設計

### 5.1 使用 Framer Motion

```typescript
// src/components/ui-state/StateTransition.tsx
const stateTransitions = {
  login: { opacity: 0, y: 20 },
  fullscreen: { opacity: 1, y: 0 },
  collapsed_desktop: {
    x: 0,
    width: '20%-25%',
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  explore: {
    scale: 0.9,
    opacity: 0.8,
    transition: { duration: 0.4, ease: 'easeInOut' }
  },
};

export function StateTransition({
  children,
  uiState
}: StateTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={uiState}
        initial="login"
        animate={uiState}
        exit="login"
        variants={stateTransitions}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

### 5.2 動畫時序圖

```
使用者動作          狀態變化           動畫效果              時間
───────────────────────────────────────────────────────────────
點擊登入按鈕   →   login→fullscreen   淡入 + 上移           300ms
關閉對話框     →   fullscreen→collapsed 滑入右側           300ms
點擊對話面板   →   collapsed→explore   地圖放大           400ms
返回按鈕       →   explore→collapsed   地圖縮小           400ms
```

---

## 6. 登入流程整合

### 6.1 登入頁面流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        登入流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 使用者進入頁面                                               │
│     ↓                                                            │
│  2. 檢查 localStorage 是否有有效 session                         │
│     ↓                    ↓                                       │
│  [有 session]          [無 session]                              │
│     ↓                    ↓                                       │
│  3. 恢復 lastState     4. 顯示登入面板                           │
│     ↓                    ↓                                       │
│  4. 進入 lastState     5. 使用者點擊登入                          │
│     ↓                    ↓                                       │
│  5. 渲染對應 UI     6. 設定 difyUserId                           │
│                         ↓                                        │
│                       7. 切換至 fullscreen                       │
│                         ↓                                        │
│                       8. 渲染對話介面                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 登入面板設計

```typescript
// src/components/ui-state/LoginPanel.tsx
export function LoginPanel() {
  const { transitionTo } = useUIStateMachine();

  const handleLogin = async () => {
    // 1. 產生或取得 difyUserId
    const userId = await generateDifyUserId();

    // 2. 儲存至 localStorage
    saveToLocalStorage('difyUserId', userId);

    // 3. 切換至 fullscreen 狀態
    transitionTo('fullscreen');
  };

  return (
    <div className="login-container">
      <h1>歡迎使用 LUTAGU</h1>
      <button onClick={handleLogin}>
        使用 Google 登入
      </button>
      {/* 或使用 Email 登入 */}
    </div>
  );
}
```

---

## 7. 對話狀態保存機制

### 7.1 訊息持久化

```typescript
// 只保留最近 50 條訊息，避免 localStorage 溢出
const MAX_MESSAGES = 50;

// 自動儲存邏輯
useEffect(() => {
  if (messages.length > 0) {
    saveToLocalStorage('pendingMessages', messages.slice(-MAX_MESSAGES));
  }
}, [messages]);

// 恢復邏輯
useEffect(() => {
  const saved = loadFromLocalStorage('pendingMessages');
  if (saved) {
    setMessages(saved);
  }
}, []);
```

### 7.2 輸入框狀態保存

```typescript
// 當使用者輸入時，持續保存輸入內容
const handleInputChange = (text: string) => {
  setPendingInput(text);
  saveToLocalStorage('pendingInput', text);
};

// 狀態恢復時，如果有待處理的輸入，自動填入
useEffect(() => {
  const saved = loadFromLocalStorage('pendingInput');
  if (saved) {
    setPendingInput(saved);
  }
}, []);
```

---

## 8. 實施步驟

### Phase 1: 基礎設施
1. 建立 `src/lib/constants/breakpoints.ts`
2. 建立 `src/stores/uiStateMachine.ts`
3. 建立 `src/hooks/useDeviceType.ts`

### Phase 2: 狀態管理
1. 更新 `src/stores/appStore.ts` 整合新狀態
2. 建立 `src/hooks/useUIStateMachine.ts`
3. 建立 `src/hooks/useStatePersistence.ts`

### Phase 3: 組件實作
1. 建立 `src/components/ui-state/LoginPanel.tsx`
2. 建立 `src/components/ui-state/ChatCollapsedPanel.tsx`
3. 建立 `src/components/ui-state/StateTransition.tsx`
4. 更新 `src/components/layout/MainLayout.tsx`

### Phase 4: 動畫與互動
1. 整合 Framer Motion 動畫
2. 實現流暢的狀態轉換
3. 添加視覺回饋效果

### Phase 5: 測試與優化
1. 撰寫單元測試
2. 測試各裝置類型的響應式
3. 優化動畫效能
4. 進行使用者驗收測試

---

## 9. 驗收標準

- [ ] 狀態機正確管理三種核心狀態
- [ ] 登入後直接進入全螢幕對話狀態
- [ ] 關閉對話後根據裝置類型進入對應收合狀態
- [ ] 在收合狀態下點擊對話面板進入地圖探索狀態
- [ ] 對話記錄在狀態切換時不會遺失
- [ ] 響應式設計正確偵測裝置類型
- [ ] 狀態持久化至 localStorage
- [ ] 動畫過渡流暢自然
- [ ] 所有按鈕尺寸符合無障礙標準 (≥44x44px)

---

> **計劃完成日期**：2026-01-07
> **下一步**：切換至 Code 模式實施
