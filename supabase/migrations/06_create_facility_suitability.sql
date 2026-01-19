-- facility_suitability table (L3 Tags)
create table facility_suitability (
  id uuid primary key default gen_random_uuid(),
  facility_id text references facilities(id) on delete cascade,

  tag text not null,                      -- 'good_for_waiting', 'luggage_friendly'
  confidence float default 1.0,           -- 0-1
  source text default 'manual',           -- 'manual', 'ai_inferred'

  created_at timestamptz default now()
);

-- Indexes
create index idx_suitability_tag on facility_suitability(tag);
create index idx_suitability_facility on facility_suitability(facility_id);
