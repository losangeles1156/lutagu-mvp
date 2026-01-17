# n8n 環境變數設定指南

## 問題說明

在 n8n v2.0 中，預設會封鎖 Code 節點對環境變數的存取。當你在 n8n workflow 中使用 `{{ $env.VARIABLE_NAME }}` 時，會看到錯誤：

```
[ERROR: access to env vars denied]
```

導致 URL 無法正確組合，出現類似錯誤：
```
Invalid URL: /rest/v1/transit_dynamic_snapshot?on_conflict=station_id
URL must start with "http" or "https".
```

## 解決方案

### 步驟 1: 登入 Zeabur Dashboard 設定環境變數

1. **登入 Zeabur**
   - 前往 https://dash.zeabur.com
   - 使用你的帳號登入

2. **選擇 n8n Service**
   - 在專案列表中找到你的 n8n 服務
   - 點擊進入 n8n service

3. **設定環境變數**
   - 點擊上方的 **Settings** 標籤
   - 找到 **Environment Variables** 區塊
   - 點擊 **+ Add Variable** 按鈕

4. **新增必要的環境變數**

   新增以下兩個環境變數：

   ```env
   # Supabase URL (替換成你的實際 Supabase URL)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

   # 允許 n8n 存取環境變數 (關鍵設定!)
   N8N_BLOCK_ENV_ACCESS_IN_NODE=false
   ```

   **重要說明**：
   - `NEXT_PUBLIC_SUPABASE_URL`: 你的 Supabase 專案 URL
   - `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`: 允許 workflow 存取環境變數

5. **儲存並重啟**
   - 點擊 **Save** 儲存變數
   - 點擊 **Restart** 重啟 n8n service (讓環境變數生效)

### 步驟 2: 取得你的 Supabase URL

如果你不確定 Supabase URL，可以透過以下方式找到：

**選項 A: 從 Supabase Dashboard**
1. 登入 https://supabase.com/dashboard
2. 選擇你的專案
3. 前往 **Settings** → **API**
4. 找到 **Project URL** (格式: `https://xxxxx.supabase.co`)

**選項 B: 從本地開發環境**
```bash
# 如果你的本地有 .env.local 檔案
cat .env.local | grep NEXT_PUBLIC_SUPABASE_URL
```

**選項 C: 從 Zeabur 上的 Next.js 服務**
1. 前往你的 Next.js service 的 Settings
2. 在 Environment Variables 中找到 `NEXT_PUBLIC_SUPABASE_URL`
3. 複製該值

### 步驟 3: 修改 n8n Workflow

在你的 n8n workflow 中，URL 應該如下設定：

**HTTP Request 節點的 URL 欄位**：
```
{{ $env.NEXT_PUBLIC_SUPABASE_URL }}/rest/v1/transit_dynamic_snapshot?on_conflict=station_id
```

**確認檢查清單**：
- [ ] URL 欄位中使用了 `{{ $env.NEXT_PUBLIC_SUPABASE_URL }}`
- [ ] Zeabur 上已設定 `NEXT_PUBLIC_SUPABASE_URL` 環境變數
- [ ] Zeabur 上已設定 `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`
- [ ] n8n service 已重啟
- [ ] 測試 workflow 執行，確認不再出現 "[ERROR: access to env vars denied]"

## 安全性考量

### 為何需要設定 N8N_BLOCK_ENV_ACCESS_IN_NODE=false？

n8n v2.0 預設封鎖環境變數存取是為了安全性。但在以下情況下，你需要啟用存取：

1. **內部服務整合**: 像 LUTAGU 這種內部系統整合，需要讀取 Supabase URL
2. **自託管環境**: 你完全控制 n8n 實例的存取權限
3. **無敏感資料**: 環境變數中沒有包含 API 密鑰等高敏感資料

### 最佳實踐

1. **分離敏感與非敏感變數**
   - 公開 URL (如 `NEXT_PUBLIC_SUPABASE_URL`) → 可以透過環境變數
   - API 密鑰、密碼 → 使用 n8n Credentials 功能

2. **使用 n8n Credentials 管理敏感資料**
   ```
   # 對於 SUPABASE_SERVICE_KEY 等敏感資料
   # 不要放在環境變數，而是使用 n8n 的 Credentials 功能
   ```

3. **定期審查環境變數**
   - 確保只暴露必要的變數
   - 移除不再使用的變數

## 驗證設定

完成設定後，執行以下驗證步驟：

### 1. 測試環境變數存取

在 n8n 中建立一個簡單的測試 workflow：

1. **Code 節點測試**：
   ```javascript
   return {
     supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
     block_setting: process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE
   };
   ```

2. **預期輸出**：
   ```json
   {
     "supabase_url": "https://your-project.supabase.co",
     "block_setting": "false"
   }
   ```

### 2. 測試 HTTP Request

使用你的實際 workflow，確認：
- ✅ URL 正確解析為 `https://...supabase.co/rest/v1/...`
- ✅ 沒有出現 "[ERROR: access to env vars denied]" 錯誤
- ✅ HTTP Request 成功執行並返回資料

## 疑難排解

### 問題 1: 設定後仍然看到 "access denied" 錯誤

**解決方法**：
1. 確認 n8n service 已完全重啟
2. 檢查環境變數名稱是否正確 (注意大小寫)
3. 在 Zeabur Dashboard 確認變數已儲存

### 問題 2: URL 仍然是相對路徑

**解決方法**：
1. 檢查 `NEXT_PUBLIC_SUPABASE_URL` 的值是否包含 `https://`
2. 確認 n8n workflow 中的 URL 格式正確

### 問題 3: Workflow 執行失敗

**解決方法**：
1. 點擊 workflow 中的節點查看詳細錯誤訊息
2. 使用 "Execute Node" 按鈕單獨測試每個節點
3. 檢查 Supabase 的 Authentication 設定是否正確

## 參考資源

### n8n 官方文件
- [Environment Variables Overview](https://docs.n8n.io/hosting/configuration/environment-variables/)
- [n8n v2.0 Breaking Changes](https://docs.n8n.io/2-0-breaking-changes/)
- [Security Environment Variables](https://docs.n8n.io/hosting/configuration/environment-variables/security/)

### Zeabur 文件
- [n8n v2 Migration Guide](https://zeabur.com/blogs/n8n-v2-migration-guide)
- [n8n-v2 Deploy Guide](https://zeabur.com/templates/3H9GKC)
- [Zeabur Environment Variables](https://zeabur.com/docs/environment-variables)

### 相關討論
- [n8n Community: No access to $env](https://community.n8n.io/t/no-access-to-env/20665)
- [n8n Community: Environmental variables access denied](https://community.n8n.io/t/environmental-variables-are-showing-up-as-access-denied-only-in-all-workflows-in-one-project-folder/245726)

## 結論

設定 n8n 環境變數的關鍵步驟：

1. ✅ 在 Zeabur Dashboard 新增 `NEXT_PUBLIC_SUPABASE_URL`
2. ✅ 在 Zeabur Dashboard 新增 `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`
3. ✅ 重啟 n8n service
4. ✅ 驗證 workflow 可以正常存取環境變數

完成這些步驟後，你的 n8n workflow 應該可以順利存取 Supabase API 了！

---

**最後更新**: 2026-01-17
**適用版本**: n8n v2.x, Zeabur
