# LUTAGU 母子節點繼承機制
# Hub/Spoke 設計模式

---

## 🎯 本文件的使用方式

```
給 AI 開發代理的指引：

核心問題：
無法為數百個站牌逐一撰寫 AI Prompt 和計算 L1 標籤。

解法：
定義少量「母節點 (Hub)」，其餘「子節點 (Spoke)」繼承母節點的資料。

關鍵數字：
- Hub 節點：10-15 個（MVP）
- Spoke 節點：每個 Hub 下 5-20 個
- 總節點數：50-300 個
```

---

## 1. Hub/Spoke 架構概念

### 1.1 架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│                      Hub/Spoke 節點架構                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   上野站 (Hub)                                                   │
│   ├─ L1 標籤：🛒23 🍜18 🎭8 #購物天堂                            │
│   ├─ AI 人格：「上野是東京的北玄關...」                          │
│   ├─ 商業規則：延誤→GO Taxi, 行李→ecbo cloak                     │
│   │                                                             │
│   ├─ 上野站正面口 (Spoke) ──────────────────────────────────    │
│   │   ├─ 繼承：L1 標籤、AI 人格、商業規則                        │
│   │   └─ 獨立：座標、L2 人潮狀態、L3 設施                        │
│   │                                                             │
│   ├─ 上野站公園口 (Spoke) ──────────────────────────────────    │
│   │   ├─ 繼承：L1 標籤、AI 人格、商業規則                        │
│   │   └─ 獨立：座標、L2 人潮狀態、L3 設施                        │
│   │                                                             │
│   ├─ 上野站不忍口 (Spoke) ──────────────────────────────────    │
│   │   ├─ 繼承：L1 標籤、AI 人格、商業規則                        │
│   │   └─ 獨立：座標、L2 人潮狀態、L3 設施                        │
│   │                                                             │
│   └─ 上野站巴士站 (Spoke) ──────────────────────────────────    │
│       ├─ 繼承：L1 標籤、AI 人格、商業規則                        │
│       └─ 獨立：座標、L2 公車時刻、L3 站牌設施                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 設計理由

```
為什麼需要 Hub/Spoke？

工作量問題：
- 如果有 200 個節點
- 每個都要寫 AI Prompt → 200 份文案
- 每個都要計算 L1 標籤 → 200 次 API 呼叫
- 不現實！

Hub/Spoke 解法：
- 只為 15 個 Hub 寫 Prompt
- 只為 15 個 Hub 計算 L1
- Spoke 自動繼承
- 工作量減少 90%

語意合理性：
- 上野站正面口 ≈ 上野站公園口
- 它們共享同一個「上野站生活圈」的特性
- 繼承是語意上合理的
```

### 1.3 繼承規則

| 欄位 | Hub | Spoke | 說明 |
|------|-----|-------|------|
| id | ✅ 自己的 | ✅ 自己的 | 每個節點都有唯一 ID |
| parent_hub_id | null | Hub 的 ID | Spoke 指向 Hub |
| coordinates | ✅ 自己的 | ✅ 自己的 | 每個節點有獨立座標 |
| name | ✅ 自己的 | ✅ 自己的 | 每個節點有獨立名稱 |
| facility_profile | ✅ 自己的 | 繼承 Hub | L1 標籤 |
| vibe_tags | ✅ 自己的 | 繼承 Hub | L1 氛圍標籤 |
| persona_prompt | ✅ 自己的 | 繼承 Hub | AI 人格 |
| commercial_rules | ✅ 自己的 | 繼承 Hub | 商業導流規則 |
| l2_status | ✅ 自己的 | ✅ 自己的 | 即時狀態獨立 |
| l3_facilities | ✅ 自己的 | ✅ 自己的 | 設施獨立 |

---

## 2. 資料庫設計

### 2.1 節點表結構

