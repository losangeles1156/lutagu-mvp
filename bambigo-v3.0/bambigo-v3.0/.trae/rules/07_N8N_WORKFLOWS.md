# LUTAGU 自動化流程
# n8n Workflows 設計

---

## 🎯 本文件的使用方式

```
給 AI 開發代理的指引：

1. n8n 是用來執行「背景任務」，不是用於即時請求
2. L1 標籤計算是「批次作業」，每季執行一次
3. L2 即時狀態是「定時輪詢」，每 15 分鐘一次
4. 所有 Workflow 都要有錯誤處理和通知機制
```

---

## 1. Workflow 總覽

```
┌─────────────────────────────────────────────────────────────────┐
│                      n8n Workflows 架構                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   批次作業（手動/排程）                                          │
│   ─────────────────────────────────────────────────────────    │
│   • WF-001: L1 標籤計算           每季 / 手動                    │
│   • WF-002: L3 設施同步           每月 / 手動                    │
│   • WF-003: L3 景點同步           每月 / 手動                    │
│   • WF-004: 多語系翻譯            隨 WF-001~003 觸發             │
│                                                                 │
│   定時輪詢（Cron）                                               │
│   ─────────────────────────────────────────────────────────    │
│   • WF-101: L2 交通狀態更新       每 15 分鐘                     │
│   • WF-102: L2 天氣狀態更新       每 30 分鐘                     │
│   • WF-103: Trip Guard 檢查       每 5 分鐘                      │
│                                                                 │
│   事件觸發（Webhook）                                            │
│   ─────────────────────────────────────────────────────────    │
│   • WF-201: 新節點初始化           新增節點時觸發                 │
│   • WF-202: 商業導流記錄           點擊時觸發                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 批次作業 Workflows

### WF-001: L1 標籤計算

```yaml
名稱: L1 Tag Calculation
觸發: 手動 / 排程（每季第一天 02:00）
目的: 計算所有 Hub 節點的 L1 標籤

流程:
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│   │ Trigger │───▶│ Get Hub │───▶│ For Each│───▶│ Overpass│   │
│   │         │    │  Nodes  │    │   Hub   │    │  Query  │   │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│                                                     │          │
│                                                     ▼          │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│   │  Slack  │◀───│ Update  │◀───│Translate│◀───│ Compute │   │
│   │ Notify  │    │   DB    │    │  Tags   │    │ Counts  │   │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**詳細步驟:**

```javascript
// Step 1: 取得所有 Hub 節點
const hubNodes = await supabase
  .from('nodes')
  .select('id, name, coordinates')
  .is('parent_hub_id', null)
  .eq('is_active', true);

// Step 2: 對每個 Hub 執行 Overpass 查詢
for (const hub of hubNodes) {
  const [lng, lat] = hub.coordinates.coordinates;
  
  // Overpass QL 查詢
  const query = `
    [out:json][timeout:30];
    (
      node["shop"](around:200,${lat},${lng});
      node["amenity"~"restaurant|cafe|fast_food"](around:200,${lat},${lng});
      node["amenity"~"hospital|clinic|pharmacy"](around:200,${lat},${lng});
      node["amenity"~"school|university|library"](around:200,${lat},${lng});
      node["tourism"](around:200,${lat},${lng});
      node["amenity"~"bank|atm"](around:200,${lat},${lng});
      node["tourism"~"hotel|hostel"](around:200,${lat},${lng});
      node["leisure"~"park"](around:200,${lat},${lng});
      node["amenity"~"place_of_worship"](around:200,${lat},${lng});
      node["office"](around:200,${lat},${lng});
    );
    out count;
  `;
  
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
  });
  
  // Step 3: 計算類別統計
  const categoryCounts = computeCategoryCounts(response);
  
  // Step 4: 生成 Vibe Tags
  const vibeTags = generateVibeTags(categoryCounts);
  
  // Step 5: 翻譯 Vibe Tags
  const translatedTags = await translateVibeTags(vibeTags);
  
  // Step 6: 更新資料庫
  await supabase
    .from('nodes')
    .update({
      facility_profile: {
        category_counts: categoryCounts,
        dominant_categories: getDominantCategories(categoryCounts),
        calculated_at: new Date().toISOString(),
      },
      vibe_tags: translatedTags,
    })
    .eq('id', hub.id);
}

// Step 7: 發送 Slack 通知
await sendSlackNotification({
  channel: '#lutagu-ops',
  text: `✅ L1 標籤計算完成，共處理 ${hubNodes.length} 個 Hub 節點`,
});
```

