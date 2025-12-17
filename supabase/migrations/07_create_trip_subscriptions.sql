create table trip_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) not null,
  route_ids text[] not null, -- ['odpt.Railway:TokyoMetro.Ginza']
  origin_node_id text,
  destination_node_id text,
  active_days int[], -- [1, 2, 3, 4, 5] (Mon-Fri)
  active_start_time time,
  active_end_time time,
  notification_method text default 'line',
  is_active boolean default true,
  created_at timestamptz default now()
);

create index idx_subs_user on trip_subscriptions(user_id);