```sql
-- nodes 表
create table nodes (
  -- 基本識別
  id text primary key,                    -- 'ueno_station' / 'ueno_station_north'
  parent_hub_id text references nodes(id), -- null = Hub, 有值 = Spoke
  city_id text references cities(id),
  
  -- 基本資料（每個節點獨立）
  name jsonb not null,                    -- {"zh-TW": "上野站", "ja": "上野駅", ...}
  coordinates point not null,
  node_type text not null,                -- 'station' / 'exit' / 'bus_stop' / 'poi'
  
  -- L1 標籤（Hub 有值，Spoke 繼承）
  facility_profile jsonb,                 -- 類別統計
  vibe_tags jsonb,                        -- 氛圍標籤
  l1_calculated_at timestamp,
  
  -- AI 人格（Hub 有值，Spoke 繼承）
  persona_prompt text,
  
  -- 商業導流規則（Hub 有值，Spoke 繼承）
  commercial_rules jsonb,
  
  -- L3 設施（每個節點獨立）
  -- 另外的 facilities 表，用 node_id 關聯
  
  -- 元資料
  is_active boolean default true,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- 索引
create index idx_nodes_parent on nodes(parent_hub_id);
create index idx_nodes_city on nodes(city_id);
create index idx_nodes_type on nodes(node_type);
create index idx_nodes_coordinates on nodes using gist(coordinates);

-- Hub 節點視圖
create view hub_nodes as
select * from nodes where parent_hub_id is null;

-- Spoke 節點視圖
create view spoke_nodes as
select * from nodes where parent_hub_id is not null;
```

### 2.2 繼承查詢函數

```sql
-- 取得節點完整資料（含繼承）
create or replace function get_resolved_node(node_id text)
returns jsonb as $$
declare
  node_data jsonb;
  hub_data jsonb;
begin
  -- 取得節點本身
  select to_jsonb(n) into node_data
  from nodes n
  where n.id = node_id;
  
  -- 如果是 Hub，直接返回
  if node_data->>'parent_hub_id' is null then
    return node_data;
  end if;
  
  -- 如果是 Spoke，合併 Hub 資料
  select to_jsonb(h) into hub_data
  from nodes h
  where h.id = (node_data->>'parent_hub_id');
  
  -- 繼承 Hub 的欄位
  return node_data || jsonb_build_object(
    'facility_profile', coalesce(node_data->'facility_profile', hub_data->'facility_profile'),
    'vibe_tags', coalesce(node_data->'vibe_tags', hub_data->'vibe_tags'),
    'persona_prompt', coalesce(node_data->>'persona_prompt', hub_data->>'persona_prompt'),
    'commercial_rules', coalesce(node_data->'commercial_rules', hub_data->'commercial_rules'),
    '_inherited_from', hub_data->>'id'
  );
end;
$$ language plpgsql;
```

---

## 3. 程式碼實作

### 3.1 節點解析器

```typescript
// lib/nodes/resolver.ts

interface Node {
  id: string;
  parent_hub_id: string | null;
  name: LocalizedText;
  coordinates: { lat: number; lng: number };
  node_type: 'station' | 'exit' | 'bus_stop' | 'poi';
  facility_profile?: FacilityProfile;
  vibe_tags?: LocalizedText[];
  persona_prompt?: string;
  commercial_rules?: CommercialRule[];
}

interface ResolvedNode extends Node {
  _isHub: boolean;
  _inheritedFrom?: string;
}

export async function resolveNode(nodeId: string): Promise<ResolvedNode> {
  // 查詢節點
  const { data: node } = await supabase
    .from('nodes')
    .select('*')
    .eq('id', nodeId)
    .single();
  
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  // 如果是 Hub，直接返回
  if (!node.parent_hub_id) {
    return {
      ...node,
      _isHub: true,
    };
  }
  
  // 如果是 Spoke，查詢 Hub 並繼承
  const { data: hub } = await supabase
    .from('nodes')
    .select('*')
    .eq('id', node.parent_hub_id)
    .single();
  
  if (!hub) {
    throw new Error(`Hub not found: ${node.parent_hub_id}`);
  }
  
  return {
    ...node,
    // 繼承 Hub 的欄位（Spoke 自己沒有的話）
    facility_profile: node.facility_profile || hub.facility_profile,
    vibe_tags: node.vibe_tags || hub.vibe_tags,
    persona_prompt: node.persona_prompt || hub.persona_prompt,
    commercial_rules: node.commercial_rules || hub.commercial_rules,
    _isHub: false,
    _inheritedFrom: hub.id,
  };
}
```

