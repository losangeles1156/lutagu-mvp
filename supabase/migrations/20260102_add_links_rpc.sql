-- Create a function to get pedestrian links with GeoJSON geometry
-- This is required for the frontend to render the navigation graph efficiently
create or replace function get_pedestrian_links_geojson(target_node_ids text[])
returns table (
  id uuid,
  start_node_id text,
  end_node_id text,
  has_elevator_access boolean,
  accessibility_rank text,
  distance_meters float,
  geometry json
) as $$
begin
  return query
  select
    pl.id,
    pl.start_node_id,
    pl.end_node_id,
    pl.has_elevator_access,
    pl.accessibility_rank,
    pl.distance_meters::float,
    st_asgeojson(pl.geometry)::json as geometry
  from pedestrian_links pl
  where pl.start_node_id = any(target_node_ids)
     or pl.end_node_id = any(target_node_ids);
end;
$$ language plpgsql;
