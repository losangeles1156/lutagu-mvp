-- Create l1_custom_places table for partner-managed L1 attractions
-- This table stores manually added POIs with higher priority than OSM data

create table if not exists l1_custom_places (
    id uuid default gen_random_uuid() primary key,
    station_id text not null,                    -- Associated station ID

    -- Multilingual name and description
    name_i18n jsonb not null default '{}'::jsonb,        -- { ja, en, "zh-TW", "zh-CN", ko }
    description_i18n jsonb default '{}'::jsonb,          -- { ja, en, "zh-TW", "zh-CN", ko }

    -- Category
    category text not null,                     -- shopping, dining, leisure, culture, nature, etc.
    subcategory text,

    -- Location (using PostGIS)
    location geography(Point, 4326),
    address text,

    -- Partner-specific fields
    is_partner boolean default true,            -- Whether this is a partner store
    partner_id uuid,                            -- FK to l1_partners table
    affiliate_url text,                         -- Affiliate/booking link
    discount_info jsonb default '{}'::jsonb,    -- { type: 'percent'|'fixed'|'special', value, description }
    business_hours jsonb default '{}'::jsonb,   -- { monday: {open, close}, tuesday: {...}, ... }

    -- Media
    image_urls text[] default '{}',
    logo_url text,

    -- Status and priority
    is_active boolean default true,
    priority integer default 100,               -- Higher value = higher priority display
    expires_at timestamp with time zone,        -- Promotion expiry date

    -- Review/approval workflow
    status varchar default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected')),
    approved_by uuid,
    approved_at timestamp with time zone,

    -- Timestamps
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table l1_custom_places enable row level security;

-- Allow authenticated users to read approved places
create policy "Allow authenticated read access to approved places"
    on l1_custom_places for select
    using (
        auth.role() = 'authenticated' and status = 'approved'
    );

-- Allow authenticated users to read all places (for admin)
create policy "Allow authenticated read all places"
    on l1_custom_places for select
    using (
        auth.role() = 'authenticated'
    );

-- Allow service_role full access
create policy "Allow service_role full access"
    on l1_custom_places for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

-- Allow authenticated insert/update for draft/pending
create policy "Allow authenticated insert/update"
    on l1_custom_places for insert, update
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

-- Create indexes for common queries
create index if not exists idx_l1_custom_places_station
    on l1_custom_places(station_id);

create index if not exists idx_l1_custom_places_category
    on l1_custom_places(category);

create index if not exists idx_l1_custom_places_status
    on l1_custom_places(status);

create index if not exists idx_l1_custom_places_is_active
    on l1_custom_places(is_active) where is_active = true;

create index if not exists idx_l1_custom_places_partner
    on l1_custom_places(partner_id);

create index if not exists idx_l1_custom_places_priority
    on l1_custom_places(priority DESC);

-- Spatial index for location-based queries
create index if not exists idx_l1_custom_places_location
    on l1_custom_places using gist(location);

-- Foreign key constraint (optional, will be created after l1_partners)
-- alter table l1_custom_places
--     add constraint fk_l1_custom_places_partner
--     foreign key (partner_id) references l1_partners(id)
--     on delete set null;

-- Updated_at trigger for auto-update
create or replace function update_l1_custom_places_timestamp()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger trigger_l1_custom_places_updated_at
    before update on l1_custom_places
    for each row
    execute function update_l1_custom_places_timestamp();