### 3.2 批次解析（效能優化）

```typescript
// lib/nodes/batchResolver.ts

export async function resolveNodes(nodeIds: string[]): Promise<ResolvedNode[]> {
  // 一次查詢所有節點
  const { data: nodes } = await supabase
    .from('nodes')
    .select('*')
    .in('id', nodeIds);
  
  // 收集需要查詢的 Hub IDs
  const hubIds = new Set<string>();
  for (const node of nodes || []) {
    if (node.parent_hub_id) {
      hubIds.add(node.parent_hub_id);
    }
  }
  
  // 批次查詢 Hubs
  const { data: hubs } = await supabase
    .from('nodes')
    .select('*')
    .in('id', Array.from(hubIds));
  
  // 建立 Hub 查找表
  const hubMap = new Map<string, Node>();
  for (const hub of hubs || []) {
    hubMap.set(hub.id, hub);
  }
  
  // 解析所有節點
  return (nodes || []).map(node => {
    if (!node.parent_hub_id) {
      return { ...node, _isHub: true };
    }
    
    const hub = hubMap.get(node.parent_hub_id);
    return {
      ...node,
      facility_profile: node.facility_profile || hub?.facility_profile,
      vibe_tags: node.vibe_tags || hub?.vibe_tags,
      persona_prompt: node.persona_prompt || hub?.persona_prompt,
      commercial_rules: node.commercial_rules || hub?.commercial_rules,
      _isHub: false,
      _inheritedFrom: hub?.id,
    };
  });
}
```

---

## 4. Hub 節點設計指南

### 4.1 Hub 節點選擇標準

```
選擇 Hub 節點的考量：

1. 地理覆蓋
   - 核心圈內均勻分布
   - 每個 Hub 覆蓋 500m-1km 範圍

2. 流量重要性
   - 主要車站、轉運站
   - 熱門觀光景點入口
   - 商圈核心

3. 語意獨立性
   - 該區域有獨特的「氛圍」
   - 可以寫出有特色的 AI Prompt

4. 數據完整度
   - ODPT 有該站的數據
   - OSM 周邊資料豐富
```

### 4.2 MVP Hub 節點清單（東京）

| ID | 名稱 | 類型 | 覆蓋範圍 | Spoke 數量 |
|----|------|------|----------|------------|
| ueno | 上野站 | 交通樞紐 | 上野公園、阿美橫町 | 8 |
| asakusa | 淺草站 | 觀光核心 | 淺草寺、雷門 | 6 |
| akihabara | 秋葉原站 | 商圈 | 電器街、動漫街 | 5 |
| tokyo | 東京站 | 交通樞紐 | 丸之內、八重洲 | 10 |
| nihombashi | 日本橋站 | 商業區 | 日本橋商圈 | 4 |
| ginza | 銀座站 | 高級商圈 | 銀座街區 | 6 |
| yurakucho | 有樂町站 | 商業區 | 有樂町商圈 | 4 |
| shimbashi | 新橋站 | 商業區 | 新橋商圈 | 5 |
| kanda | 神田站 | 商業區 | 神田書店街 | 4 |
| ochanomizu | 御茶之水站 | 文教區 | 大學區 | 4 |

### 4.3 AI Prompt 撰寫指南

