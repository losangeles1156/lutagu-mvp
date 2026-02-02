-- Migration: Add static_stations table for Routing Engine Metadata
-- Needed for Lat/Lon (A* Heuristic) and Name Translation.

BEGIN;
    -- Create Table
    CREATE TABLE public.static_stations (
        id TEXT PRIMARY KEY,
        title_en TEXT,
        title_ja TEXT,
        lat DOUBLE PRECISION,
        long DOUBLE PRECISION,
        operator TEXT,
        railway  TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- Indexes
    CREATE INDEX idx_stations_operator ON public.static_stations (operator);
    CREATE INDEX idx_stations_railway ON public.static_stations (railway);

    -- RLS
    ALTER TABLE public.static_stations ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access" ON public.static_stations FOR SELECT USING (true);
    CREATE POLICY "Allow service role write" ON public.static_stations FOR ALL USING (true) WITH CHECK (true);

    -- Reload Schema
    NOTIFY pgrst, 'reload config';
COMMIT;
