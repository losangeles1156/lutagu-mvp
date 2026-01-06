# 定期檢查機制 (Periodic Check Mechanism)

為了確保上野站（Ueno Station）等關鍵樞紐站點的坐標與顯示正確性，系統建立了自動化檢查機制。

## 1. 檢查腳本
- **路徑**: `scripts/check_ueno_viewport.ts`
- **功能**: 
  - 自動呼叫 `/api/nodes/viewport` 驗證上野站是否存在於回傳結果中。
  - 驗證上野站的坐標是否在預期範圍內（誤差 < 0.02 度）。
  - 自動同步檢查結果至問題追蹤系統（`incident_tracking` 資料表或 `incidents.local.json`）。

## 2. 執行方式
在專案根目錄執行：
```bash
npx tsx scripts/check_ueno_viewport.ts
```

## 3. 自動化建議 (CI/CD)
建議將此腳本整合至 GitHub Actions 或 Jenkins，設定為每日執行一次：

```yaml
# GitHub Action 範例 (.github/workflows/daily-check.yml)
name: Daily Station Health Check
on:
  schedule:
    - cron: '0 0 * * *' # 每天凌晨執行
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
      - name: Install dependencies
        run: npm install
      - name: Run Check
        run: npx tsx scripts/check_ueno_viewport.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          CHECK_BASE_URL: https://your-app-url.com
```

## 4. 監控與告警
如果腳本執行失敗，會輸出錯誤訊息並回傳 Exit Code 1。建議搭配監控系統（如 Sentry 或 Slack Webhook）在失敗時發送通知。
