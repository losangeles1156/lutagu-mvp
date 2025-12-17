-- Spatial Indexes (Ensuring we have them)
create index if not exists idx_nodes_location on nodes using gist(location);
create index if not exists idx_facilities_location on facilities using gist(location);

-- RPC: nearby_facilities
-- Used by the client to find facilities in the 'Buffer Zone' or 'Core Zone'
create or replace function nearby_facilities(
  center_lat float,
  center_lon float,
  radius_meters int,
  filter_types text[] default null
)
returns setof facilities as $$
declare
  center_point geometry;
begin
  center_point := ST_SetSRID(ST_MakePoint(center_lon, center_lat), 4326);
  
  return query
  select f.*
  from facilities f
  where ST_DWithin(f.location::geography, center_point::geography, radius_meters)
  and (filter_types is null or f.type = any(filter_types))
  order by f.location <-> center_point
  limit 50;
end;
$$ language plpgsql;

-- RPC: nearby_nodes
-- Used to determine which node the user is close to (Zone 1 logic)
create or replace function nearby_nodes(
  center_lat float,
  center_lon float,
  radius_meters int
)
returns setof nodes as $$
declare
  center_point geometry;
begin
  center_point := ST_SetSRID(ST_MakePoint(center_lon, center_lat), 4326);
  
  return query
  select n.*
  from nodes n
  where ST_DWithin(n.location::geography, center_point::geography, radius_meters)
  order by n.location <-> center_point
  limit 10;
end;
$$ language plpgsql;
