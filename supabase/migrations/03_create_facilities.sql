create table facilities (
  id text primary key,                     -- 'osm:toilet:123'
  node_id text references nodes(id) not null,

  -- Facility Classification
  facility_type text not null,             -- 'toilet' / 'locker' / 'elevator'

  -- Basic Info
  name jsonb,                              -- {"zh-TW": "東口改札內廁所", ...}
  location jsonb,                          -- {"zh-TW": "B1F 改札內", ...} or geometry
  coordinates geometry(Point, 4326),       -- Optional precise location

  -- Attributes & Capabilities
  is_accessible boolean default false,
  attributes jsonb default '{}',           -- {"has_washlet": true, "sizes": ["L", "XL"]}

  -- Metadata
  data_source text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes
create index idx_facilities_node on facilities(node_id);
create index idx_facilities_type on facilities(facility_type);
create index idx_facilities_coords on facilities using gist(coordinates);
