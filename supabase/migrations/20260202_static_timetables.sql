-- Create a table for storing static timetable data
-- This replaces the file-system based storage with a queryable database table.

CREATE TABLE IF NOT EXISTS public.static_timetables (
    station_id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.static_timetables ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to everyone (public data)
CREATE POLICY "Allow public read access" ON public.static_timetables
    FOR SELECT USING (true);

-- Policy: Allow write access only to service role (admin)
-- Note: This is implicit for service_role, but good to be explicit if using authenticated users later.
-- For now, we rely on service_role key for the migration script.
