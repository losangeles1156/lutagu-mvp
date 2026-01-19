create table pois (
  id text primary key,                     -- 'poi:ueno:dining:001'
  node_id text references nodes(id) not null,

  -- Classification (Maps to L1 main categories)
  category text not null,                  -- 'shopping' / 'dining' / ...
  subcategory text,                        -- 'convenience_store' / 'ramen' / ...

  -- Name
  name jsonb not null,                     -- {"zh-TW": "7-ELEVEN 上野店", ...}

  -- Location
  direction jsonb not null,                -- {"zh-TW": "北口出來右轉 50 公尺", ...}
  coordinates geometry(Point, 4326) not null,

  -- Detailed Info
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

  -- External Links
  google_maps_url text not null,

  -- Metadata
  data_source text,                        -- 'osm' / 'google_places' / 'manual'
  is_active boolean default true,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Indexes
create index idx_pois_node on pois(node_id);
create index idx_pois_category on pois(category);
create index idx_pois_coordinates on pois using gist(coordinates);
