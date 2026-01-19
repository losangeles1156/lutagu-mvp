# LUTAGU L2 列車異常監控 Workflow 設定指南

## 📋 概覽

此 Workflow 每 3 分鐘自動獲取並解碼 ODPT GTFS-RT 數據，產生供 L4 AI Agent 決策使用的結構化異常資訊。

## 🔧 匯入前準備

### 1. 建立 Credentials

在 n8n 中建立以下 Credentials：

#### ODPT API Credential
- **Name**: `odptApi`
- **Type**: Header Auth 或 Query Auth
- **設定**:
  ```
  Name: apiKey
  Value: <ODPT_API_KEY>
  ```

#### ODPT Challenge API Credential
- **Name**: `odptChallengeApi`
- **Type**: Header Auth 或 Query Auth
- **設定**:
  ```
  Name: apiKey
  Value: <ODPT_CHALLENGE_API_KEY>
  ```

#### Redis Credential
- **Name**: `redis`
- **Type**: Redis
- **設定**: 根據你的 Redis 服務設定

#### Supabase Credential（可選）
- **Name**: `supabase`
- **Type**: Supabase
- **設定**: 根據你的 Supabase 設定

### 2. Supabase 資料表（可選）

如果要使用歷史記錄功能，在 Supabase 建立：

```sql
CREATE TABLE l2_disruption_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  affected_lines TEXT[],
  disruption_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_disruption_node_time
ON l2_disruption_history(node_id, created_at DESC);

-- 自動清理 7 天前數據
CREATE OR REPLACE FUNCTION cleanup_old_disruptions()
RETURNS void AS $$
BEGIN
  DELETE FROM l2_disruption_history
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
```

## 📥 匯入 Workflow

1. 在 n8n 中點擊 **Import from File**
2. 選擇 `lutagu-l2-train-disruption-workflow.json`
3. 匯入後，更新各節點的 Credentials 設定

## 🔗 節點說明

### HTTP Request 節點

| 節點名稱 | API | 說明 |
|---------|-----|------|
| Toei Alert | 都營地下鐵 Alert | 運行異常通報 |
| Metro Alert | 東京Metro Alert | 運行異常通報 |
| JR East TripUpdate | JR東日本 TripUpdate | 延誤資訊 |

**重要設定**：
- Response Format: **File** (Binary)
- 這樣才能正確處理 Protocol Buffers 二進位數據

### Code Node: Decode Protobuf

這是核心解碼邏輯，已內嵌完整的 GTFS-RT Protobuf 解碼器：

- 解碼 Alert（都營、Metro）
- 解碼 TripUpdate delay（JR東日本）
- 輸出統一的 JSON 結構

### Code Node: Transform to L4 Structure

轉換為 L4 AI Agent 可用的結構，包含：

- 路線名稱多語系對照
- Effect/Cause 語意化
- 節點分配
- L4 決策提示（`l4_hint`）

### Redis Cache

- Key 格式: `lutagu:l2:disruption:{node_id}`
- TTL: 300 秒（5 分鐘）
- 有異常和正常狀態都會快取

## 📊 輸出結構

每個節點的輸出格式：

```json
{
  "node_id": "ueno",
  "updated_at": "2025-12-26T10:30:00.000Z",
  "has_issues": true,
  "overall_severity": "major",
  "affected_lines": ["山手線", "銀座線"],
  "disruptions": [
    {
      "line_id": "JR-East.Yamanote",
      "line_name": {
        "ja": "山手線",
        "zh-TW": "山手線",
        "en": "Yamanote Line"
      },
      "line_color": "#9ACD32",
      "severity": "major",
      "status_label": {
        "ja": "大幅な遅延",
        "zh-TW": "嚴重延誤",
        "en": "Major Delays"
      },
      "cause": {
        "ja": "車両点検",
        "zh-TW": "車輛檢查",
        "en": "Technical Problem"
      },
      "delay_minutes": 15,
      "message": {
        "ja": "車両点検の影響で、約15分の遅れが発生しています"
      }
    }
  ],
  "l4_hint": {
    "action": "consider_alternatives",
    "severity": "major",
    "message": {
      "ja": "山手線で約15分の遅れが発生しています。お急ぎの場合は代替ルートをご検討ください。",
      "zh-TW": "山手線目前延誤約15分鐘。若趕時間建議考慮其他路線。",
      "en": "Yamanote Line delayed approximately 15 minutes. Consider alternatives if in a hurry."
    },
    "estimated_delay": 15,
    "affected_lines": ["JR-East.Yamanote"],
    "alternatives_needed": true
  }
}
```

## 🎯 L4 AI Agent 使用方式

### 從 Redis 獲取

```javascript
// API 端點範例
app.get('/api/l2/disruption/:nodeId', async (req, res) => {
  const { nodeId } = req.params;
  const data = await redis.get(`lutagu:l2:disruption:${nodeId}`);

  if (!data) {
    return res.json({
      node_id: nodeId,
      has_issues: false,
      overall_severity: 'none',
      l4_hint: {
        action: 'proceed',
        message: { 'zh-TW': '目前運行正常' }
      }
    });
  }

  return res.json(JSON.parse(data));
});
```

### L4 決策邏輯

```javascript
async function getRouteAdvice(from, to, userContext) {
  const status = await getDisruptionStatus(from);

  // 使用 l4_hint 直接決策
  switch (status.l4_hint.action) {
    case 'avoid':
      // 停駛 → 必須給替代方案
      return {
        type: 'critical',
        message: status.l4_hint.message,
        alternatives: await findAlternatives(from, to, status.l4_hint.affected_lines)
      };

    case 'consider_alternatives':
      // 嚴重延誤 → 看用戶是否趕時間
      if (userContext.isRushing) {
        return {
          type: 'suggestion',
          message: status.l4_hint.message,
          alternatives: await findAlternatives(from, to, status.l4_hint.affected_lines)
        };
      }
      return {
        type: 'info',
        message: status.l4_hint.message,
        delay: status.l4_hint.estimated_delay
      };

    case 'minor_delay':
      // 輕微延誤 → 安撫即可
      return {
        type: 'reassurance',
        message: status.l4_hint.message
      };

    default:
      return { type: 'normal', message: '運行正常' };
  }
}
```

## ⚠️ 注意事項

1. **API Key 安全**：正式環境請使用環境變數，不要硬編碼
2. **錯誤處理**：Workflow 包含基本錯誤處理，但建議設定 Error Workflow
3. **頻率限制**：ODPT API 有請求限制，3 分鐘間隔是安全的
4. **Webhook 通知**：預設停用，需要時啟用並設定 URL

## 🔄 更新日誌

- **v1.0.0** (2025-12-26): 初始版本
  - 支援都營地下鐵 Alert
  - 支援東京Metro Alert
  - 支援 JR東日本 TripUpdate delay
  - L4 決策結構輸出
