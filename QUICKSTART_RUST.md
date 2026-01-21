# LUTAGU Rust 優化方案 - 快速啟動指南

## 📦 已建立的檔案清單

### 1. 主要文件
- ✅ `RUST_MIGRATION_PLAN.md` - 完整遷移計畫文件
- ✅ `QUICKSTART_RUST.md` - 本檔案 (快速啟動指南)

### 2. ETL Pipeline Rust 專案
```
services/etl-pipeline-rs/
├── Cargo.toml                      ✅ 專案設定檔
├── Dockerfile                      ✅ Docker 映像檔定義
├── README.md                       ✅ 專案說明文件
├── .gitignore                      ✅ Git 忽略檔案
└── src/
    ├── main.rs                     ✅ CLI 程式入口
    ├── modules/
    │   ├── mod.rs                  ✅ 模組定義
    │   ├── l3_toilets.rs           ✅ 廁所設施 ETL (完整實作)
    │   └── l3_osm.rs               ✅ 通用 OSM ETL (模板)
    ├── db/
    │   ├── mod.rs                  ✅ 資料庫模組
    │   └── supabase.rs             ✅ Supabase 客戶端
    └── utils/
        ├── mod.rs                  ✅ 工具模組
        ├── http.rs                 ✅ HTTP 客戶端
        └── rate_limit.rs           ✅ 速率限制器
```

---

## 🚀 立即開始使用

### Step 1: 安裝 Rust (如果尚未安裝)

```bash
# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 重新載入環境變數
source $HOME/.cargo/env

# 驗證安裝
rustc --version
cargo --version
```

### Step 2: 建置專案

```bash
# 進入專案目錄
cd services/etl-pipeline-rs

# 首次建置 (會下載所有依賴,需要 2-5 分鐘)
cargo build --release

# 驗證建置成功
ls -lh target/release/lutagu-etl
```

**預期輸出**:
```
-rwxr-xr-x  1 user  staff   8.5M Jan 21 15:30 target/release/lutagu-etl
```

### Step 3: 設定環境變數

```bash
# 方式 1: 直接匯出
export DATABASE_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"

# 方式 2: 建立 .env 檔案 (推薦)
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
EOF

# 載入環境變數
source .env
```

### Step 4: 執行首次測試

```bash
# 測試執行 (只處理 1 個 worker,延遲 2 秒,安全測試)
cargo run --release -- fill-toilets --workers 1 --delay 2000

# 預期輸出範例
🚀 Starting L3 Toilets ETL (Rust)
   Radius: 150m, Delay: 2000ms, Workers: 1
📍 Found 127 active stations
  ✅ odpt.Station:TokyoMetro.Ginza.Ueno - Added 3 new toilets
  ✨ odpt.Station:JR-East.Yamanote.Tokyo - All toilets already exist
...
============================================
📊 Toilet Supplement Complete!
   Processed: 127
   Total Toilets Added: 45
```

### Step 5: 全速運行 (生產環境)

```bash
# 使用 20 個併發 worker,延遲 100ms
cargo run --release -- fill-toilets --workers 20 --delay 100

# 預期完成時間: 500 個車站約 2-3 分鐘
```

---

## 📊 效能對比驗證

### 測試案例: 50 個車站

#### TypeScript 版本
```bash
cd /path/to/LUTAGU_MVP
npm run script:l3-toilets

# 預期耗時: ~75 秒 (50 × 1.5s)
```

#### Rust 版本
```bash
cd services/etl-pipeline-rs
time cargo run --release -- fill-toilets --workers 10 --delay 100

# 預期耗時: ~15 秒
# 提升: 75s → 15s = 5倍
```

---

## 🐳 Docker 部署

### 建立映像檔

```bash
cd services/etl-pipeline-rs

# 建立映像檔 (首次需要 5-10 分鐘)
docker build -t lutagu-etl:latest .

# 驗證映像檔大小
docker images lutagu-etl:latest

# 預期: ~200MB (相較於 Node.js 映像檔的 1GB+)
```

### 執行容器

```bash
docker run --rm \
  -e DATABASE_URL="postgresql://..." \
  lutagu-etl:latest \
  fill-toilets --workers 20 --delay 100
```

---

