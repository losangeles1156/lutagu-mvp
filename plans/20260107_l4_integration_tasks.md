# 2026-01-07 L4 整合任務計劃

## 任務概述

本計劃涵蓋三個 L4 層級的整合任務：
1. 意圖選擇器與 Dify Agent 整合測試
2. 移動設備觸控優化
3. L4_Chat 整合至 NodeTabs 的評估

---

## 任務一：意圖選擇器與 Dify Agent 整合測試

### 1.1 現況分析

#### IntentSelector.tsx (ChatPanel)
| 意圖 ID | 圖標 | 標籤 | 顏色 |
|---------|------|------|------|
| route | Route |路線 | emerald |
| status | Clock |狀態 | amber |
| station_facility | Info |設施 | blue |
| ticket_tips | Ticket |票券 | purple |
| weather | Cloud |天氣 | cyan |
| time | Calendar |時間 | rose |

#### useDifyChat.ts Quick Buttons
| ID | 標籤 (zh-TW) | 標籤 (ja) | 標籤 (en) | Profile |
|----|--------------|----------|----------|---------|
| route | 最快路線 | 最短ルート | Fastest Route | general |
| access | 無障礙 | バリアフリー | Accessibility | wheelchair |
| status | 延誤/代替 | 遅延・代替 | Delays & Backup | general |

### 1.2 問題診斷

**問題 1：意圖 ID 不一致**
- IntentSelector 使用 `station_facility`, `ticket_tips`, `weather`, `time`
- useDifyChat Quick Buttons 只有 `route`, `access`, `status`
- Dify Agent Prompt 可能無法正確解析未被定義的意圖

**問題 2：Prompt 注入不完整**
- ChatPanel 的 `streamFromDify` 傳遞 `selected_need` 參數
- 但 Dify Agent 的 System Prompt 可能未正確處理此參數
- 需要檢查 dify agent prompt 是否使用 `selected_need`

**問題 3：錯誤處理不足**
- 網路超時時僅顯示離線狀態
- 缺少重試機制
- 缺少意圖識別失敗的 fallback

### 1.3 測試項目清單

#### 1.3.1 API 整合測試

```typescript
// 測試案例：意圖選擇器 → Dify API 流程
describe('IntentSelector → Dify Integration', () => {
    test('選擇 route 意圖後發送查詢，Agent 應正確理解為路線規劃需求', () => {
        // Setup
        render(<IntentSelector />);
        fireEvent.click(screen.getByText('路線'));

        // Simulate chat input
        const input = '從新宿到涉谷怎麼走？';
        fireEvent.change(getChatInput(), { target: { value: input } });
        fireEvent.click(getSendButton());

        // Verify API call includes correct intent
        expect(fetchMock).toHaveBeenCalledWith('/api/dify/chat', expect.objectContaining({
            body: JSON.stringify(expect.objectContaining({
                inputs: expect.objectContaining({
                    selected_need: 'route'
                })
            }))
        }));
    });

    test('選擇無障礙意圖後，Agent 應優先回覆電梯/電坡資訊', () => {
        // Similar setup for accessibility intent
    });

    test('多意圖組合時（如 route + accessibility），應正確組合需求', () => {
        // Test combined intents
    });
});
```

#### 1.3.2 意圖識別準確率測試

| 測試輸入 | 預期意圖 | 測試場景 |
|----------|----------|----------|
| "從新宿到東京車站哪條線最快？" | route | 路線規劃查詢 |
| "現在山手線有延誤嗎？" | status | 即時運行狀態查詢 |
| "這個車站有電梯嗎？" | station_facility | 設施查詢 |
| "怎麼買西瓜卡？" | ticket_tips | 票券資訊查詢 |
| "今天東京天氣如何？" | weather | 天氣查詢 |
| "末班車幾點？" | time | 時刻查詢 |

#### 1.3.3 錯誤處理測試

- 網路超時測試 (10秒無回應)
- 401/403 認證錯誤測試
- 500 伺服器錯誤測試
- 空回應測試
- 中斷連線重連測試

### 1.4 實作步驟

