# LUTAGU 資料庫結構
# Supabase PostgreSQL Schema

---

## 🎯 本文件的使用方式

```
給 AI 開發代理的指引：

1. 所有顯示文字欄位使用 JSONB 多語系結構
2. L1 標籤預先計算後儲存，不即時計算
3. L2 即時狀態存 Redis，不存 PostgreSQL
4. 使用 parent_hub_id 實現節點繼承
```

---

## 1. 資料庫架構總覽

```
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase PostgreSQL                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   核心表                                                         │
│   ├─ cities          城市設定                                    │
│   ├─ nodes           節點（Hub + Spoke）                         │
│   ├─ facilities      L3 設施                                     │
│   └─ pois            L3 子類別景點                               │
│                                                                 │
│   商業表                                                         │
│   ├─ partners        合作夥伴                                    │
│   └─ nudge_logs      導流記錄                                    │
│                                                                 │
│   用戶表                                                         │
│   ├─ users           用戶（可選登入）                             │
│   └─ trip_guards     行程訂閱                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                           Redis                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   l2:{node_id}       節點即時狀態（TTL 20 分鐘）                  │
│   session:{id}       用戶 Session（TTL 24 小時）                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 核心表定義

### 2.1 cities（城市設定）

```sql
create table cities (
  id text primary key,              -- 'tokyo' / 'kawagoe'
  
  name jsonb not null,              -- {"zh-TW": "東京", "ja": "東京", "en": "Tokyo"}
  timezone text not null,           -- 'Asia/Tokyo'
  
  -- 服務範圍（GeoJSON Polygon）
  core_zone geometry(Polygon, 4326),
  buffer_zone geometry(Polygon, 4326),
  
  -- 數據源設定
  data_sources jsonb,               -- {"transit": "ODPT", "poi": "OSM"}
  
  -- 預設語系
  default_locale text default 'ja',
  supported_locales text[] default array['zh-TW', 'ja', 'en'],
  
  -- 元資料
  is_active boolean default true,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- 範例數據
insert into cities (id, name, timezone, data_sources) values
('tokyo', '{"zh-TW": "東京", "ja": "東京", "en": "Tokyo"}', 'Asia/Tokyo', 
 '{"transit": "ODPT", "poi": "OSM", "weather": "JMA"}');
```

### 2.2 nodes（節點）

```sql
create table nodes (
  -- 識別
  id text primary key,                     -- 'ueno' / 'ueno_exit_north'
  parent_hub_id text references nodes(id), -- null = Hub, 有值 = Spoke
  city_id text references cities(id) not null,
  
  -- 基本資料（每個節點獨立）
  name jsonb not null,                     -- {"zh-TW": "上野站", ...}
  name_short jsonb,                        -- 簡稱 {"zh-TW": "上野", ...}
  coordinates geometry(Point, 4326) not null,
  node_type text not null,                 -- 'station' / 'exit' / 'bus_stop' / 'poi'
  
  -- L1 標籤（Hub 有值，Spoke 繼承）
  facility_profile jsonb,
  /*
  {
    "category_counts": {"shopping": 23, "dining": 18},
    "dominant_categories": ["shopping", "dining"],
    "calculated_at": "2025-10-01T00:00:00Z"
  }
  */
  
  vibe_tags jsonb,
  /*
  {
    "zh-TW": ["購物天堂", "美食激戰區"],
    "ja": ["買い物天国", "グルメ激戦区"],
    "en": ["Shopping Paradise", "Foodie Haven"]
  }
  */
  
  -- AI 人格（Hub 有值，Spoke 繼承）
  persona_prompt text,
  
  -- 商業導流規則（Hub 有值，Spoke 繼承）
  commercial_rules jsonb,
  /*
  [
    {
      "id": "delay_taxi",
      "trigger": {"condition": "delay", "threshold": 15},
      "action": {"provider": "go_taxi", "priority": 1, ...}
    }
  ]
  */
  
  -- 交通資訊（車站類型專用）
  transit_lines jsonb,                     -- 經過的路線 ID 列表
  
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
create index idx_nodes_active on nodes(is_active) where is_active = true;

-- 觸發器：自動更新 updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger nodes_updated_at
before update on nodes
for each row execute function update_updated_at();
```

### 2.3 facilities（L3 設施）

```sql
create table facilities (
  id text primary key,                     -- 'facility:ueno:toilet:01'
  node_id text references nodes(id) not null,
  
  -- 設施類型
  facility_type text not null,             -- 'toilet' / 'locker' / 'atm' / ...
  
  -- 名稱與位置描述
  name jsonb not null,                     -- {"zh-TW": "北口廁所", ...}
  direction jsonb not null,                -- {"zh-TW": "出站左轉 30 公尺", ...}
  floor text,                              -- 'B1' / '2F'
  
  -- 座標（可選，用於精確導航）
  coordinates geometry(Point, 4326),
  
  -- 屬性
  attributes jsonb,
  /*
  {
    "accessible": true,
    "baby_facilities": true,
    "free": true,
    "size": "medium",
    "international_card": true
  }
  */
  
  -- 營業資訊
  opening_hours jsonb,                     -- {"zh-TW": "24 小時", ...}
  
  -- 外部連結
  google_maps_url text,
  
  -- 元資料
  data_source text,                        -- 'osm' / 'manual' / 'partner'
  is_active boolean default true,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- 索引
create index idx_facilities_node on facilities(node_id);
create index idx_facilities_type on facilities(facility_type);
create index idx_facilities_active on facilities(is_active) where is_active = true;
```

### 2.4 pois（L3 子類別景點）

```sql
create table pois (
  id text primary key,                     -- 'poi:ueno:dining:001'
  node_id text references nodes(id) not null,
  
  -- 分類（對應 L1 主類別）
  category text not null,                  -- 'shopping' / 'dining' / ...
  subcategory text,                        -- 'convenience_store' / 'ramen' / ...
  
  -- 名稱
  name jsonb not null,                     -- {"zh-TW": "7-ELEVEN 上野店", ...}
  
  -- 位置
  direction jsonb not null,                -- {"zh-TW": "北口出來右轉 50 公尺", ...}
  coordinates geometry(Point, 4326) not null,
  
  -- 詳細資訊
  info jsonb,
  /*
  {
    "opening_hours": {"zh-TW": "24 小時", ...},
    "phone": "03-1234-5678",
    "website": "https://...",
    "price_range": "budget",
    "rating": 4.2
  }
  */
  
  -- 外部連結
  google_maps_url text not null,
  
  -- 元資料
  data_source text,                        -- 'osm' / 'google_places' / 'manual'
  is_active boolean default true,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- 索引
create index idx_pois_node on pois(node_id);
create index idx_pois_category on pois(category);
create index idx_pois_coordinates on pois using gist(coordinates);
```

---

## 3. 商業表定義

### 3.1 partners（合作夥伴）

```sql
create table partners (
  id text primary key,                     -- 'go_taxi' / 'ecbo_cloak'
  
  name jsonb not null,                     -- {"zh-TW": "GO Taxi", ...}
  category text not null,                  -- 'taxi' / 'bike' / 'luggage'
  
  -- 連結設定
  base_deeplink text not null,             -- 'https://go.mo-t.com/'
  affiliate_code text,
  
  -- 圖示
  icon_url text,
  icon_emoji text,                         -- '🚕'
  
  -- 元資料
  is_active boolean default true,
  created_at timestamp default now()
);

-- 範例數據
insert into partners (id, name, category, base_deeplink, icon_emoji) values
('go_taxi', '{"zh-TW": "GO Taxi", "ja": "GO タクシー", "en": "GO Taxi"}', 
 'taxi', 'https://go.mo-t.com/', '🚕'),
('ecbo_cloak', '{"zh-TW": "ecbo cloak", "ja": "ecbo cloak", "en": "ecbo cloak"}', 
 'luggage', 'https://cloak.ecbo.io/', '🧳'),
('luup', '{"zh-TW": "LUUP", "ja": "LUUP", "en": "LUUP"}', 
 'bike', 'https://luup.sc/', '🛵');
```

### 3.2 nudge_logs（導流記錄）

```sql
create table nudge_logs (
  id uuid primary key default gen_random_uuid(),
  
  -- 發生位置
  city_id text references cities(id),
  node_id text references nodes(id),
  
  -- Session（匿名追蹤）
  session_id text not null,
  
  -- 觸發資訊
  trigger_type text not null,              -- 'delay' / 'rain' / 'luggage'
  trigger_context jsonb,                   -- 觸發時的 L2 狀態
  
  -- 導流內容
  partner_id text references partners(id),
  action_card_content jsonb,               -- 顯示的卡片內容
  
  -- 用戶行為
  displayed_at timestamp not null,
  clicked_at timestamp,                    -- null = 未點擊
  
  -- 元資料
  locale text,
  user_agent text,
  created_at timestamp default now()
);

-- 索引
create index idx_nudge_logs_session on nudge_logs(session_id);
create index idx_nudge_logs_partner on nudge_logs(partner_id);
create index idx_nudge_logs_date on nudge_logs(created_at);
create index idx_nudge_logs_clicked on nudge_logs(clicked_at) where clicked_at is not null;

-- 分析視圖：CTR 統計
create view nudge_stats as
select 
  partner_id,
  trigger_type,
  count(*) as total_displayed,
  count(clicked_at) as total_clicked,
  round(count(clicked_at)::numeric / count(*)::numeric * 100, 2) as ctr_percent,
  date_trunc('day', created_at) as date
from nudge_logs
group by partner_id, trigger_type, date_trunc('day', created_at);
```

---

## 4. 用戶表定義

### 4.1 users（用戶）

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  
  -- 身份（可選登入）
  auth_provider text,                      -- 'line' / 'google' / null
  auth_id text unique,
  
  -- 偏好設定
  preferred_locale text default 'zh-TW',
  accessibility_mode boolean default false,
  
  -- 元資料
  created_at timestamp default now(),
  last_active_at timestamp default now()
);

-- 索引
create index idx_users_auth on users(auth_provider, auth_id);
```

### 4.2 trip_guards（行程訂閱）

```sql
create table trip_guards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  
  -- 訂閱內容
  watched_lines text[] not null,           -- ['TokyoMetro.Ginza', 'JR-East.Yamanote']
  origin_node_id text references nodes(id),
  destination_node_id text references nodes(id),
  
  -- 通知設定
  notify_channel text not null,            -- 'line' / 'push'
  notify_threshold text default 'major',   -- 'all' / 'major' / 'critical'
  
  -- 時間設定
  active_start_time time,                  -- 只在特定時段監控
  active_end_time time,
  active_days integer[],                   -- [1,2,3,4,5] = 週一到週五
  
  -- 狀態
  is_active boolean default true,
  last_notified_at timestamp,
  
  -- 元資料
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- 索引
create index idx_trip_guards_user on trip_guards(user_id);
create index idx_trip_guards_active on trip_guards(is_active) where is_active = true;
```

---

## 5. Redis 結構

### 5.1 L2 即時狀態

```
Key: l2:{node_id}
TTL: 1200 (20 分鐘)
Type: String (JSON)

範例:
l2:ueno = {
  "node_id": "ueno",
  "updated_at": "2025-12-22T10:00:00Z",
  "transit_status": [
    {
      "line_id": "TokyoMetro.Ginza",
      "line_name": {"zh-TW": "銀座線", "ja": "銀座線", "en": "Ginza Line"},
      "status": "minor_delay",
      "delay_minutes": 15
    }
  ],
  "crowding": {
    "level": "moderate",
    "areas": [
      {"area_name": {"zh-TW": "正面口"}, "level": "crowded"},
      {"area_name": {"zh-TW": "公園口"}, "level": "empty"}
    ]
  },
  "weather": {
    "condition": "rain",
    "temperature_celsius": 18
  }
}
```

### 5.2 Session

```
Key: session:{session_id}
TTL: 86400 (24 小時)
Type: String (JSON)

範例:
session:abc123 = {
  "session_id": "abc123",
  "created_at": "2025-12-22T09:00:00Z",
  "locale": "zh-TW",
  "current_node": "ueno",
  "zone": "core",
  "user_id": null,
  "preferences": {
    "accessibility": false
  }
}
```

---

## 6. 資料庫函數

### 6.1 取得解析後的節點

```sql
create or replace function get_resolved_node(p_node_id text)
returns jsonb as $$
declare
  v_node jsonb;
  v_hub jsonb;
begin
  -- 取得節點
  select to_jsonb(n.*) into v_node
  from nodes n where n.id = p_node_id;
  
  if v_node is null then
    return null;
  end if;
  
  -- 如果是 Hub，直接返回
  if v_node->>'parent_hub_id' is null then
    return v_node || '{"_isHub": true}'::jsonb;
  end if;
  
  -- 取得 Hub
  select to_jsonb(h.*) into v_hub
  from nodes h where h.id = (v_node->>'parent_hub_id');
  
  -- 合併（Spoke 優先，沒有則用 Hub 的）
  return v_node || jsonb_build_object(
    'facility_profile', coalesce(v_node->'facility_profile', v_hub->'facility_profile'),
    'vibe_tags', coalesce(v_node->'vibe_tags', v_hub->'vibe_tags'),
    'persona_prompt', coalesce(v_node->>'persona_prompt', v_hub->>'persona_prompt'),
    'commercial_rules', coalesce(v_node->'commercial_rules', v_hub->'commercial_rules'),
    '_isHub', false,
    '_inheritedFrom', v_hub->>'id'
  );
end;
$$ language plpgsql;
```

### 6.2 找最近的節點

```sql
create or replace function find_nearest_node(
  p_lat double precision,
  p_lng double precision,
  p_city_id text default null,
  p_max_distance_meters integer default 500
)
returns table(
  node_id text,
  distance_meters double precision
) as $$
begin
  return query
  select 
    n.id,
    st_distance(
      n.coordinates::geography,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    ) as distance
  from nodes n
  where n.is_active = true
    and (p_city_id is null or n.city_id = p_city_id)
    and st_dwithin(
      n.coordinates::geography,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      p_max_distance_meters
    )
  order by distance
  limit 1;
end;
$$ language plpgsql;
```

---

## 7. Row Level Security (RLS)

```sql
-- 啟用 RLS
alter table nodes enable row level security;
alter table facilities enable row level security;
alter table pois enable row level security;

-- 公開讀取政策（所有人可讀取 active 資料）
create policy "Public read active nodes"
on nodes for select
using (is_active = true);

create policy "Public read active facilities"
on facilities for select
using (is_active = true);

create policy "Public read active pois"
on pois for select
using (is_active = true);

-- 管理員寫入政策（需要 service_role）
create policy "Admin write nodes"
on nodes for all
using (auth.role() = 'service_role');
```

---

## 8. 遷移腳本

```sql
-- Migration: 001_initial_schema.sql

-- 啟用擴充
create extension if not exists postgis;
create extension if not exists pg_trgm;

-- 建立所有表...
-- (如上述定義)

-- 插入初始數據
insert into cities (id, name, timezone) values
('tokyo', '{"zh-TW": "東京", "ja": "東京", "en": "Tokyo"}', 'Asia/Tokyo');

-- 建立索引...
-- (如上述定義)

-- 建立函數...
-- (如上述定義)

-- 啟用 RLS...
-- (如上述定義)
```

---

*版本：v3.0 | 最後更新：2025-12-22*
