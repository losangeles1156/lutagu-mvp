-- Create table for storing user crowd reports
create table if not exists transit_crowd_reports (
  id uuid default gen_random_uuid() primary key,
  station_id text not null,
  crowd_level int not null check (crowd_level between 1 and 5),
  user_id uuid, -- Nullable to allow anonymous reports if needed, or link to auth.users if authenticated
  created_at timestamp with time zone default now()
);

-- Index for fast aggregation by station and time
create index if not exists idx_crowd_reports_station_time on transit_crowd_reports(station_id, created_at);

-- Add RLS policies (Open for insert, restricted for select?)
alter table transit_crowd_reports enable row level security;

-- Allow anyone to insert (Anon users)
create policy "Enable insert for all users" on transit_crowd_reports for insert with check (true);

-- Allow everyone to read (for aggregation if done on client, but we do it on server via admin client usually)
-- But for safety, maybe public read is fine for aggregate stats?
-- Let's keep it open for now as it's non-sensitive data.
create policy "Enable select for all users" on transit_crowd_reports for select using (true);
