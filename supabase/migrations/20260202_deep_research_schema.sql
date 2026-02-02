-- Create static_railways table (Topology)
CREATE TABLE IF NOT EXISTS public.static_railways (
    id TEXT PRIMARY KEY, -- odpt:Railway:Romeji
    same_as TEXT, -- odpt:sameAs
    title_en TEXT,
    title_ja TEXT,
    station_order JSONB NOT NULL, -- Array of objects: [{"index": 1, "station": "..."}]
    ascending_rail_direction TEXT,
    descending_rail_direction TEXT,
    operator TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for railways
ALTER TABLE public.static_railways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.static_railways FOR SELECT USING (true);
CREATE POLICY "Allow service role write" ON public.static_railways FOR ALL USING (true) WITH CHECK (true);

-- Create static_fares table (Cost)
CREATE TABLE IF NOT EXISTS public.static_fares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_station TEXT NOT NULL,
    to_station TEXT NOT NULL,
    ticket_fare INTEGER,
    ic_fare INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uniq_fare_pair UNIQUE (from_station, to_station)
);

-- Enable RLS for fares
ALTER TABLE public.static_fares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.static_fares FOR SELECT USING (true);
CREATE POLICY "Allow service role write" ON public.static_fares FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster routing queries
CREATE INDEX idx_fares_from_station ON public.static_fares (from_station);
CREATE INDEX idx_fares_to_station ON public.static_fares (to_station);
