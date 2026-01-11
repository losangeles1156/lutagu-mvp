# AI Agent Tools & Services Guide
# AI 代理人工具與服務使用指南

本文件說明專案中各種工具和服務的正確使用方式。

---

## 1. Supabase 資料庫

### 1.1 客戶端選擇

```typescript
// 前端或公開 API - 使用 anon key
import { supabase } from '@/lib/supabase';

// 後端需要完整權限 - 使用 service key
import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

### 1.2 常用查詢模式

```typescript
// 基本查詢
const { data, error } = await supabase
  .from('nodes')
  .select('id, name, location')
  .eq('node_type', 'hub')
  .order('created_at', { ascending: false })
  .limit(10);

// 空間查詢 (使用 RPC)
const { data } = await supabase.rpc('get_nearby_nodes', {
  lat: 35.7,
  lon: 139.77,
  radius_meters: 1000,
});

// 多語系查詢
const { data } = await supabase
  .from('nodes')
  .select(`
    id,
    name->>'zh-TW' as name_zh,
    name->>'ja' as name_ja
  `)
  .eq('id', nodeId);

// 關聯查詢
const { data } = await supabase
  .from('nodes')
  .select(`
    id,
    name,
    facilities (
      id,
      type,
      supply_tags
    )
  `)
  .eq('node_type', 'hub');
```

### 1.3 重要 RPC 函數

| 函數名稱 | 用途 | 參數 |
|---------|------|------|
| `get_nearby_nodes` | 空間查詢附近節點 | lat, lon, radius_meters |
| `get_nearby_accessibility_graph` | 無障礙路徑圖 | lat, lon, radius_meters |
| `search_stations_by_name` | 站名模糊搜尋 | query, limit |

---

## 2. 快取服務

### 2.1 Redis 快取

```typescript
import { redisCacheService } from '@/lib/cache/redisCacheService';

// 設置快取
await redisCacheService.set('key', value, { ttl: 300 });

// 獲取快取
const cached = await redisCacheService.get<MyType>('key');

// 刪除快取
await redisCacheService.delete('key');

// 批次獲取
const results = await redisCacheService.mget(['key1', 'key2']);
```

### 2.2 通用快取服務

```typescript
import { cacheService } from '@/lib/cache/cacheService';

// 智能快取 (自動選擇存儲層)
const data = await cacheService.getOrSet(
  'cache:key',
  async () => await fetchFromDatabase(),
  { ttl: 300 }
);
```

### 2.3 快取鍵命名規範

```
格式: {層級}:{資源類型}:{識別符}

範例:
- l1:node:ueno_station
- l2:status:ginza_line
- l3:facilities:tokyo_station
- user:prefs:visitor_abc123
```

---

## 3. AI/LLM 服務

### 3.1 Mistral 客戶端

```typescript
import { mistralClient } from '@/lib/ai/llmClient';

// 聊天完成
const response = await mistralClient.chat({
  model: process.env.AI_LLM_MODEL || 'mistral-large-latest',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ],
  temperature: 0.7,
  max_tokens: 1000,
});

// 嵌入向量
const embeddings = await mistralClient.embeddings({
  model: 'mistral-embed',
  input: ['text to embed'],
});
```

### 3.2 混合引擎

```typescript
import { HybridEngine } from '@/lib/l4/HybridEngine';

const engine = new HybridEngine();
const result = await engine.process({
  query: userQuery,
  context: {
    location: userLocation,
    time: new Date(),
    preferences: userPrefs,
  },
});

// 結果包含:
// - response: 建議內容
// - confidence: 信心分數
// - source: 'template' | 'algorithm' | 'llm'
```

### 3.3 意圖分類

```typescript
import { PreDecisionEngine } from '@/lib/ai/PreDecisionEngine';

const classifier = new PreDecisionEngine();
const intent = await classifier.classify(userQuery);

// 意圖類型:
// - 'route_query': 路線查詢
// - 'station_info': 車站資訊
// - 'facility_search': 設施搜尋
// - 'general_chat': 一般對話
```

---

## 4. ODPT 交通數據

### 4.1 ODPT 客戶端

```typescript
import { odptService } from '@/lib/odpt/service';

// 獲取列車狀態
const trainStatus = await odptService.getTrainInformation('TokyoMetro');

// 獲取車站資訊
const stationInfo = await odptService.getStationInfo('odpt.Station:TokyoMetro.Ginza.Ueno');