```markdown
# Hub 節點 AI Prompt 範本

## 結構

1. 開場（節點的身份定位）
2. 歷史/特色（讓 AI 有「記憶」）
3. 當地氛圍（讓 AI 有「感覺」）
4. 服務特色（這個節點特別能幫什麼忙）
5. 禁忌事項（不要說什麼）

## 範例：上野站

```
你是上野站的在地嚮導。

上野是東京的北玄關，從江戶時代就是人們南來北往的起點。
這裡有博物館、動物園、還有充滿昭和風情的阿美橫町。
你熟悉這一帶的大小事，從哪裡有便宜的海鮮，到哪個出口離熊貓最近。

你的個性是親切的大叔/大嬸，會用「來來來」「跟你說喔」這樣的口吻。
你特別喜歡推薦隱藏版的小店，但也會誠實說「那家排隊要排很久」。

當遊客問路時，你會先確認他們的需求（趕時間？帶小孩？），
再給出最適合的建議，而不是列出一堆選項讓他們自己選。

你不會說：
- 「我只是 AI，無法確定...」
- 「建議您自行查詢...」
- 任何打破角色的話
```
```

### 4.4 商業導流規則設計

```typescript
// 上野站的商業導流規則範例
const uenoCommercialRules: CommercialRule[] = [
  {
    id: 'ueno_delay_taxi',
    trigger: { condition: 'delay', threshold: 15 },
    action: {
      provider: 'go_taxi',
      priority: 1,
      message_template: {
        'zh-TW': '電車延誤了，搭計程車去{destination}更快',
        'ja': '電車が遅延中です。{destination}へはタクシーの方が早いですよ',
        'en': 'Train delayed. Taxi to {destination} would be faster',
      },
      deeplink: 'https://go.mo-t.com/',
    },
  },
  {
    id: 'ueno_luggage_ecbo',
    trigger: { condition: 'luggage' },
    action: {
      provider: 'ecbo_cloak',
      priority: 1,
      message_template: {
        'zh-TW': '阿美橫町附近有行李寄放點，空手逛街更輕鬆',
        'ja': 'アメ横近くに荷物預かりがありますよ。手ぶらで買い物どうぞ',
        'en': 'Luggage storage near Ameyoko. Shop hands-free!',
      },
      deeplink: 'https://cloak.ecbo.io/shop/ueno',
    },
  },
  {
    id: 'ueno_rain_cafe',
    trigger: { condition: 'rain' },
    action: {
      provider: 'internal',
      priority: 2,
      message_template: {
        'zh-TW': '下雨了，要不要先去附近的咖啡廳躲雨？',
        'ja': '雨ですね。近くのカフェで一休みしませんか？',
        'en': "It's raining. Want to wait it out at a nearby cafe?",
      },
      deeplink: null,
    },
  },
];
```

---

## 5. Spoke 節點設計指南

### 5.1 Spoke 節點類型

| 類型 | ID 格式 | 範例 | 獨立資料 |
|------|---------|------|----------|
| 車站出口 | {hub}_exit_{name} | ueno_exit_north | 座標、擁擠度 |
| 巴士站 | {hub}_bus_{number} | ueno_bus_01 | 座標、公車時刻 |
| 子景點 | {hub}_poi_{name} | asakusa_poi_kaminarimon | 座標、營業時間 |

### 5.2 Spoke 獨立資料範例

