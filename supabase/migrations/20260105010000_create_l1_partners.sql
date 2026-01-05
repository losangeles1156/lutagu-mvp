-- Create l1_partners table for partner store management
-- This table stores master data for partner stores

create table if not exists l1_partners (
    id uuid default gen_random_uuid() primary key,

    -- Store names (multilingual)
    name text not null,
    name_ja text,
    name_en text,

    -- Contact information
    contact_email text,
    contact_phone text,
    website_url text,

    -- Settlement/affiliate information
    commission_rate decimal(4, 2),             -- e.g., 5.00 for 5%
    affiliate_code text,

    -- Status
    status varchar default 'active' check (status in ('active', 'inactive', 'suspended')),

    -- Timestamps
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table l1_partners enable row level security;

-- Allow authenticated read access
create policy "Allow authenticated read access"
    on l1_partners for select
    using (auth.role() = 'authenticated');

-- Allow service_role full access
create policy "Allow service_role full access"
    on l1_partners for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

-- Allow authenticated insert/update
create policy "Allow authenticated insert/update"
    on l1_partners for insert, update
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

-- Create indexes
create index if not exists idx_l1_partners_status
    on l1_partners(status);

create index if not exists idx_l1_partners_name
    on l1_partners(name);

-- Updated_at trigger for auto-update
create or replace function update_l1_partners_timestamp()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger trigger_l1_partners_updated_at
    before update on l1_partners
    for each row
    execute function update_l1_partners_timestamp();

-- Add foreign key constraint to l1_custom_places (run after l1_custom_places is created)
alter table l1_custom_places
    add constraint fk_l1_custom_places_partner
    foreign key (partner_id) references l1_partners(id)
    on delete set null;
