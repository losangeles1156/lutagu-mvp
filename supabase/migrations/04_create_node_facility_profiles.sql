-- node_facility_profiles table (L1 Tags)
create table node_facility_profiles (
  node_id text primary key references nodes(id) on delete cascade,
  
  -- Calculation Parameters
  radius_meters int not null default 50,
  
  -- MVP: Main Category Counts
  category_counts jsonb not null default '{
    "shopping": 0,
    "dining": 0,
    "medical": 0,
    "education": 0,
    "leisure": 0,
    "finance": 0
  }',
  
  -- Phase 2: Subcategory Counts
  subcategory_counts jsonb default '{}',
  
  -- Derived Tags
  vibe_tags text[] default '{}',
  
  -- Statistics
  total_count int default 0,
  dominant_category text,
  
  -- Metadata
  data_source text default 'osm',
  calculated_at timestamptz,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_facility_profile_node on node_facility_profiles(node_id);
create index idx_facility_profile_dominant on node_facility_profiles(dominant_category);
create index idx_facility_profile_total on node_facility_profiles(total_count desc);
create index idx_facility_profile_vibe on node_facility_profiles using gin(vibe_tags);

-- Trigger to calculate stats
create or replace function calculate_facility_stats()
returns trigger as $$
declare
  max_category text;
  max_count int := 0;
  cat_key text;
  cat_value int;
begin
  new.total_count := 0;
  for cat_key, cat_value in select * from jsonb_each_text(new.category_counts)
  loop
    new.total_count := new.total_count + cat_value::int;
    if cat_value::int > max_count then
      max_count := cat_value::int;
      max_category := cat_key;
    end if;
  end loop;
  new.dominant_category := max_category;
  return new;
end;
$$ language plpgsql;

create trigger tr_calculate_facility_stats
before insert or update of category_counts on node_facility_profiles
for each row execute function calculate_facility_stats();