**類別對應規則:**

```javascript
const CATEGORY_MAPPING = {
  shopping: {
    osm_tags: ['shop'],
    min_count: 3,  // 最少 3 個才顯示
  },
  dining: {
    osm_tags: ['amenity=restaurant', 'amenity=cafe', 'amenity=fast_food'],
    min_count: 3,
  },
  medical: {
    osm_tags: ['amenity=hospital', 'amenity=clinic', 'amenity=pharmacy'],
    min_count: 1,
  },
  education: {
    osm_tags: ['amenity=school', 'amenity=university', 'amenity=library'],
    min_count: 1,
  },
  leisure: {
    osm_tags: ['tourism', 'leisure=park'],
    min_count: 2,
  },
  finance: {
    osm_tags: ['amenity=bank', 'amenity=atm'],
    min_count: 2,
  },
  accommodation: {
    osm_tags: ['tourism=hotel', 'tourism=hostel', 'tourism=guest_house'],
    min_count: 1,
  },
  nature: {
    osm_tags: ['leisure=park', 'natural'],
    min_count: 1,
  },
  religious: {
    osm_tags: ['amenity=place_of_worship'],
    min_count: 1,
  },
  business: {
    osm_tags: ['office'],
    min_count: 3,
  },
};
```

**Vibe Tags 生成規則:**

```javascript
const VIBE_TAG_RULES = [
  {
    condition: (counts) => counts.shopping >= 15,
    tag: 'shopping_paradise',
    translations: {
      'zh-TW': '購物天堂',
      'ja': '買い物天国',
      'en': 'Shopping Paradise',
    },
  },
  {
    condition: (counts) => counts.dining >= 10,
    tag: 'foodie_haven',
    translations: {
      'zh-TW': '美食激戰區',
      'ja': 'グルメ激戦区',
      'en': 'Foodie Haven',
    },
  },
  {
    condition: (counts) => counts.religious >= 3,
    tag: 'spiritual_sanctuary',
    translations: {
      'zh-TW': '結緣聖地',
      'ja': '縁結びの聖地',
      'en': 'Spiritual Sanctuary',
    },
  },
  {
    condition: (counts) => counts.nature >= 3,
    tag: 'nature_retreat',
    translations: {
      'zh-TW': '自然秘境',
      'ja': '自然の秘境',
      'en': 'Nature Retreat',
    },
  },
  {
    condition: (counts) => counts.leisure >= 5,
    tag: 'cultural_hub',
    translations: {
      'zh-TW': '文化聚落',
      'ja': '文化の街',
      'en': 'Cultural Hub',
    },
  },
  {
    condition: (counts) => counts.business >= 10,
    tag: 'business_district',
    translations: {
      'zh-TW': '商務中心',
      'ja': 'ビジネス街',
      'en': 'Business District',
    },
  },
];

function generateVibeTags(categoryCounts) {
  const tags = [];
  for (const rule of VIBE_TAG_RULES) {
    if (rule.condition(categoryCounts)) {
      tags.push(rule);
    }
    if (tags.length >= 3) break;  // 最多 3 個
  }
  return tags;
}
```

---

### WF-002: L3 設施同步

```yaml
名稱: L3 Facilities Sync
觸發: 手動 / 排程（每月 1 日 03:00）
目的: 同步基本設施（廁所、置物櫃、ATM 等）

流程:
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│   │ Trigger │───▶│Get Nodes│───▶│ For Each│───▶│ Overpass│   │
│   │         │    │         │    │  Node   │    │  Query  │   │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│                                                     │          │
│                                                     ▼          │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│   │  Slack  │◀───│ Upsert  │◀───│Translate│◀───│ Parse   │   │
│   │ Notify  │    │   DB    │    │  Names  │    │ Results │   │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Overpass 查詢（設施）:**

```javascript
const facilityQuery = `
  [out:json][timeout:30];
  (
    node["amenity"="toilets"](around:200,${lat},${lng});
    node["amenity"="locker"](around:200,${lat},${lng});
    node["amenity"="atm"](around:200,${lat},${lng});
    node["amenity"="charging_station"](around:200,${lat},${lng});
    node["internet_access"="wlan"](around:200,${lat},${lng});
    node["highway"="elevator"](around:200,${lat},${lng});
    node["tourism"="information"](around:200,${lat},${lng});
  );
  out body;
`;
```

**設施解析與轉換:**

```javascript
function parseFacility(osmNode, nodeId) {
  const type = detectFacilityType(osmNode.tags);
  
  return {
    id: `facility:${nodeId}:${type}:${osmNode.id}`,
    node_id: nodeId,
    facility_type: type,
    name: {
      'ja': osmNode.tags.name || getDefaultName(type, 'ja'),
      // 翻譯稍後處理
    },
    direction: {
      // 根據座標計算方位
      'ja': computeDirection(nodeId, osmNode, 'ja'),
    },
    coordinates: `POINT(${osmNode.lon} ${osmNode.lat})`,
    attributes: extractAttributes(osmNode.tags, type),
    google_maps_url: `https://www.google.com/maps?q=${osmNode.lat},${osmNode.lon}`,
    data_source: 'osm',
  };
}

