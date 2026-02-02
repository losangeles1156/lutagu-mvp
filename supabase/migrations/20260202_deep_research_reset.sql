-- FORCE RESET SCRIPT (V2 - Explicit Index Drop)
-- This version explicitly removes indexes first to avoid 42P07 errors.

BEGIN;

    -- 1. Explicitly drop potential zombie indexes (Fix for 42P07)
    DROP INDEX IF EXISTS public.idx_fares_from_station;
    DROP INDEX IF EXISTS public.idx_fares_to_station;

    -- 2. Drop Tables
    DROP TABLE IF EXISTS public.static_railways CASCADE;
    DROP TABLE IF EXISTS public.static_fares CASCADE;

    -- 3. Create static_railways
    CREATE TABLE public.static_railways (
        id TEXT PRIMARY KEY,
        same_as TEXT,
        title_en TEXT,
        title_ja TEXT,
        station_order JSONB NOT NULL,
        ascending_rail_direction TEXT,
        descending_rail_direction TEXT,
        operator TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- 4. Create static_fares
    CREATE TABLE public.static_fares (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        from_station TEXT NOT NULL,
        to_station TEXT NOT NULL,
        ticket_fare INTEGER,
        ic_fare INTEGER,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        CONSTRAINT uniq_fare_pair UNIQUE (from_station, to_station)
    );

    -- 5. Indexes
    CREATE INDEX idx_fares_from_station ON public.static_fares (from_station);
    CREATE INDEX idx_fares_to_station ON public.static_fares (to_station);

    -- 6. RLS Policies
    ALTER TABLE public.static_railways ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access" ON public.static_railways FOR SELECT USING (true);
    CREATE POLICY "Allow service role write" ON public.static_railways FOR ALL USING (true) WITH CHECK (true);

    ALTER TABLE public.static_fares ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access" ON public.static_fares FOR SELECT USING (true);
    CREATE POLICY "Allow service role write" ON public.static_fares FOR ALL USING (true) WITH CHECK (true);

    -- 7. Force Schema Reload
    NOTIFY pgrst, 'reload config';

COMMIT;
