# AI Agent Security Checklist
# AI 代理人安全檢查清單

此清單供 AI 代理人在每次程式碼變更前進行自我檢查。

---

## Pre-Commit Checklist / 提交前檢查

### 1. 機密資訊檢查

- [ ] 程式碼中沒有硬編碼的 API 密鑰
- [ ] 程式碼中沒有硬編碼的密碼或憑證
- [ ] 日誌輸出中沒有敏感資訊
- [ ] 錯誤訊息中沒有暴露內部細節
- [ ] 環境變數名稱正確（使用 `process.env.XXX`）

**快速檢查指令：**
```bash
# 搜尋可能的密鑰洩漏
grep -r "app-" --include="*.ts" --include="*.tsx" src/
grep -r "eyJ" --include="*.ts" --include="*.tsx" src/
grep -r "sk-" --include="*.ts" --include="*.tsx" src/
grep -r "password" --include="*.ts" --include="*.tsx" src/
```

---

### 2. SQL 注入檢查

- [ ] 沒有使用字串拼接 SQL
- [ ] 所有資料庫操作使用 Supabase Client 或 RPC
- [ ] 用戶輸入經過驗證

**危險模式（必須避免）：**
```typescript
// ❌ 危險
const query = `SELECT * FROM nodes WHERE id = '${userInput}'`;

// ❌ 危險
await supabase.rpc('custom_query', { sql: userInput });
```

**安全模式（應該使用）：**
```typescript
// ✅ 安全
const { data } = await supabase.from('nodes').select('*').eq('id', userInput);
```

---

### 3. XSS 檢查

- [ ] 沒有使用 `dangerouslySetInnerHTML`（或已消毒）
- [ ] 用戶輸入不會直接渲染為 HTML
- [ ] URL 參數經過驗證

**危險模式：**
```typescript
// ❌ 危險
<div dangerouslySetInnerHTML={{ __html: userComment }} />

// ❌ 危險
window.location.href = userInput;
```

---

### 4. 認證與授權檢查

- [ ] 敏感 API 端點有認證檢查
- [ ] 管理功能有角色驗證
- [ ] 前端沒有使用 `SUPABASE_SERVICE_KEY`

**必要的檢查：**
```typescript
// API 路由中
import { requireAuth } from '@/lib/security/supabaseAuth';

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ...
}
```

---

### 5. 速率限制檢查

- [ ] 公開 API 端點有速率限制
- [ ] LLM 調用有成本追蹤
- [ ] 外部 API 調用有頻率控制

---

### 6. 輸入驗證檢查

- [ ] 所有 API 參數已驗證型別
- [ ] 數值參數有範圍限制
- [ ] 字串參數有長度限制

**驗證範例：**
```typescript
const lat = parseFloat(searchParams.get('lat') || '');
const lon = parseFloat(searchParams.get('lon') || '');

if (isNaN(lat) || lat < -90 || lat > 90) {
  return NextResponse.json({ error: 'Invalid latitude' }, { status: 400 });
}
if (isNaN(lon) || lon < -180 || lon > 180) {
  return NextResponse.json({ error: 'Invalid longitude' }, { status: 400 });
}
```

---

## Code Review Checklist / 程式碼審查檢查

### 效能檢查

- [ ] 沒有 N+1 查詢問題
- [ ] 適當使用快取
- [ ] 沒有不必要的 `await`
- [ ] 批次處理多個請求

### 品質檢查

- [ ] 沒有使用 `any` 型別
- [ ] 適當的錯誤處理
- [ ] 有意義的變數命名
- [ ] 多語系文字使用 JSONB 結構

### 架構檢查

- [ ] 遵循四層標籤系統
- [ ] L4 建議包含商業替代方案
- [ ] 使用正確的 API 端點命名

---

## Emergency Response / 緊急處理

### 發現密鑰洩漏時

1. **立即作廢舊金鑰** - 登入對應服務後台
2. **生成新金鑰** - 更新 `.env.local`
3. **檢查存取日誌** - 確認是否有未授權存取
4. **通知團隊** - 報告事件

### 發現安全漏洞時

1. **停止相關服務**（如適用）
2. **記錄漏洞細節**
3. **實施臨時修補**
4. **計畫永久修復**

---

## Quick Commands / 快速指令

```bash
# 類型檢查
npm run typecheck

# 程式碼檢查
npm run lint

# 執行測試
npm test

# 密鑰掃描
detect-secrets scan

# 完整品質檢查
npm run qa:upgrade
```

---

*使用此清單確保每次變更都符合安全標準*