function extractAttributes(tags, type) {
  const attrs = {};
  
  if (tags.wheelchair === 'yes') attrs.accessible = true;
  if (tags.changing_table === 'yes') attrs.baby_facilities = true;
  if (tags.fee === 'no') attrs.free = true;
  
  if (type === 'atm') {
    if (tags.international === 'yes') attrs.international_card = true;
  }
  
  if (type === 'locker') {
    attrs.size = tags.size || 'medium';
  }
  
  return attrs;
}
```

---

### WF-003: L3 景點同步

```yaml
名稱: L3 POI Sync
觸發: 手動 / 排程（每月 1 日 04:00）
目的: 同步子類別景點（店家、餐廳等）

流程: 類似 WF-002，但查詢不同的 OSM 標籤
```

---

### WF-004: 多語系翻譯

```yaml
名稱: Translation Workflow
觸發: 被 WF-001~003 呼叫
目的: 將日文原始數據翻譯為中文和英文

流程:
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│   │ Input   │───▶│ Check   │───▶│ DeepL   │───▶│ Return  │   │
│   │ Text    │    │ Cache   │    │   API   │    │ Result  │   │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│                       │                                        │
│                       │ 快取命中                               │
│                       ▼                                        │
│                  ┌─────────┐                                   │
│                  │ Return  │                                   │
│                  │ Cached  │                                   │
│                  └─────────┘                                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**翻譯邏輯:**

```javascript
async function translateText(text, sourceLang, targetLangs) {
  const result = { [sourceLang]: text };
  
  for (const targetLang of targetLangs) {
    if (targetLang === sourceLang) continue;
    
    // 1. 檢查專有名詞對照表
    const cached = await checkProperNounCache(text);
    if (cached && cached[targetLang]) {
      result[targetLang] = cached[targetLang];
      continue;
    }
    
    // 2. 檢查翻譯快取
    const cacheKey = `translate:${sourceLang}:${targetLang}:${text}`;
    const cachedTranslation = await redis.get(cacheKey);
    if (cachedTranslation) {
      result[targetLang] = cachedTranslation;
      continue;
    }
    
    // 3. 呼叫 DeepL API
    const response = await fetch('https://api.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: sourceLang.toUpperCase(),
        target_lang: mapLocaleToDeepL(targetLang),
      }),
    });
    
    const data = await response.json();
    const translated = data.translations[0].text;
    
    // 4. 儲存到快取
    await redis.setex(cacheKey, 30 * 24 * 60 * 60, translated); // 30 天
    
    result[targetLang] = translated;
  }
  
  return result;
}

function mapLocaleToDeepL(locale) {
  const mapping = {
    'zh-TW': 'ZH',
    'ja': 'JA',
    'en': 'EN',
  };
  return mapping[locale] || locale.toUpperCase();
}
```

---

## 3. 定時輪詢 Workflows

### WF-101: L2 交通狀態更新

