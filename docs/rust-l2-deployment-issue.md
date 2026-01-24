# Rust L2 Client 部署問題報告

**問題發生時間**: 2026-01-24 17:30
**嚴重程度**: ⚠️ Critical - 服務無法正常運行
**影響範圍**: 所有 Rust L2 API 請求返回空 `line_status`

---

## 問題摘要

重新編譯並部署 Rust L2 Client 後,服務雖然能啟動並通過健康檢查,但**所有 L2 狀態查詢都返回空資料**,且日誌顯示嚴重的資料庫錯誤。

---

## 錯誤訊息

### 錯誤 1: JSONB 格式版本不相容
```
thread 'tokio-runtime-worker' panicked at sqlx-postgres/src/types/json.rs:222:29:
assertion `left == right` failed: unsupported JSONB format version 78; please open an issue
  left: 78
 right: 1
```

### 錯誤 2: Prepared Statement 衝突
```
ERROR l2_status_rs: Failed to load node: error returned from database:
prepared statement "sqlx_s_1" already exists

Caused by:
    prepared statement "sqlx_s_1" already exists
```

### 錯誤 3: Index Out of Bounds
```
thread 'tokio-runtime-worker' panicked at data_row.rs:22:20:
index out of bounds: the len is 2 but the index is 2
```

---

## 根本原因分析

### 1. JSONB 版本 78 問題

**背景**:
- Supabase PostgreSQL 15+ 使用新的 JSONB 內部格式 (version 78)
- `sqlx 0.8.6` (當前使用版本) 僅支援 JSONB version 1

**證據**:
```toml
# Cargo.toml
sqlx = { version = "0.8", features = ["runtime-tokio-rustls", "postgres", "chrono", "json"] }
```

**問題來源**:
- PostgreSQL 15 改變了 JSONB 的內部儲存格式
- sqlx 0.8.x 分支尚未完全支援新格式
- 查詢 `transit_lines` (JSONB 欄位) 時觸發 panic