## 🔧 常見使用情境

### 1. 定期更新設施資料 (Cron Job)

```bash
#!/bin/bash
# cron_etl.sh

export DATABASE_URL="postgresql://..."

cd /path/to/LUTAGU_MVP/services/etl-pipeline-rs

# 執行 ETL
./target/release/lutagu-etl fill-toilets --workers 20 --delay 100

# 記錄完成時間
echo "ETL completed at $(date)" >> /var/log/lutagu_etl.log
```

**設定 Cron**:
```bash
# 每天凌晨 2 點執行
0 2 * * * /path/to/cron_etl.sh
```

### 2. 手動補充特定類型設施

```bash
# 咖啡廳
cargo run --release -- fill-osm --amenity cafe --radius 200 --workers 15

# 餐廳
cargo run --release -- fill-osm --amenity restaurant --radius 300 --workers 15

# 置物櫃 (需要先實作 l3_osm.rs 的完整邏輯)
# cargo run --release -- fill-osm --amenity locker --radius 150 --workers 10
```

### 3. GitHub Actions 整合

建立 `.github/workflows/etl-daily.yml`:

```yaml
name: Daily ETL Pipeline

on:
  schedule:
    - cron: '0 2 * * *'  # UTC 2:00 = JST 11:00
  workflow_dispatch:     # 允許手動觸發

jobs:
  run-etl:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          override: true

      - name: Cache cargo dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.cargo/bin/
            ~/.cargo/registry/index/
            ~/.cargo/registry/cache/
            ~/.cargo/git/db/
            services/etl-pipeline-rs/target/
          key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}

      - name: Build ETL binary
        working-directory: services/etl-pipeline-rs
        run: cargo build --release

      - name: Run L3 Toilets ETL
        working-directory: services/etl-pipeline-rs
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          ./target/release/lutagu-etl \
            fill-toilets --workers 20 --delay 100

      - name: Notify completion
        if: success()
        run: echo "ETL completed successfully"
```

---

## 🛠️ 開發指南

### 新增自訂 ETL 模組

**範例: 新增 `l3_cafes.rs`**

1. 建立檔案: `src/modules/l3_cafes.rs`

```rust
use anyhow::Result;
use tracing::info;

pub async fn run(radius: u32, workers: usize) -> Result<()> {
    info!("🚀 Starting L3 Cafes ETL");

    // 複製 l3_toilets.rs 的邏輯
    // 修改 amenity="toilets" → amenity="cafe"
    // 調整 transform 函數以符合咖啡廳屬性

    Ok(())
}
```

2. 註冊模組: `src/modules/mod.rs`

```rust
pub mod l3_toilets;
pub mod l3_osm;
pub mod l3_cafes;  // ← 新增
```

3. 新增 CLI 指令: `src/main.rs`

```rust
#[derive(Subcommand)]
enum Commands {
    FillToilets { ... },
    FillOsm { ... },
    // ← 新增
    FillCafes {
        #[arg(short, long, default_value_t = 150)]
        radius: u32,
        #[arg(short, long, default_value_t = 10)]
        workers: usize,
    },
}

// 在 match 中新增
Commands::FillCafes { radius, workers } => {
    modules::l3_cafes::run(radius, workers).await?;
}
```

4. 編譯並執行

```bash
cargo build --release
./target/release/lutagu-etl fill-cafes --workers 15
```

---

## 🧪 測試與驗證

### 單元測試

```bash
# 執行所有測試
cargo test

# 執行特定模組測試
cargo test l3_toilets

# 顯示詳細輸出
cargo test -- --nocapture
```

### 程式碼品質檢查

```bash
# Clippy (Rust linter)
cargo clippy -- -D warnings

# 格式化
cargo fmt --check

# 自動修正格式
cargo fmt
```

### 效能分析

```bash
# 使用 flamegraph 分析效能瓶頸
cargo install flamegraph

# 產生火焰圖
sudo cargo flamegraph --bin lutagu-etl -- fill-toilets --workers 5

# 開啟 flamegraph.svg 檢視結果
```

---

## 📈 監控與日誌

### 啟用結構化日誌

```bash
# 設定日誌級別
export RUST_LOG=info

# 詳細偵錯
export RUST_LOG=debug

# 執行
cargo run --release -- fill-toilets
```

