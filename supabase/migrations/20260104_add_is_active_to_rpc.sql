-- Migration: Add is_active filter to nearby_nodes RPC functions
-- Phase 4: Frontend integration - only return approved data

-- Update nearby_nodes_v2 to include is_active in results and filter by it
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
  zone text,
  is_active boolean
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
    'core'::text as zone,
    coalesce(nh.is_active, true) as is_active
  from public.nodes n
  left join public.node_hierarchy nh on n.id = nh.node_id
  where ST_DWithin(n.coordinates::geography, center_point::geography, radius_meters)
    and not (ST_X(n.coordinates) = 0 and ST_Y(n.coordinates) = 0)
    and coalesce(nh.is_active, true) = true  -- Phase 4: Only return active nodes
  order by n.coordinates <-> center_point
  limit greatest(1, least(max_results, 20000));
end;
$$ language plpgsql;

alter function public.nearby_nodes_v2(float, float, int, int) set search_path = public, extensions, pg_temp;

grant execute on function public.nearby_nodes_v2(float, float, int, int) to anon;
grant execute on function public.nearby_nodes_v2(float, float, int, int) to authenticated;

-- Also update the original nearby_nodes function for compatibility
create or replace function public.nearby_nodes(
  center_lat float,
  center_lon float,
  radius_meters int
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
  zone text,
  is_active boolean
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
    'core'::text as zone,
    coalesce(nh.is_active, true) as is_active
  from public.nodes n
  left join public.node_hierarchy nh on n.id = nh.node_id
  where ST_DWithin(n.coordinates::geography, center_point::geography, radius_meters)
    and not (ST_X(n.coordinates) = 0 and ST_Y(n.coordinates) = 0)
    and coalesce(nh.is_active, true) = true  -- Phase 4: Only return active nodes
  order by n.coordinates <-> center_point
  limit 5000;
end;
$$ language plpgsql;

alter function public.nearby_nodes(float, float, int) set search_path = public, extensions, pg_temp;

grant execute on function public.nearby_nodes(float, float, int) to anon;
grant execute on function public.nearby_nodes(float, float, int) to authenticated;

-- Verify the migration
select 
  'nearby_nodes_v2' as function_name,
  pg_get_functionresult('public.nearby_nodes_v2(float,float,int,int)'::regprocedure) as signature
union all
select 
  'nearby_nodes',
  pg_get_functionresult('public.nearby_nodes(float,float,int)'::regprocedure);
