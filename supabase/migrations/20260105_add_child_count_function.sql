-- Computed column for nodes to get count of children
-- Usage: select *, child_count(nodes) from nodes;
-- Or in PostgREST: /nodes?select=*,child_count

create or replace function public.child_count(node_row public.nodes)
returns integer as $$
  select count(*)::integer
  from public.nodes
  where parent_hub_id = node_row.id;
$$ language sql stable;

grant execute on function public.child_count(public.nodes) to anon;
grant execute on function public.child_count(public.nodes) to authenticated;
