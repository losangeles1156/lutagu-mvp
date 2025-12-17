create table l2_cache (
  key text primary key, -- 'train:TokyoMetro.Ginza' or 'weather:tokyo'
  value jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index idx_l2_cache_expires on l2_cache(expires_at);

-- Function to clean expired cache
create or replace function cleanup_expired_cache()
returns void as $$
begin
  delete from l2_cache where expires_at < now();
end;
$$ language plpgsql;