#### Step 1: 修復意圖 ID 對應
```typescript
// src/components/chat/IntentSelector.tsx

// 修改意圖定義，使其與 Dify Quick Buttons 對應
const intents: IntentOption[] = [
    { id: 'route', icon: Route, label: t('route'), color: 'bg-emerald-100 text-emerald-700' },
    { id: 'access', icon: Wheelchair, label: t('accessibility'), color: 'bg-blue-100 text-blue-700' },
    { id: 'status', icon: Clock, label: t('status'), color: 'bg-amber-100 text-amber-700' },
    // 保留額外資訊選項，但標記為 secondary
    { id: 'facility', icon: Info, label: t('facility'), color: 'bg-slate-100 text-slate-500', secondary: true },
    { id: 'ticket', icon: Ticket, label: t('ticket'), color: 'bg-slate-100 text-slate-500', secondary: true },
];
```

#### Step 2: 強化 Prompt 注入
```typescript
// src/components/chat/ChatPanel.tsx

// 確保 selected_need 被正確注入到 Dify Prompt
const buildDifyInputs = (selectedNeed: string | null) => ({
    user_profile: userProfile || 'general',
    user_context: userContext || [],
    current_station: currentNodeId || '',
    station_name: getStationName(currentNodeId),
    lat: mapCenter?.lat || null,
    lng: mapCenter?.lon || null,
    selected_need: selectedNeed || null,
    // 新增：意圖詳細資訊
    intent_detail: getIntentDetails(selectedNeed),
    locale,
    zone: zone || 'core',
    user_id: effectiveDifyUserId
});
```

#### Step 3: 添加重試與錯誤處理
```typescript
// 增強 sendMessage 函數
const sendWithRetry = async (text: string, retries: number = 3) => {
    try {
        await streamFromDify({ query: text, includeUserMessage: true });
    } catch (error) {
        if (retries > 0 && isNetworkError(error)) {
            await new Promise(r => setTimeout(r, 1000)); // wait 1s
            await sendWithRetry(text, retries - 1);
        } else {
            setIsOffline(true);
        }
    }
};
```

### 1.5 驗收標準

- [ ] 6 個主要意圖（route, status, accessibility）測試通過率 100%
- [ ] API 錯誤時顯示友善的用戶訊息
- [ ] 網路超時（10秒）後顯示重試選項
- [ ] 意圖選擇狀態在對話過程中保持可見

---

## 任務二：移動設備觸控優化

### 2.1 現況分析

#### 觸控目標尺寸檢測

| 組件 | 當前尺寸 | 最小需求 | 狀態 |
|------|----------|----------|------|
| IntentSelector 按鈕 | 36x24px | 44x44px | ❌ 過小 |
| ChatPanel 輸入框 | 48px min-h | 44x44px | ✅ 合格 |
| ChatPanel 發送按鈕 | 48x48px | 44x44px | ✅ 合格 |
| L4_Chat 快速按鈕 | 48x36px | 44x44px | ⚠️ 邊緣 |
| L4_Chat 需求晶片 | 48x36px | 44x44px | ⚠️ 邊緣 |
| L4_Chat 發送按鈕 | 100% x 48px | 44x44px | ✅ 合格 |

### 2.2 問題診斷

**問題 1：IntentSelector 按鈕太小**
- 當前：px-3 py-1.5 (約 36x24px)
- 需求：最小 44x44px
- 影響：手指操作時容易誤觸鄰近按鈕

**問題 2：L4_Chat 快速按鈕高度不足**
- 當前：py-2.5 (約 36px)
- 需求：44px
- 影響：拇指操作時準確度降低

**問題 3：缺少觸控回饋**
- 部分按鈕缺少 `active:scale` 效果
- 缺少視覺和觸覺回饋的一致性

### 2.3 優化方案

#### Step 1: 統一觸控目標尺寸

```css
/* src/app/globals.css */

/* 定義觸控目標基礎類別 */
.touch-target {
    min-width: 44px;
    min-height: 44px;
}

/* 強化觸控回饋 */
.touch-interactive {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
}

.touch-interactive:active {
    transform: scale(0.96);
    transition: transform 0.1s ease-out;
}
```

#### Step 2: 更新 IntentSelector

