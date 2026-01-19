# LUTAGU 生產環境配置建議
**日期**: 2026-01-19  
**版本**: v1.0  
**適用對象**: DevOps / 系統管理員

---

## 📋 執行摘要

經過部署驗證和品質測試，LUTAGU 的 Cloud Run 部署已基本完成，但仍有以下配置需要優化才能安全上線生產環境。

### 當前狀態
- ✅ Cloud Run 服務運作正常
- ✅ 基礎 AI 對話功能可用
- ⚠️ CORS 使用預設值
- ⚠️ Cloudflare 尚未啟用
- ⚠️ 複雜 AI 查詢偶爾失敗

---

## 🔧 必要配置 (P0 - 上線前完成)

### 1. CORS 白名單設定

**問題**: Cloud Run 服務當前接受所有來源請求  
**風險**: 可能被第三方網站濫用，消耗 API 配額

**解決方案**:
```bash
# 設定 ALLOWED_ORIGINS 環境變數
gcloud run services update chat-api \
  --region asia-northeast1 \
  --set-env-vars "ALLOWED_ORIGINS=https://lutagu.app,https://www.lutagu.app"
```

**本地開發環境**:
```bash
# services/chat-api/.env
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

---

### 2. Cloudflare Gateway 設定

**目標**: 啟用 WAF 防護與全球CDN加速

#### 步驟 A: DNS 託管
1. 登入 Cloudflare Dashboard
2. 新增網站 `lutagu.app`
3. 將 Name Servers 指向 Cloudflare (在網域註冊商處更改)

#### 步驟 B: DNS 記錄設定
```
類型: CNAME
名稱: api (or chat-api)
目標: chat-api-y6r3wpax5q-an.a.run.app
Proxy: 開啟 (Orange Cloud)
```

```
類型: A / CNAME  
名稱: @ (root domain)
目標: cname.vercel-dns.com (Vercel IP)
Proxy: 開啟
```

#### 步驟 C: WAF 規則 (建議)
1. **Bot Fight Mode**: 開啟 (阻擋惡意爬蟲)
2. **Rate Limiting**:
   - `/api/chat`: 每分鐘 60 requests per IP
   - `/health`: 不限制
3. **Security Level**: Medium

#### 步驟 D: 更新 ALLOWED_ORIGINS
```bash
# 加入 Cloudflare 代理後的網域
ALLOWED_ORIGINS=https://lutagu.app,https://api.lutagu.app
```

---

### 3. AI API 配額監控

**問題**: 複雜查詢偶爾回傳「系統忙碌」錯誤

**診斷步驟**:
```bash
# 1. 查看 Cloud Run 日誌
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=chat-api AND severity>=ERROR" \
  --limit=50 \
  --format=json

# 2. 檢查 Zeabur API 用量
# 前往 Zeabur Dashboard 查看 AI Hub 使用統計

# 3. 檢查 Gemini API 配額
# 前往 Google AI Studio 查看 API Keys 配額
```

**臨時解決方案**:
- 增加 Cloud Run Memory: 1Gi → 2Gi
- 調整 Timeout: 60s → 120s
- 啟用 Graceful Degradation (程式碼修改)

**長期解決方案**:
- 實作 Request Queue (避免並發過載)
- 加入 Redis Cache (常見查詢)
- 升級 AI API 方案

---

## 🚀 建議配置 (P1 - 上線後一週內)

### 4. Cloud Run 擴展策略

**當前配置**:
- Min Instances: 0 (省成本，但冷啟動慢)
- Max Instances: 10
- Concurrency: 80

**建議調整**:
```bash
gcloud run services update chat-api \
  --region asia-northeast1 \
  --min-instances 1 \  # 保持一個實例暖機
  --max-instances 20 \  # 允許更多並發
  --cpu-throttling \     # 閒置時節省 CPU
  --concurrency 50       # 降低單實例負載