**輸出範例**:
```
2026-01-21T06:30:15.234Z INFO  lutagu_etl > 🚀 Starting L3 Toilets ETL (Rust)
2026-01-21T06:30:15.235Z INFO  lutagu_etl >    Radius: 150m, Delay: 100ms, Workers: 20
2026-01-21T06:30:15.456Z INFO  lutagu_etl > 📍 Found 500 active stations
2026-01-21T06:30:16.123Z INFO  l3_toilets >   ✅ odpt.Station:TokyoMetro.Ginza.Ueno - Added 3 new toilets
```

### 整合 Prometheus Metrics (進階)

在 `Cargo.toml` 新增:
```toml
[dependencies]
prometheus = "0.13"
```

在程式中新增:
```rust
use prometheus::{Counter, Registry};

lazy_static! {
    static ref REGISTRY: Registry = Registry::new();
    static ref STATIONS_PROCESSED: Counter =
        Counter::new("stations_processed", "Total stations processed").unwrap();
}

// 在處理邏輯中
STATIONS_PROCESSED.inc();
```

---

## 🔍 故障排除

### 問題 1: 編譯錯誤 - 找不到 OpenSSL

**錯誤訊息**:
```
error: failed to run custom build command for `openssl-sys v0.9.x`
```

**解決方案** (macOS):
```bash
brew install openssl@3
export OPENSSL_DIR=/opt/homebrew/opt/openssl@3
cargo build --release
```

**解決方案** (Ubuntu):
```bash
sudo apt-get install pkg-config libssl-dev
cargo build --release
```

### 問題 2: 資料庫連線逾時

**錯誤訊息**:
```
Error: NetworkError("connection timed out")
```

**檢查清單**:
1. 確認 `DATABASE_URL` 使用 **Transaction Pooler** (port 6543)
2. 檢查網路連線: `ping aws-0-ap-northeast-1.pooler.supabase.com`
3. 驗證憑證: 使用 `psql` 測試連線
4. 檢查防火牆/VPN 設定

### 問題 3: Overpass API 429 錯誤

**現象**: 大量 "Too Many Requests" 訊息

**解決方案**:
```bash
# 增加延遲至 500ms
cargo run --release -- fill-toilets --delay 500 --workers 10

# 或減少併發數
cargo run --release -- fill-toilets --delay 100 --workers 5
```

### 問題 4: 記憶體不足

**現象**: 程式被系統 OOM Killer 終止

**解決方案**:
```bash
# 減少 worker 數量
cargo run --release -- fill-toilets --workers 5

# 或分批處理 (需要修改程式碼加入 limit 參數)
```

---

## 📚 延伸閱讀

### Rust 學習資源
- [Rust Book (官方教學)](https://doc.rust-lang.org/book/)
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/)
- [Tokio 非同步教學](https://tokio.rs/tokio/tutorial)

### 專案相關文件
- `RUST_MIGRATION_PLAN.md` - 完整技術方案
- `services/etl-pipeline-rs/README.md` - ETL 專案說明
- `services/l2-status-rs/src/main.rs` - L2 服務參考實作
- `services/l4-routing-rs/src/main.rs` - L4 服務參考實作

---

## ✅ 檢查清單

部署前確認:

- [ ] Rust 1.83+ 已安裝
- [ ] 專案成功編譯 (`cargo build --release`)
- [ ] 環境變數 `DATABASE_URL` 已設定
- [ ] 測試執行成功 (1 worker 小規模測試)
- [ ] 驗證資料庫寫入正確
- [ ] Docker 映像檔建立成功 (如需容器化)
- [ ] 設定 Cron Job 或 GitHub Actions (如需自動化)

---

## 🆘 需要協助?

如遇到問題,請提供以下資訊:

1. **錯誤訊息**: 完整的 error stack trace
2. **執行指令**: 您執行的完整指令
3. **環境資訊**: `rustc --version` 和作業系統版本
4. **日誌輸出**: 設定 `RUST_LOG=debug` 後的輸出

**聯絡方式**: 建立 GitHub Issue 或參考 `CLAUDE.md` 取得支援管道。

---

**最後更新**: 2026-01-21
**版本**: v1.0
