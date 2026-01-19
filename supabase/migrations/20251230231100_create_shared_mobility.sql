create table if not exists shared_mobility_stations (
  id text primary key, -- 'docomo:S123'
  city_id text references cities(id),
  node_id text references nodes(id), -- Closest L1 node
  system_id text not null, -- 'docomo-cycle-tokyo'
  name text not null,
  location geometry(Point, 4326) not null,
  capacity int,
  vehicle_types text[], -- ['bike', 'ebike']
  app_deeplink text,

  -- Dynamic Status (updated frequently)
  bikes_available int default 0,
  docks_available int default 0,
  is_renting boolean default true,
  is_returning boolean default true,
  status_updated_at timestamptz,

  created_at timestamptz default now()
);

create index if not exists idx_shared_mobility_location on shared_mobility_stations using gist(location);