```yaml
名稱: L2 Transit Status Update
觸發: Cron 每 15 分鐘
目的: 從 ODPT 取得最新交通狀態並更新 Redis

流程:
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│   │  Cron   │───▶│  ODPT   │───▶│ Compare │───▶│ Update  │   │
│   │ Trigger │    │  API    │    │  Diff   │    │  Redis  │   │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│                                                     │          │
│                                                     │ 有變化    │
│                                                     ▼          │
│                                               ┌─────────┐      │
│                                               │ Trigger │      │
│                                               │Trip Guard│     │
│                                               └─────────┘      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**ODPT API 呼叫:**

```javascript
async function fetchODPTTrainInfo() {
  const response = await fetch(
    `https://api.odpt.org/api/v4/odpt:TrainInformation?acl:consumerKey=${ODPT_API_KEY}`
  );
  
  const data = await response.json();
  
  return data.map(info => ({
    line_id: info['odpt:railway'].replace('odpt.Railway:', ''),
    line_name: {
      'ja': info['odpt:railwayTitle']?.ja || '',
      'en': info['odpt:railwayTitle']?.en || '',
    },
    status: mapODPTStatus(info['odpt:trainInformationStatus']),
    delay_minutes: extractDelayMinutes(info['odpt:trainInformationText']),
    reason: {
      'ja': info['odpt:trainInformationText']?.ja || '',
    },
    updated_at: info['odpt:timeOfOrigin'],
  }));
}

function mapODPTStatus(status) {
  if (!status) return 'normal';
  const ja = status.ja || '';
  if (ja.includes('運転見合わせ')) return 'suspended';
  if (ja.includes('遅延')) return 'minor_delay';
  if (ja.includes('大幅な遅れ')) return 'major_delay';
  return 'normal';
}

function extractDelayMinutes(text) {
  if (!text?.ja) return 0;
  const match = text.ja.match(/(\d+)分/);
  return match ? parseInt(match[1]) : 0;
}
```

**Redis 更新邏輯:**

```javascript
async function updateL2Status(nodeId, transitStatus) {
  const key = `l2:${nodeId}`;
  const ttl = 20 * 60; // 20 分鐘
  
  // 取得現有狀態
  const existing = await redis.get(key);
  const existingData = existing ? JSON.parse(existing) : null;
  
  // 建立新狀態
  const newData = {
    node_id: nodeId,
    updated_at: new Date().toISOString(),
    transit_status: transitStatus,
    // 其他欄位保留
    crowding: existingData?.crowding,
    weather: existingData?.weather,
  };
  
  // 比較是否有變化
  const hasChanged = !existingData || 
    JSON.stringify(existingData.transit_status) !== JSON.stringify(transitStatus);
  
  // 寫入 Redis
  await redis.setex(key, ttl, JSON.stringify(newData));
  
  return { hasChanged, newData };
}
```

---

### WF-102: L2 天氣狀態更新

```yaml
名稱: L2 Weather Status Update
觸發: Cron 每 30 分鐘
目的: 從氣象 API 取得天氣並更新 Redis

流程:
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│   │  Cron   │───▶│ Weather │───▶│ Map to  │───▶│ Update  │   │
│   │ Trigger │    │   API   │    │  Nodes  │    │  Redis  │   │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

### WF-103: Trip Guard 檢查

```yaml
名稱: Trip Guard Check
觸發: Cron 每 5 分鐘
目的: 檢查訂閱的路線是否有異常，發送推播

流程:
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│   │  Cron   │───▶│Get Active│───▶│ Check  │───▶│  Send   │   │
│   │ Trigger │    │  Guards │    │  L2    │    │  Push   │   │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Trip Guard 邏輯:**

```javascript
async function checkTripGuards() {
  // 取得目前時間有效的訂閱
  const { data: guards } = await supabase
    .from('trip_guards')
    .select('*, users(*)')
    .eq('is_active', true);
  
  const now = new Date();
  const currentDay = now.getDay(); // 0-6
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM
  
  for (const guard of guards) {
    // 檢查是否在有效時段
    if (guard.active_days && !guard.active_days.includes(currentDay)) continue;
    if (guard.active_start_time && currentTime < guard.active_start_time) continue;
    if (guard.active_end_time && currentTime > guard.active_end_time) continue;
    
    // 檢查監控的路線狀態
    for (const lineId of guard.watched_lines) {
      const l2 = await redis.get(`l2:line:${lineId}`);
      if (!l2) continue;
      
      const status = JSON.parse(l2);
      
      // 判斷是否需要通知
      const shouldNotify = shouldSendNotification(guard.notify_threshold, status);
      
      if (shouldNotify) {
        // 檢查是否最近已通知過（防止重複）
        const lastNotified = guard.last_notified_at;
        if (lastNotified && (now - new Date(lastNotified)) < 30 * 60 * 1000) {
          continue; // 30 分鐘內不重複通知
        }
        
        // 發送推播
        await sendPushNotification(guard.users, {
          title: `⚠️ ${status.line_name.ja} 運行異常`,
          body: status.reason?.ja || '請確認最新狀態',
          data: { lineId, status },
        });
        
        // 更新最後通知時間
        await supabase
          .from('trip_guards')
          .update({ last_notified_at: now.toISOString() })
          .eq('id', guard.id);
      }
    }
  }
}