// 獲取時刻表
const timetable = await odptService.getTimetable(stationId, direction);
```

### 4.2 API 端點對應

| 數據類型 | ODPT 端點 | 本地 API |
|---------|----------|---------|
| 列車狀態 | /odpt:TrainInformation | /api/odpt/train-status |
| 車站資訊 | /odpt:Station | /api/station/[id] |
| 路線資訊 | /odpt:Railway | /api/odpt/railways |

---

## 5. 安全模組

### 5.1 速率限制

```typescript
import { checkRateLimit, RateLimitConfig } from '@/lib/security/rateLimit';

const config: RateLimitConfig = {
  capacity: 100,      // 桶容量
  refillRate: 10,     // 每秒補充數
};

const result = await checkRateLimit(visitorId, config);
if (!result.allowed) {
  // 返回 429 錯誤
}
```

### 5.2 審計日誌

```typescript
import { logAuditEvent, AuditAction } from '@/lib/security/audit';

await logAuditEvent({
  actorUserId: userId,
  action: AuditAction.UPDATE,
  resourceType: 'node',
  resourceId: nodeId,
  changes: {
    before: oldData,
    after: newData,
  },
  ipHash: ctx.ipHash,
});
```

### 5.3 請求上下文

```typescript
import { getRequestContext } from '@/lib/security/requestContext';

export async function GET(request: NextRequest) {
  const ctx = getRequestContext(request);

  // ctx 包含:
  // - visitorId: 訪客識別符
  // - ipHash: IP 雜湊
  // - userAgentHash: UA 雜湊
}
```

### 5.4 加密服務

```typescript
import { encrypt, decrypt } from '@/lib/security/crypto';

// 加密 PII
const encrypted = await encrypt(sensitiveData);

// 解密
const decrypted = await decrypt(encrypted);
```

---

## 6. 地圖服務

### 6.1 React Leaflet

```typescript
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

<MapContainer
  center={[35.7, 139.77]}
  zoom={15}
  style={{ height: '100%', width: '100%' }}
>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; OpenStreetMap contributors'
  />
  {nodes.map(node => (
    <Marker
      key={node.id}
      position={[node.location.lat, node.location.lon]}
    />
  ))}
</MapContainer>
```

### 6.2 空間工具函數

```typescript
import { calculateDistance, isWithinBounds } from '@/lib/geo/utils';

// 計算距離 (公尺)
const distance = calculateDistance(
  { lat: 35.7, lon: 139.77 },
  { lat: 35.71, lon: 139.78 }
);

// 檢查是否在範圍內
const inBounds = isWithinBounds(point, boundingBox);
```

---

## 7. 狀態管理 (Zustand)

### 7.1 Store 定義

```typescript
import { create } from 'zustand';

interface WardStore {
  selectedWard: string | null;
  setWard: (ward: string) => void;
  clearWard: () => void;
}

export const useWardStore = create<WardStore>((set) => ({
  selectedWard: null,
  setWard: (ward) => set({ selectedWard: ward }),
  clearWard: () => set({ selectedWard: null }),
}));
```

### 7.2 使用 Store

```typescript
import { useWardStore } from '@/lib/stores/wardStore';

function MyComponent() {
  const { selectedWard, setWard } = useWardStore();

  return (
    <select onChange={(e) => setWard(e.target.value)}>
      {wards.map(ward => (
        <option key={ward.id} value={ward.id}>{ward.name}</option>
      ))}
    </select>
  );
}
```

---

## 8. 測試工具

### 8.1 單元測試

```typescript
import { describe, it, expect } from 'node:test';

describe('TagEngine', () => {
  it('should match similar tags', () => {
    const engine = new TagEngine();
    const score = engine.calculateSimilarity('good_for_waiting', 'waiting_area');
    expect(score).toBeGreaterThan(0.8);
  });
});
```

### 8.2 API 測試

```typescript
describe('GET /api/l1/nodes', () => {
  it('should return nodes list', async () => {
    const response = await fetch('http://localhost:3000/api/l1/nodes');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });
});
```

---

## 9. 環境變數參考

### 必要變數

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# AI
MISTRAL_API_KEY=
AI_LLM_MODEL=mistral-large-latest
AI_SLM_MODEL=mistral-small-latest
```

### 可選變數

```env
# ODPT
ODPT_API_KEY_METRO=
ODPT_API_KEY_JR_EAST=

# 安全
PII_ENCRYPTION_KEY_BASE64=
RATE_LIMIT_ENABLED=true

# LINE
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
```

---

*參考此指南以正確使用專案中的工具和服務*
