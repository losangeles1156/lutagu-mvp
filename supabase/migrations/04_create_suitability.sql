create table suitability (
  node_id text references nodes(id) on delete cascade,
  tags text[], -- ['accessible', 'family_friendly', 'shopping']
  generated_at timestamptz default now(),
  primary key (node_id)
);
