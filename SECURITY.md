# Security Guidelines / 安全準則

## API Key 處理規範

### ✅ 正確做法

1. **所有 API Key 僅存放於 `.env.local`**
   ```bash
   # .env.local (此檔案已在 .gitignore 中)
   DIFY_API_KEY=app-xxxxxx
   SUPABASE_SERVICE_KEY=eyJxxxx
   ```

2. **文件中使用佔位符**
   ```markdown
   | 項目 | 值 |
   |------|-----|
   | API Key | `<YOUR_API_KEY>` 請至 .env.local 設定 |
   ```

3. **程式碼中透過環境變數讀取**
   ```typescript
   const apiKey = process.env.DIFY_API_KEY;
   ```

### ❌ 禁止做法

- 將真實 API Key 寫入任何 `.md`、`.json`、`.yaml` 文件
- 在程式碼中硬編碼 API Key
- 透過 Slack/Discord/Email 傳送明文 API Key

---

## 發現洩漏時的處理流程

1. **立即作廢舊金鑰**
   - 登入對應服務後台 (Dify/Supabase/etc.)
   - Rotate/Regenerate API Key

2. **更新 `.env.local`**
   - 替換為新金鑰
   - 重啟開發伺服器

3. **檢查 Git 歷史**
   - 若金鑰已 push 至 remote，需考慮 rewrite history
   - 或接受 GitHub Secret Scanning 的警告

4. **監控異常活動**
   - 檢查 API 使用日誌是否有未授權存取

---

## Pre-commit Secret 偵測

本專案使用 [detect-secrets](https://github.com/Yelp/detect-secrets) 進行 commit 前檢查。

### 安裝

```bash
pip install pre-commit detect-secrets
pre-commit install
```

### 初始化 baseline

```bash
detect-secrets scan > .secrets.baseline
```

### 測試

嘗試 commit 包含 `app-xxxxxx` 格式的字串，應會被攔截。

---

## 聯絡方式

發現安全問題請立即通知專案負責人。