```tsx
// src/components/chat/IntentSelector.tsx

return (
    <div className="flex flex-wrap gap-2 px-1 py-2 touch-interactive">
        {intents.map((intent) => {
            const isActive = selectedNeed === intent.id;
            const Icon = intent.icon;
            return (
                <button
                    key={intent.id}
                    onClick={() => toggleIntent(intent.id)}
                    className={`
                        flex items-center gap-1.5 px-4 py-2.5 rounded-full
                        text-xs font-bold border transition-all
                        min-w-[44px] min-h-[44px]
                        ${isActive
                            ? intent.color + ' shadow-sm scale-105 ring-2 ring-offset-1 ring-current'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        }
                        ${intent.secondary ? 'opacity-70' : ''}
                    `}
                    aria-label={intent.label}
                    title={intent.label}
                >
                    <Icon size={14} strokeWidth={3} className={isActive ? 'opacity-100' : 'opacity-50'} />
                    <span>{intent.label}</span>
                </button>
            );
        })}
    </div>
);
```

#### Step 3: 更新 L4_Chat 快速按鈕

```tsx
// src/components/node/L4_Chat.tsx

// 快速按鈕
<div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide touch-interactive">
    {quickButtons().map((b: QuickButton) => (
        <button
            key={b.id}
            onClick={() => handleQuickButton(b)}
            disabled={isLoading}
            className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100
                     text-xs font-black whitespace-nowrap text-slate-700
                     hover:border-indigo-200 transition-all
                     min-w-[44px] min-h-[44px] touch-target
                     disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
        >
            {b.label}
        </button>
    ))}
</div>

// 需求晶片
<div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide touch-interactive">
    {demands.map(demand => {
        const isSelected = selectedDemands.includes(demand.id);
        return (
            <button
                key={demand.id}
                onClick={() => toggleDemand(demand.id)}
                disabled={isLoading}
                className={`
                    flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-black
                    whitespace-nowrap transition-all min-h-[44px] touch-target
                    ${isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105'
                        : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'
                    }
                `}
            >
                <demand.icon size={14} />
                {demand.label}
            </button>
        );
    })}
</div>
```

#### Step 4: 更新清除按鈕

```tsx
{selectedNeed && (
    <button
        onClick={() => setSelectedNeed(null)}
        className="flex items-center gap-1 px-4 py-2.5 rounded-full
                 text-xs font-bold border border-gray-200 text-gray-400
                 hover:border-gray-300 hover:text-gray-600 transition-all
                 min-w-[44px] min-h-[44px] touch-target active:scale-95"
        title={tCommon('clear')}
        aria-label={tCommon('clear')}
    >
        ✕
    </button>
)}
```

### 2.4 跨平台相容性

```css
/* iOS Safari 特定修復 */
@media (hover: none) and (pointer: coarse) {
    .touch-target {
        min-height: 48px; /* iOS 建議尺寸 */
    }

    button, [role="button"] {
        cursor: pointer; /* 移除 hover 效果 */
    }
}

/* Android Chrome 特定修復 */
@media (hover: none) and (pointer: coarse) {
    .touch-interactive:active {
        transform: scale(0.94); /* 更明顯的觸控回饋 */
    }
}
```

### 2.5 驗收標準

- [ ] 所有互動元素最小尺寸為 44x44px
- [ ] 通過 Chrome DevTools 觸控模擬測試
- [ ] 通過 iOS Safari 實機測試
- [ ] 通過 Android Chrome 實機測試
- [ ] 觸控回饋延遲 < 100ms
- [ ] 無誤觸相鄰按鈕的情況

---

## 任務三：L4_Chat 整合至 NodeTabs 的評估

### 3.1 現況分析

#### NodeTabs 架構
```
NodeTabs
├── Tab: dna (L1_DNA) - 車站DNA/氛圍
├── Tab: live (L2_Live) - 即時運行狀態
├── Tab: facility (L3_Facilities) - 設施資訊
└── Tab: lutagu (L4_Dashboard) - 智能規劃
```

#### L4_Dashboard 功能
- 表單驅動的查詢介面
- 支援 route/knowledge/timetable 三種任務類型
- 車站選擇、目的地設定、需求晶片選擇
- 範本快速選擇
- API 結果展示（路線、票價、時刻表）

#### L4_Chat 功能
- 對話驅動的查詢介面
- 支援 variant="bambi" | "strategy"
- 快速按鈕（最快路線、無障礙、延誤替代）
- 需求晶片選擇
- 對話式結果展示

### 3.2 整合方案比較

#### 方案 A：並存雙模式（推薦）

**架構**
```
lutagu tab
├── L4_Dashboard (預設，表單模式)
└── L4_Chat (可切換，對話模式)
```