function shouldSendNotification(threshold, status) {
  switch (threshold) {
    case 'all':
      return status.status !== 'normal';
    case 'major':
      return ['major_delay', 'suspended'].includes(status.status);
    case 'critical':
      return status.status === 'suspended';
    default:
      return false;
  }
}
```

---

## 4. 事件觸發 Workflows

### WF-201: 新節點初始化

```yaml
名稱: New Node Initialization
觸發: Webhook（管理介面新增節點時）
目的: 自動初始化新節點的 L1 標籤

流程:
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│   │ Webhook │───▶│ Is Hub? │───▶│   Call  │───▶│  Slack  │   │
│   │         │    │         │    │ WF-001  │    │ Notify  │   │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│                       │                                        │
│                       │ No (是 Spoke)                          │
│                       ▼                                        │
│                  ┌─────────┐                                   │
│                  │  Skip   │ (Spoke 繼承 Hub，無需計算)        │
│                  │         │                                   │
│                  └─────────┘                                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

### WF-202: 商業導流記錄

```yaml
名稱: Nudge Tracking
觸發: Webhook（用戶點擊導流卡片時）
目的: 記錄導流行為供分析

流程:
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐                   │
│   │ Webhook │───▶│  Insert │───▶│ Return  │                   │
│   │         │    │ nudge_  │    │  OK     │                   │
│   │         │    │  logs   │    │         │                   │
│   └─────────┘    └─────────┘    └─────────┘                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. 錯誤處理

### 5.1 錯誤通知

```javascript
// 所有 Workflow 共用的錯誤處理
async function handleWorkflowError(workflowName, error, context) {
  console.error(`[${workflowName}] Error:`, error);
  
  // 發送 Slack 通知
  await sendSlackNotification({
    channel: '#lutagu-alerts',
    attachments: [{
      color: 'danger',
      title: `❌ Workflow 錯誤: ${workflowName}`,
      fields: [
        { title: 'Error', value: error.message, short: false },
        { title: 'Context', value: JSON.stringify(context), short: false },
        { title: 'Time', value: new Date().toISOString(), short: true },
      ],
    }],
  });
  
  // 記錄到錯誤日誌表
  await supabase
    .from('workflow_errors')
    .insert({
      workflow_name: workflowName,
      error_message: error.message,
      error_stack: error.stack,
      context: context,
    });
}
```

### 5.2 重試策略

```javascript
async function withRetry(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError;
}

// 使用範例
const result = await withRetry(
  () => fetchODPTTrainInfo(),
  3,  // 最多重試 3 次
  2000 // 間隔 2 秒
);
```

---

## 6. 部署與監控

### 6.1 n8n 部署（Zeabur）

```yaml
# zeabur.yaml
services:
  n8n:
    image: n8nio/n8n
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=${DB_HOST}
      - DB_POSTGRESDB_DATABASE=n8n
      - GENERIC_TIMEZONE=Asia/Tokyo
    ports:
      - 5678:5678
```

### 6.2 監控指標

```
┌─────────────────────────────────────────────────────────────────┐
│  監控指標                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   執行成功率                                                     │
│   • WF-001 (L1 計算): 目標 > 99%                                │
│   • WF-101 (L2 更新): 目標 > 99.9%                              │
│   • WF-103 (Trip Guard): 目標 > 99.9%                           │
│                                                                 │
│   執行時間                                                       │
│   • WF-001: < 5 分鐘 / 全部 Hub                                 │
│   • WF-101: < 30 秒 / 每次執行                                  │
│   • WF-103: < 10 秒 / 每次執行                                  │
│                                                                 │
│   API 配額                                                       │
│   • ODPT: 追蹤每日呼叫次數                                       │
│   • DeepL: 追蹤每月字元數                                        │
│   • Overpass: 追蹤每日查詢次數                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

*版本：v3.0 | 最後更新：2025-12-22*