```typescript
// 上野站正面口（Spoke）
const uenoNorthExit: Partial<Node> = {
  id: 'ueno_exit_north',
  parent_hub_id: 'ueno',  // 指向 Hub
  name: {
    'zh-TW': '上野站正面口',
    'ja': '上野駅正面口',
    'en': 'Ueno Station Main Exit',
  },
  coordinates: { lat: 35.7141, lng: 139.7774 },
  node_type: 'exit',
  
  // L1, AI Prompt, 商業規則 → 繼承自 ueno
  facility_profile: null,
  vibe_tags: null,
  persona_prompt: null,
  commercial_rules: null,
};

// 這個出口的 L3 設施（獨立）
const uenoNorthFacilities: Facility[] = [
  {
    id: 'facility:ueno_north:toilet:01',
    node_id: 'ueno_exit_north',
    type: 'toilet',
    name: { 'zh-TW': '正面口廁所', 'ja': '正面口トイレ', 'en': 'Main Exit Toilet' },
    direction: { 'zh-TW': '出站左轉', 'ja': '改札を出て左', 'en': 'Exit, turn left' },
    attributes: { accessible: true },
  },
  {
    id: 'facility:ueno_north:locker:01',
    node_id: 'ueno_exit_north',
    type: 'locker',
    name: { 'zh-TW': '正面口置物櫃', 'ja': '正面口コインロッカー', 'en': 'Main Exit Lockers' },
    direction: { 'zh-TW': '出站右轉', 'ja': '改札を出て右', 'en': 'Exit, turn right' },
    attributes: { size: 'medium' },
  },
];
```

---

## 6. 運作流程

### 6.1 用戶查詢流程

```
用戶在「上野站正面口」附近

Step 1: 取得用戶位置
        coordinates: (35.7141, 139.7774)

Step 2: 找到最近的節點
        nearestNode: 'ueno_exit_north'

Step 3: 解析節點（含繼承）
        resolvedNode = {
          id: 'ueno_exit_north',
          name: '上野站正面口',
          
          // 繼承自 Hub 'ueno'
          facility_profile: { shopping: 23, dining: 18, ... },
          vibe_tags: ['購物天堂', '美食激戰區'],
          persona_prompt: '你是上野站的在地嚮導...',
          commercial_rules: [...],
          
          // 自己的資料
          coordinates: (35.7141, 139.7774),
          l2_status: { crowding: 'moderate' },
          
          _inheritedFrom: 'ueno'
        }

Step 4: 取得 L3 設施（獨立查詢）
        facilities = getFacilities('ueno_exit_north')

Step 5: 生成 L4 建議
        使用 persona_prompt（來自 Hub）
        使用 commercial_rules（來自 Hub）
        使用 l2_status（自己的）
        使用 facilities（自己的）
```

### 6.2 資料更新流程

```
更新 Hub 的 L1 標籤時：

Step 1: n8n 計算上野站的 L1
        facility_profile = { shopping: 23, ... }

Step 2: 更新 Hub 節點
        UPDATE nodes SET facility_profile = {...}
        WHERE id = 'ueno'

Step 3: Spoke 自動繼承
        所有 parent_hub_id = 'ueno' 的節點
        在查詢時會自動取得新的 L1

        無需逐一更新！
```

---

## 7. 效能考量

### 7.1 快取策略

```typescript
// 快取解析後的節點（含繼承）
const nodeCache = new Map<string, ResolvedNode>();
const CACHE_TTL = 5 * 60 * 1000; // 5 分鐘

export async function getResolvedNode(nodeId: string): Promise<ResolvedNode> {
  const cached = nodeCache.get(nodeId);
  if (cached && !isExpired(cached)) {
    return cached;
  }
  
  const resolved = await resolveNode(nodeId);
  nodeCache.set(nodeId, { ...resolved, _cachedAt: Date.now() });
  return resolved;
}
```

### 7.2 預載入策略

```typescript
// 啟動時預載入所有 Hub 節點
export async function preloadHubs(): Promise<void> {
  const { data: hubs } = await supabase
    .from('nodes')
    .select('*')
    .is('parent_hub_id', null);
  
  for (const hub of hubs || []) {
    nodeCache.set(hub.id, { ...hub, _isHub: true, _cachedAt: Date.now() });
  }
  
  console.log(`Preloaded ${hubs?.length} hub nodes`);
}
```

---

*版本：v3.0 | 最後更新：2025-12-22*