**實作方式**
```tsx
// src/components/node/L4_Dashboard.tsx

export default function L4_Dashboard({ ... }) {
    const [chatMode, setChatMode] = useState(false);

    return (
        <div className="h-full bg-slate-50">
            {/* 模式切換開關 */}
            <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm pt-4 px-4 pb-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setChatMode(false)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all
                            ${!chatMode ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}
                    >
                        📋 {t('formMode')}
                    </button>
                    <button
                        onClick={() => setChatMode(true)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all
                            ${chatMode ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}
                    >
                        💬 {t('chatMode')}
                    </button>
                </div>
            </div>

            {chatMode ? (
                <L4_Chat data={profileData} variant="strategy" />
            ) : (
                <L4_DashboardForm {...formProps} />
            )}
        </div>
    );
}
```

**優點**
- ✅ 用戶可根據偏好選擇模式
- ✅ 保留表單模式的結構化查詢優勢
- ✅ 對話模式提供更自然的 AI 互動
- ✅ 實作成本低（無需重構現有代碼）

**缺點**
- ⚠️ 需要管理兩套狀態
- ⚠️ 用戶可能需要學習兩種模式

#### 方案 B：L4_Chat 取代 L4_Dashboard

**架構**
```
lutagu tab
└── L4_Chat (唯一入口)
```

**優點**
- ✅ 統一的使用者體驗
- ✅ 減少代碼維護成本
- ✅ 更強的 AI 對話能力

**缺點**
- ⚠️ 失去表單驅動的結構化查詢優勢
- ⚠️ 用戶可能習慣表單輸入
- ⚠️ 需要重構大量現有代碼

#### 方案 C：L4_Chat 整合為子組件

**架構**
```
lutagu tab
└── L4_Dashboard (含 L4_Chat 內嵌)
    ├── 表單區塊 (可收合)
    └── L4_Chat 對話區塊 (可展開)
```

**優點**
- ✅ 兩種模式無縫切換
- ✅ 保留表單作為對話的「快捷鍵」
- ✅ 用戶體驗流暢

**缺點**
- ⚠️ 介面複雜度增加
- ⚠️ 實作成本最高

### 3.3 推薦方案：方案 A（並存雙模式）

#### 實作優先順序

**Phase 1：基礎整合**
1. 在 L4_Dashboard 添加模式切換開關
2. 引入 L4_Chat 作為替代視圖
3. 共享 `profile` 資料結構

**Phase 2：狀態同步**
1. 同步用戶偏好設置（userProfile, selectedDemands）
2. 同步對話上下文

**Phase 3：體驗優化**
1. 根據用戶行為推薦模式
2. 記住用戶的偏好模式選擇

### 3.4 技術評估

#### 相容性檢查

| 依賴項 | L4_Dashboard | L4_Chat | 相容性 |
|--------|--------------|---------|--------|
| StationUIProfile | ✅ | ✅ | 完全相容 |
| useDifyChat | ❌ | ✅ | 需引入 |
| L4DemandState | ✅ | 部分 | 需對應 |
| useApiFetch | ✅ | ❌ | 需引入 |

#### 實作成本估算

| 工作項目 | 預估複雜度 |
|----------|-----------|
| 模式切換 UI | 低 |
| L4_Chat 引入 | 中 |
| 狀態同步 | 中 |
| 測試覆蓋 | 高 |

### 3.5 行動建議

1. **短期（1-2 天）**：實現方案 A 的 Phase 1，驗證用戶接受度
2. **中期（1 週）**：根據用戶回饋決定是否推進至 Phase 2
3. **長期（2-4 週）**：如方案 A 成功，可考慮方案 C 進一步整合

---

## 總結

| 任務 | 優先順序 | 預估工時 | 風險等級 |
|------|----------|----------|----------|
| 意圖選擇器與 Dify Agent 整合測試 | 高 | 2-3 天 | 中 |
| 移動設備觸控優化 | 高 | 1 天 | 低 |
| L4_Chat 整合至 NodeTabs 評估 | 中 | 2-3 天 | 中 |

### 下一步行動

1. ✅ 確認本計劃是否符合預期
2. 切換至 Code Mode 實作
3. 優先處理觸控優化（風險最低、效益明顯）
4. 並行進行意圖選擇器測試
5. 最後進行 L4_Chat 整合評估

---

*建立日期：2026-01-07*
*作者：Architect Mode*
