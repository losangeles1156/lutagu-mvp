create table if not exists public.favorite_nodes (
  user_id uuid not null references auth.users(id) on delete cascade,
  node_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, node_id)
);

create index if not exists idx_favorite_nodes_user_created_at
  on public.favorite_nodes (user_id, created_at desc);

alter table public.favorite_nodes enable row level security;

drop policy if exists "Users manage own favorite_nodes" on public.favorite_nodes;
create policy "Users manage own favorite_nodes" on public.favorite_nodes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
