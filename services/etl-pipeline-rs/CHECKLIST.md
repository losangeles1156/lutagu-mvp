# ETL Pipeline Rust - 部署檢查清單

## ✅ 環境準備

### Rust 工具鏈
- [ ] Rust 1.83+ 已安裝
  ```bash
  rustc --version  # 應顯示 1.83 或更高
  ```
- [ ] Cargo 正常運作
  ```bash
  cargo --version
  ```

### 資料庫連線
- [ ] DATABASE_URL 環境變數已設定
  ```bash
  echo $DATABASE_URL  # 應顯示 Supabase 連線字串
  ```
- [ ] 連線測試成功
  ```bash
  psql $DATABASE_URL -c "SELECT 1"
  ```
- [ ] 確認使用 **Transaction Pooler** (port 6543)
  ```
  正確: postgresql://...pooler.supabase.com:6543/postgres
  錯誤: postgresql://...supabase.co:5432/postgres  ← 直連模式
  ```

---

## 🏗️ 編譯階段

### 首次建置
- [ ] 下載依賴成功
  ```bash
  cd services/etl-pipeline-rs
  cargo fetch
  ```
- [ ] 編譯無錯誤
  ```bash
  cargo build --release
  ```
  **預期時間**: 首次 2-5 分鐘
- [ ] 執行檔存在
  ```bash
  ls -lh target/release/lutagu-etl
  # 應顯示: ~8-10 MB 執行檔
  ```

### 程式碼品質檢查
- [ ] Clippy 檢查通過
  ```bash
  cargo clippy -- -D warnings
  ```
- [ ] 格式化正確
  ```bash
  cargo fmt --check
  ```

---

## 🧪 測試階段

### 單元測試
- [ ] 所有測試通過
  ```bash
  cargo test
  ```

### 小規模整合測試
- [ ] 測試 1 個車站 (安全測試)
  ```bash
  cargo run --release -- fill-toilets --workers 1 --delay 3000
  ```
  **預期結果**:
  - ✅ 無錯誤訊息
  - ✅ 至少處理 1 個車站
  - ✅ 資料庫有新資料寫入

### 中規模測試
- [ ] 測試 10 個車站
  ```bash
  # 限制處理數量 (需修改程式碼加入 --limit 參數,或暫時手動限制)
  cargo run --release -- fill-toilets --workers 5 --delay 1000
  ```

---

## 🚀 生產環境驗證

### 完整執行測試
- [ ] 全量資料處理成功
  ```bash
  time cargo run --release -- fill-toilets --workers 20 --delay 100
  ```
  **驗證項目**:
  - [ ] 執行時間 < 5 分鐘 (500 車站)
  - [ ] 無 panic 或 crash
  - [ ] 記憶體使用 < 100 MB
  - [ ] 資料庫寫入正確

### 資料驗證
- [ ] 檢查資料庫記錄數
  ```sql
  SELECT COUNT(*) FROM l3_facilities WHERE type = 'toilet';
  ```
- [ ] 驗證資料完整性
  ```sql
  SELECT
    station_id,
    COUNT(*) as toilet_count
  FROM l3_facilities
  WHERE type = 'toilet'
  GROUP BY station_id
  ORDER BY toilet_count DESC
  LIMIT 10;
  ```
- [ ] 檢查 OSM ID 無重複
  ```sql
  SELECT
    attributes->>'osm_id' as osm_id,
    COUNT(*)
  FROM l3_facilities
  WHERE type = 'toilet'
  GROUP BY osm_id
  HAVING COUNT(*) > 1;
  -- 應該返回 0 筆
  ```

---

## 🐳 Docker 部署

### 映像檔建立
- [ ] Dockerfile 建置成功
  ```bash
  docker build -t lutagu-etl:latest .
  ```
  **預期時間**: 首次 5-10 分鐘

- [ ] 映像檔大小合理
  ```bash
  docker images lutagu-etl:latest
  # 應顯示: ~200-250 MB
  ```

### 容器測試
- [ ] 容器執行成功
  ```bash
  docker run --rm \
    -e DATABASE_URL="$DATABASE_URL" \
    lutagu-etl:latest \
    fill-toilets --workers 5 --delay 500
  ```

### Cloud Run 部署 (選用)
- [ ] 推送至 Google Container Registry
  ```bash
  docker tag lutagu-etl:latest gcr.io/PROJECT_ID/lutagu-etl:latest
  docker push gcr.io/PROJECT_ID/lutagu-etl:latest
  ```
- [ ] Cloud Run 服務建立
  ```bash
  gcloud run jobs create lutagu-etl \
    --image gcr.io/PROJECT_ID/lutagu-etl:latest \
    --region asia-northeast1 \
    --memory 512Mi \
    --cpu 2 \
    --set-env-vars DATABASE_URL="$DATABASE_URL"
  ```

---

## ⏰ 自動化排程

### Cron Job 設定
- [ ] 建立執行腳本
  ```bash
  cat > /usr/local/bin/lutagu-etl-cron.sh << 'EOF'
  #!/bin/bash
  export DATABASE_URL="postgresql://..."
  cd /path/to/LUTAGU_MVP/services/etl-pipeline-rs
  ./target/release/lutagu-etl fill-toilets --workers 20 --delay 100 >> /var/log/lutagu_etl.log 2>&1
  EOF

  chmod +x /usr/local/bin/lutagu-etl-cron.sh
  ```

