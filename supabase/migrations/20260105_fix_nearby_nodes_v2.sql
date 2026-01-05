create or replace function public.nearby_nodes_v2(
  center_lat float,
  center_lon float,
  radius_meters int,
  max_results int default 5000
)
returns table (
  id text,
  parent_hub_id text,
  city_id text,
  name jsonb,
  type text,
  location jsonb,
  is_hub boolean,
  geohash text,
  vibe text,
  zone text
) as $$
declare
  center_point geometry;
begin
  center_point := ST_SetSRID(ST_MakePoint(center_lon, center_lat), 4326);

  return query
  select
    n.id,
    n.parent_hub_id,
    n.city_id,
    n.name,
    n.node_type as type,
    jsonb_build_object(
      'type', 'Point',
      'coordinates', jsonb_build_array(ST_X(n.coordinates), ST_Y(n.coordinates))
    ) as location,
    (n.parent_hub_id is null) as is_hub,
    null::text as geohash,
    null::text as vibe,
    'core'::text as zone
  from public.nodes n
  where ST_DWithin(n.coordinates::geography, center_point::geography, radius_meters)
    and not (ST_X(n.coordinates) = 0 and ST_Y(n.coordinates) = 0)
    and n.node_type <> 'bus_stop' -- Filter out bus stops
  order by n.coordinates <-> center_point
  limit greatest(1, least(max_results, 20000));
end;
$$ language plpgsql;

alter function public.nearby_nodes_v2(float, float, int, int) set search_path = public, extensions, pg_temp;

grant execute on function public.nearby_nodes_v2(float, float, int, int) to anon;
grant execute on function public.nearby_nodes_v2(float, float, int, int) to authenticated;
