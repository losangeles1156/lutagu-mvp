# LUTAGU 前端 Bug 快速修復指南

**基於**: frontend-debug-report-20260118.md
**預計修復時間**: 3 天
**優先級排序**: 高 → 中 → 低

---

## 🚨 高優先級修復 (今天完成)

### 1. 修復 i18n 硬編碼字串

**問題**: 11 個檔案包含未翻譯的硬編碼字串

**修復步驟**:

#### Step 1: 執行完整掃描 (5 分鐘)
```bash
python .agent/scripts/i18n/i18n_checker.py src/ > i18n_issues.txt
cat i18n_issues.txt
```

#### Step 2: 建立缺失的翻譯 keys (15 分鐘)

找到你的 locale 檔案 (通常在 `messages/` 或 `locales/` 目錄)，新增：

```json
// messages/zh-TW.json
{
  "home": {
    "title": "首頁",
    "welcome": "歡迎使用 LUTAGU"
  },
  "admin": {
    "dashboard": "管理儀表板"
  }
}

// messages/ja.json
{
  "home": {
    "title": "ホーム",
    "welcome": "LUTAGUへようこそ"
  },
  "admin": {
    "dashboard": "管理ダッシュボード"
  }
}

// messages/en.json
{
  "home": {
    "title": "Home",
    "welcome": "Welcome to LUTAGU"
  },
  "admin": {
    "dashboard": "Admin Dashboard"
  }
}
```

#### Step 3: 修改受影響的元件 (30 分鐘)

```typescript
// ❌ 修改前: src/app/[locale]/page.tsx
export default function HomePage() {
  return <h1>Home</h1>
}

// ✅ 修改後
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('home');
  return <h1>{t('title')}</h1>
}
```

**修改檔案清單**:
- [ ] `src/app/[locale]/page.tsx`
- [ ] `src/app/[locale]/layout.tsx`
- [ ] `src/app/[locale]/admin/page.tsx`
- [ ] 其他 8 個檔案 (依據 i18n_issues.txt)

#### Step 4: 驗證 (10 分鐘)
```bash
# 重新掃描確認
python .agent/scripts/i18n/i18n_checker.py src/

# 啟動開發伺服器測試
npm run dev

# 測試語言切換
# 瀏覽器開啟 http://localhost:3000
# 切換 繁中 / 英文 / 日文
```

**預期結果**:
- ✅ i18n 掃描器報告 0 個硬編碼字串
- ✅ 三語切換正常顯示

---

### 2. 清理生產環境 Console 日誌

**問題**: 26 個元件包含 50+ 個 console 呼叫

**修復步驟**:

#### Step 1: 建立 Logger 工具 (10 分鐘)

```typescript
// src/lib/utils/logger.ts
type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDev = process.env.NODE_ENV === 'development';

  log(...args: any[]) {
    if (this.isDev) console.log(...args);
  }

  info(...args: any[]) {
    if (this.isDev) console.info(...args);
  }

  warn(...args: any[]) {
    console.warn(...args);
  }

  error(...args: any[]) {
    console.error(...args);
    // TODO: 未來可整合 Sentry
  }

  debug(...args: any[]) {
    if (this.isDev) console.debug(...args);
  }
}

export const logger = new Logger();
```

#### Step 2: 批次替換 console 呼叫 (45 分鐘)

**優先處理的元件** (包含最多 console 呼叫):

```typescript
// ❌ 修改前: src/components/map/MapContainer.tsx
console.log('Fetching nodes...');
console.error('Failed to load:', error);

// ✅ 修改後
import { logger } from '@/lib/utils/logger';

logger.log('Fetching nodes...');
logger.error('Failed to load:', error);
```

**修改檔案清單** (按優先級):
- [ ] `src/components/map/MapContainer.tsx` (14 個)
- [ ] `src/components/chat/ChatOverlay.tsx` (4 個)
- [ ] `src/components/admin/NodeMerger.tsx` (3 個)
- [ ] `src/components/node/L4_Dashboard.tsx` (3 個)
- [ ] `src/components/node/L2_Live.tsx` (2 個)
- [ ] 其他 21 個元件

**快速批次替換技巧**:
```bash
# 使用 VS Code 全域搜尋替換
# 搜尋: console\.log\(
# 替換: logger.log(

# 或使用 sed (macOS)
find src/components -name "*.tsx" -exec sed -i '' 's/console\.log/logger.log/g' {} \;
find src/components -name "*.tsx" -exec sed -i '' 's/console\.error/logger.error/g' {} \;
```

#### Step 3: 驗證 (5 分鐘)
```bash
# 確認無殘留 console.log
grep -r "console\.log" src/components/

# 應該返回空結果或只有 logger.ts 檔案
```

---

## 🟡 中優先級修復 (本週完成)

### 3. 優化 l1/todo API 批次查詢

**問題**: API 可能因全表掃描導致效能問題

**檔案**: `src/app/api/l1/todo/route.ts:33`

**修復方案**:

```typescript
// ❌ 修改前
// Using a hack: fetching all stations from l1_places might be heavy
const { data: allStations } = await supabase
  .from('l1_places')
  .select('*');

// ✅ 修改後 - 使用分頁查詢
const PAGE_SIZE = 100;
const { data: allStations } = await supabase
  .from('l1_places')
  .select('*')
  .limit(PAGE_SIZE)
  .offset(page * PAGE_SIZE);

// 或使用視圖/索引優化
const { data: allStations } = await supabase
  .from('l1_places')
  .select('id, name, category')  // 只查詢需要的欄位
  .eq('is_active', true)         // 加入過濾條件
  .order('created_at', { ascending: false });
```

---

### 4. 整合 XML 解析器至 JMA Parser

**問題**: JMA 災害資料解析不完整

**檔案**: `src/lib/l5/jmaParser.ts:99`

**修復步驟**:

```bash
# Step 1: 安裝 XML 解析器
npm install fast-xml-parser
npm install -D @types/fast-xml-parser
```

```typescript
// Step 2: 修改 jmaParser.ts
import { XMLParser } from 'fast-xml-parser';

// ❌ 修改前
// TODO: 使用 xml2js 或 fast-xml-parser 進行完整解析

// ✅ 修改後
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_'
});

const parsedData = parser.parse(xmlString);
```

---

### 5. 實作真實座標傳遞

**問題**: 避難決策使用假座標

**檔案**: `src/lib/l5/decisionEngine.ts:87`

**修復方案**:

```typescript
// ❌ 修改前
fromCoordinates: { lat: 35.6895, lng: 139.6917 }, // 假設用戶位置 (TODO)

// ✅ 修改後 - 從參數傳入
export async function getEvacuationDecision(
  userLocation: { lat: number; lng: number },
  disasterType: string
) {
  // ...
  fromCoordinates: userLocation, // 使用真實座標
}

// 在呼叫端獲取座標
// Option 1: 從 GPS
navigator.geolocation.getCurrentPosition((position) => {
  const { latitude, longitude } = position.coords;
  getEvacuationDecision({ lat: latitude, lng: longitude }, 'earthquake');
});

// Option 2: 從地圖點擊
map.on('click', (e) => {
  const { lat, lng } = e.latlng;
  getEvacuationDecision({ lat, lng }, 'earthquake');
});
```

---

## 🟢 低優先級維護 (下週規劃)

### 6. 清理其他 TODO 技術債

可以創建 GitHub Issues 追蹤：

```markdown
# Issue Template

## TODO 項目
- [ ] Repositories.ts:60 - 實作資料查詢邏輯
- [ ] jmaParser.ts:99 - ✅ 已完成 (上面處理)
- [ ] decisionEngine.ts:78 - 整合 Supabase 避難所查詢
- [ ] decisionEngine.ts:87 - ✅ 已完成 (上面處理)
- [ ] l1/todo/route.ts:33 - ✅ 已完成 (上面處理)

## 優先級
Medium

## 預計時間
5 小時
```

---

## 📋 修復檢查清單

### Day 1: i18n 修復
- [ ] 執行 i18n 掃描
- [ ] 建立缺失的翻譯 keys (繁中 10 個, 日文 4 個)
- [ ] 修改 11 個受影響檔案
- [ ] 驗證三語切換功能
- [ ] Commit: `fix(i18n): remove hardcoded strings, add missing translations`

### Day 2: Console 日誌清理
- [ ] 建立 logger.ts 工具
- [ ] 替換 MapContainer.tsx (14 個)
- [ ] 替換其他 25 個元件 (36 個 console 呼叫)
- [ ] 驗證生產環境無 console.log
- [ ] Commit: `refactor: replace console with logger utility`

### Day 3: API 優化
- [ ] 優化 l1/todo API 查詢
- [ ] 整合 fast-xml-parser
- [ ] 實作真實座標傳遞
- [ ] 測試相關功能
- [ ] Commit: `perf(api): optimize l1/todo query, integrate xml parser`

---

## 🧪 測試驗證

### i18n 驗證
```bash
# 自動化測試
python .agent/scripts/i18n/i18n_checker.py src/
# 預期: [OK] 0 issues found

# 手動測試
1. 啟動 `npm run dev`
2. 開啟 http://localhost:3000
3. 切換語言: 繁中 → 英文 → 日文
4. 檢查所有頁面是否正確顯示
```

### Console 日誌驗證
```bash
# 檢查是否還有殘留
grep -r "console\.log" src/components/

# 生產環境檢查
npm run build
npm start
# 開啟瀏覽器 DevTools Console，應無除錯訊息
```

### API 效能驗證
```bash
# 使用 Thunder Client / Postman 測試
GET /api/l1/todo

# 檢查回應時間
# 修復前: ~500ms
# 修復後: <100ms (預期)
```

---

## 🚀 完成後效果

修復完成後，專案將達到：

| 指標 | 修復前 | 修復後 |
|------|--------|--------|
| i18n 完整度 (zh-TW) | 95% | ✅ 100% |
| i18n 完整度 (ja) | 98% | ✅ 100% |
| Console 日誌 (生產) | 50+ | ✅ 0 |
| TODO 技術債 | 20+ | 🎯 <15 |
| API 回應時間 | ~500ms | 🎯 <100ms |

---

## 📞 需要協助？

如果遇到問題：

1. 查看完整除錯報告：`reports/frontend-debug-report-20260118.md`
2. 參考 Agent Toolkit 文件：`.agent/README.md`
3. 使用 `/debug` workflow 進行深入分析

---

**開始修復吧！🔧**