```

**成本影響**: 約 $6-10 USD/月 (保持1個實例)

---

### 5. 監控與告警

**Cloud Run 監控指標**:
- Request Count
- Request Latency (p95, p99)
- Error Rate
- Instance Count
- CPU / Memory Usage

**建議設定告警**:
```bash
# 錯誤率超過 5%
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="Chat API Error Rate" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s
```

**整合建議**:
- Google Cloud Monitoring (內建)
- Sentry (錯誤追蹤)
- Uptime Robot (健康檢查)

---

### 6. 資料庫連線優化

**問題**: Supabase 連線可能成為瓶頸

**建議**:
```bash
# 使用 Transaction Pooler (Port 6543)
DATABASE_URL=postgresql://postgres:[password]@db.xxx.supabase.co:6543/postgres?pgbouncer=true

# 設定連線池大小
MAX_DB_CONNECTIONS=20  # Cloud Run 實例 * Concurrency / 10
```

---

## 📊 效能優化 (P2 - 後續迭代)

### 7. CDN Cache 策略

**可快取資源**:
- `/health` endpoint: Cache 30s
- 靜態 Knowledge Base 查詢結果: Cache 5min
- 車站基本資訊: Cache 1hr

**Cloudflare Cache Rules**:
```
URL 包含 /health
→ Cache Everything, TTL: 30s

URL 包含 /api/stations/*
→ Cache Everything, TTL: 1h
```

---

### 8. Redis 快取層

**適合快取的查詢**:
- 熱門路線 ("上野到淺草")
- 車站設施狀態
- ODPT 即時資料 (TTL 60s)

**實作建議**:
```typescript
// 偽代碼
async function getChatResponse(query: string) {
  const cacheKey = `chat:${hash(query)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const response = await hybridEngine.process(query);
  await redis.setex(cacheKey, 300, JSON.stringify(response));
  return response;
}
```

---

## 🔒 安全檢查清單

- [ ] CORS 白名單已設定
- [ ] Cloudflare WAF 已啟用
- [ ] API Keys 儲存在 Secret Manager (非環境變數)
- [ ] Rate Limiting 已啟用 (Cloudflare + Middleware)
- [ ] 錯誤訊息不洩漏敏感資訊
- [ ] HTTPS Strict Transport Security (HSTS) 已啟用
- [ ] Database credentials 使用 IAM 認證

---

## 📝 部署檢查清單

### 上線前
- [ ] 更新 `CHAT_API_URL` 為正式網域
- [ ] 設定 `ALLOWED_ORIGINS` 環境變數
- [ ] 配置 Cloudflare DNS
- [ ] 測試生產環境 API 連線
- [ ] 驗證 AI 查詢功能
- [ ] 設定監控告警

### 上線後
- [ ] 監控錯誤率 (前24小時)
- [ ] 檢查 API 配額使用情況
- [ ] 驗證 Cloudflare Analytics
- [ ] 收集用戶反饋
- [ ] 評估效能瓶頸

---

## 💰 成本預估

### 當前配置 (Min Instances = 0)
- Cloud Run: $0-5 USD/月
- Cloudflare: $0 (Free Tier)
- Supabase: $0-25 USD/月
- **總計**: $0-30 USD/月

### 建議配置 (Min Instances = 1)
- Cloud Run: $6-15 USD/月
- Cloudflare: $0 (Free Tier)
- Supabase: $25 USD/月 (Pro Tier 建議)
- **總計**: $31-40 USD/月

### 預期流量 (1000 DAU)
- Cloud Run: $15-30 USD/月
- Cloudflare: $0 (Free Tier 足夠)
- Supabase: $25 USD/月
- AI API (Zeabur): $10-20 USD/月
- **總計**: $50-75 USD/月

---

## 🔗 相關文件

- [部署驗證報告](./deployment_validation_20260119.md)
- [AI 品質測試報告](./ai_quality_test_20260119.md)
- [GCP 部署指南](../plans/gcp_deployment_guide.md)
- [架構遷移計畫](../plans/architecture_migration_20260119.md)

---

**編寫者**: Claude Code  
**最後更新**: 2026-01-19  
**下次檢視**: 2026-01-26
