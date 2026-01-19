create table nodes (
  -- Identification
  id text primary key,                     -- 'odpt:TokyoMetro.Ueno'
  parent_hub_id text references nodes(id), -- null = Hub, has value = Spoke
  city_id text references cities(id) not null,

  -- Basic Info
  name jsonb not null,                     -- {"zh-TW": "上野站", ...}
  name_short jsonb,                        -- Abbreviation {"zh-TW": "上野", ...}
  coordinates geometry(Point, 4326) not null,
  node_type text not null,                 -- 'station' / 'exit' / 'bus_stop' / 'poi'

  -- L1 Tags (Hub has values, Spoke inherits)
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
    "ja": ["買い物天国", "グルメ激戰區"],
    "en": ["Shopping Paradise", "Foodie Haven"]
  }
  */

  -- AI Persona (Hub has values, Spoke inherits)
  persona_prompt text,

  -- Commercial Nudge Rules (Hub has values, Spoke inherits)
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

  -- Transit Info
  transit_lines jsonb,                     -- List of line IDs

  -- Metadata
  is_active boolean default true,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Indexes
create index idx_nodes_parent on nodes(parent_hub_id);
create index idx_nodes_city on nodes(city_id);
create index idx_nodes_type on nodes(node_type);
create index idx_nodes_coordinates on nodes using gist(coordinates);
create index idx_nodes_active on nodes(is_active) where is_active = true;

-- Trigger: auto update updated_at
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