- [ ] 測試腳本執行
  ```bash
  /usr/local/bin/lutagu-etl-cron.sh
  tail -f /var/log/lutagu_etl.log
  ```

- [ ] 加入 crontab
  ```bash
  crontab -e
  # 新增: 每天凌晨 2 點執行
  0 2 * * * /usr/local/bin/lutagu-etl-cron.sh
  ```

### GitHub Actions (選用)
- [ ] 建立 workflow 檔案
  ```bash
  mkdir -p .github/workflows
  vim .github/workflows/etl-daily.yml
  ```

- [ ] 設定 Secrets
  - [ ] GitHub Repo → Settings → Secrets → New secret
  - [ ] 名稱: `DATABASE_URL`
  - [ ] 值: Supabase 連線字串

- [ ] 測試手動觸發
  - [ ] GitHub Actions → etl-daily → Run workflow

---

## 📊 監控與維護

### 日誌檢查
- [ ] 啟用結構化日誌
  ```bash
  export RUST_LOG=info
  cargo run --release -- fill-toilets
  ```

- [ ] 日誌輪替設定 (Linux)
  ```bash
  cat > /etc/logrotate.d/lutagu-etl << 'EOF'
  /var/log/lutagu_etl.log {
      daily
      rotate 7
      compress
      missingok
      notifempty
  }
  EOF
  ```

### 效能監控
- [ ] 記錄基準效能指標
  ```bash
  time cargo run --release -- fill-toilets --workers 20 > /tmp/etl_benchmark.txt
  ```

- [ ] 設定告警閾值
  - 執行時間 > 10 分鐘 → 需要調查
  - 記憶體使用 > 200 MB → 需要優化
  - 錯誤率 > 5% → 需要檢查

---

## 🔒 安全檢查

### 環境變數保護
- [ ] DATABASE_URL 不包含在程式碼中
  ```bash
  grep -r "postgresql://" src/
  # 應該返回 0 筆結果
  ```

- [ ] .env 檔案已加入 .gitignore
  ```bash
  cat .gitignore | grep ".env"
  ```

### 資料庫權限
- [ ] 執行帳號僅有必要權限
  ```sql
  -- 檢查權限
  SELECT
    table_name,
    privilege_type
  FROM information_schema.table_privileges
  WHERE grantee = 'your_user';
  ```

---

## 📝 文件完整性

### README 檢查
- [ ] 安裝步驟完整
- [ ] 使用範例清晰
- [ ] 故障排除指南完整

### 程式碼註解
- [ ] 關鍵函數有說明
- [ ] 複雜邏輯有註解
- [ ] 公開 API 有文件

---

## ✨ 上線前最終檢查

### 功能驗證
- [ ] ETL 處理正確
- [ ] 去重邏輯正常
- [ ] 錯誤處理妥當
- [ ] 日誌輸出清晰

### 效能驗證
- [ ] 執行時間符合預期 (< 5 分鐘)
- [ ] 記憶體使用合理 (< 100 MB)
- [ ] CPU 利用率高 (> 60%)

### 可靠性驗證
- [ ] 網路中斷可恢復
- [ ] API rate limit 正確處理
- [ ] 資料庫連線失敗有重試

---

## 🎯 回滾計畫

### TypeScript 版本保留
- [ ] 原始 `scripts/l3_fill_toilets.ts` 未刪除
- [ ] 可隨時切換回 TypeScript 版本
  ```bash
  npm run script:l3-toilets
  ```

### 資料庫備份
- [ ] 執行前建立快照
  ```sql
  -- Supabase Dashboard → Database → Backups → Create backup
  ```

---

## 📈 成功指標

### 短期目標 (1 週內)
- [ ] 執行時間穩定在 3 分鐘以內
- [ ] 零 crash 記錄
- [ ] 資料品質 100% 正確

### 中期目標 (1 個月內)
- [ ] 擴展至其他 OSM 設施類型
- [ ] 建立 ODPT Client 共用函式庫
- [ ] 整合至 CI/CD Pipeline

### 長期目標 (3 個月內)
- [ ] 完整取代 TypeScript ETL
- [ ] 效能優化至 < 2 分鐘
- [ ] 向量搜尋 Rust 化

---

## ⚠️ 已知問題與限制

### 目前限制
- [ ] ✅ 已知: Overpass API 有 rate limit (建議 workers ≤ 20)
- [ ] ✅ 已知: 資料庫連線池限制 (建議 max_connections = 20)
- [ ] ⚠️ 待實作: l3_osm.rs 通用邏輯尚未完成

### 未來改進
- [ ] 加入 --limit 參數 (限制處理數量)
- [ ] 加入進度條顯示
- [ ] 加入 Prometheus metrics 匯出
- [ ] 實作斷點續傳機制

---

## ✅ 最終確認

**部署前,請確認以下所有項目已勾選:**

- [ ] 所有測試通過
- [ ] Docker 映像檔建立成功
- [ ] 資料庫驗證正確
- [ ] 文件完整更新
- [ ] 監控機制就緒
- [ ] 回滾計畫準備完成

**簽核:**
- 日期: ___________
- 執行者: ___________
- 審核者: ___________

---

**版本**: v1.0
**最後更新**: 2026-01-21