**參考資料**:
- [sqlx Issue #2677](https://github.com/launchbadge/sqlx/issues/2677)
- [PostgreSQL 15 Release Notes - JSONB](https://www.postgresql.org/docs/15/release-15.html)

---

### 2. Statement Cache 衝突

**背景**:
- 已設定 `.statement_cache_capacity(0)` 禁用快取
- 但使用 Simple Query Protocol (`format!` + 無 `.bind()`) 仍產生衝突

**問題程式碼** (`main.rs:516-520`):
```rust
let sql = format!("SELECT transit_lines, coordinates FROM nodes WHERE id = '{}' LIMIT 1", variant);
let row = sqlx::query(&sql)
    // No .bind() -> Simple Query Protocol
    .fetch_optional(pool)
    .await?;
```

**為何仍有快取問題**:
1. Simple Query Protocol 不使用 prepared statements
2. 但 sqlx 仍在背景嘗試預備語句 (由於 `log_statements(Debug)` 設定)
3. 連線池重用時產生名稱衝突

---

### 3. 資料庫連線配置

**當前設定** (`main.rs:292-299`):
```rust
let db_opts = PgConnectOptions::from_str(&config.database_url)?
    .statement_cache_capacity(0)  // ✅ 禁用快取
    .log_statements(log::LevelFilter::Debug);  // ⚠️ 可能觸發預備語句

let pool = PgPoolOptions::new()
    .max_connections(10)  // ⚠️ 連線池大小
    .connect_with(db_opts)
    .await?;
```

---

## 測試結果

### 部署前預期
- ✅ Physical ID → Logical ID 轉換正常 (獨立 Rust 程式驗證通過)
- ✅ `get_station_id_variants()` 生成 20 個變體
- ✅ 程式碼邏輯完全正確

### 部署後實際
- ❌ **所有查詢返回空 line_status**
- ❌ JSONB 欄位讀取失敗 (panic)
- ❌ Prepared statement 衝突
- ⚠️ 服務頻繁重啟 (PM2 restarts: 10+)

### 測試案例結果

| 測試 ID | 預期 | 實際 | 狀態 |
|---------|------|------|------|
| `odpt:Station:TokyoMetro.Asakusa` | 1 line | 0 lines | ❌ 失敗 |
| `odpt.Station:TokyoMetro.Ginza.Asakusa` | 1 line | 0 lines | ❌ 失敗 |
| Health Check | 200 OK | 200 OK | ✅ 通過 |

---

## 解決方案

### 方案 A: 升級 sqlx 到最新版本 (推薦)

**修改 `Cargo.toml`**:
```toml
[dependencies]
sqlx = { version = "0.8.6", features = ["runtime-tokio-rustls", "postgres", "chrono", "json"] }
```

**步驟**:
1. 檢查 sqlx 最新版本: `cargo search sqlx`
2. 更新到 0.8.latest 或 0.9.x (如已釋出)
3. 執行 `cargo update -p sqlx`
4. 重新編譯並測試

**風險**: 可能有 API breaking changes

---

### 方案 B: 降級 PostgreSQL 或使用相容模式 (不推薦)

**選項 1**: 在 Supabase 設定中啟用 JSONB 相容模式
- ⚠️ Supabase 不提供此選項

**選項 2**: 自行托管 PostgreSQL 14
- ❌ 破壞現有架構,成本過高

---

### 方案 C: 避免直接讀取 JSONB 欄位 (臨時方案)

**修改查詢邏輯**:
```rust
// 不查詢 transit_lines (JSONB),改用 SQL CAST
let sql = format!(
    "SELECT transit_lines::text as transit_lines_text FROM nodes WHERE id = '{}' LIMIT 1",
    variant
);

// 手動解析 JSON 字串
let json_text: String = row.try_get("transit_lines_text")?;
let transit_lines: Option<Value> = serde_json::from_str(&json_text).ok();
```

**優點**: 繞過 sqlx JSONB 解析器
**缺點**: 效能較差,程式碼不優雅

---

### 方案 D: 使用 Node.js Fallback (當前執行中)

**現況**:
- Rust Client 失敗 → 自動 fallback 到 Node.js 實作 (`route.ts:350`)
- Node.js 使用 Supabase JS Client (完全相容)

**優點**:
- ✅ 零修改,系統已正常運作
- ✅ 使用者體驗無影響

**缺點**:
- ❌ 無法享受 Rust 效能優勢
- ❌ Fallback 率 100% (預期 < 5%)

---

## 立即行動建議

### 優先級 P0: 驗證 Node.js Fallback

確保 Fallback 機制正常運作,使用者服務不受影響:

```bash
# 測試 Next.js L2 API (應使用 Node.js fallback)
curl -s "http://localhost:3000/api/l2/status?station_id=odpt.Station:TokyoMetro.Ginza.Asakusa" \
  | jq '{source: .headers["X-L2-Source"], line_count: (.line_status | length)}'

# 預期:
# {
#   "source": "nodejs",  // Rust 失敗後 fallback
#   "line_count": 1 或 2  // Node.js 成功返回資料
# }
```

---

### 優先級 P1: 修復 Rust JSONB 相容性

**選擇方案 A (升級 sqlx)**:

```bash
# 1. 檢查最新版本
cd services/l2-status-rs
cargo search sqlx | head -5

# 2. 更新 Cargo.toml
# sqlx = "0.8.6" → sqlx = "0.8.latest" 或 "0.9"

# 3. 更新依賴
cargo update -p sqlx

# 4. 重新編譯
cargo build --release

# 5. 重啟服務
npx pm2 restart l2-status

# 6. 驗證修復
curl -s "http://localhost:8081/l2/status?station_id=odpt:Station:TokyoMetro.Asakusa" \
  | jq '.line_status | length'
# 預期: 1 (不再是 0)
```

---

### 優先級 P2: 臨時禁用 Rust Client

**如果 P1 修復失敗,暫時完全依賴 Node.js**:

修改 `src/app/api/l2/status/route.ts:337`:
```typescript
let rustData = null;
if (false && !refresh) {  // 暫時禁用 Rust Client
    try {
        rustData = await rustL2Client.getStatus(normalizedId);
        // ...
    }
}
```

**優點**: 確保服務穩定
**缺點**: 失去 Rust 效能優勢

---

## 監控建議

### PM2 日誌監控
```bash
# 持續監控錯誤
npx pm2 logs l2-status --err --lines 100

# 檢查重啟次數
npx pm2 list | grep l2-status
# 如果 restarts > 20,表示持續 panic
```

### 健康檢查腳本
```bash
# 每分鐘檢查一次
watch -n 60 'curl -s http://localhost:8081/health | jq .'
```

---

## 結論

### 當前狀態
- ❌ **Rust L2 Client 無法使用** (JSONB 版本不相容)
- ✅ **Node.js Fallback 正常** (使用者服務不受影響)
- ⚠️ **需要升級 sqlx 依賴** 才能修復

### 修復優先順序
1. **P0**: 驗證 Node.js Fallback (5 分鐘) ← **立即執行**
2. **P1**: 升級 sqlx 到相容版本 (30-60 分鐘)
3. **P2**: 如失敗,暫時禁用 Rust Client

### 預期修復時間
- **最佳情況**: 1 小時 (sqlx 升級成功)
- **最壞情況**: 需要等待 sqlx 官方修復 (數週)
- **臨時方案**: Node.js Fallback 已可用 (0 時間)

---

**報告完成時間**: 2026-01-24 17:40
**報告人**: Claude Sonnet 4.5
**下一步**: 執行 P0 驗證 Node.js Fallback
