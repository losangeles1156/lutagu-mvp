create table facilities (
  id text primary key, -- 'osm:123456'
  city_id text references cities(id),
  node_id text references nodes(id), -- Associated L1 node
  type text not null, -- 'toilet', 'locker', 'atm'
  name jsonb,
  location geometry(Point, 4326) not null,
  tags jsonb, -- { "wheelchair": "yes", "fee": "no" }
  has_wheelchair_access boolean default false,
  has_baby_care boolean default false,
  is_free boolean default true,
  is_24h boolean default false,
  source_dataset text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_facilities_location on facilities using gist(location);
create index idx_facilities_node_id on facilities(node_id);
