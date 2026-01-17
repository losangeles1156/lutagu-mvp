CREATE TABLE IF NOT EXISTS public.transit_alerts (
    id TEXT PRIMARY KEY,
    operator TEXT,
    railway TEXT NOT NULL,
    status TEXT NOT NULL,
    text_ja TEXT NOT NULL DEFAULT '',
    text_en TEXT NOT NULL DEFAULT '',
    occurred_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transit_alerts_railway_updated_at
ON public.transit_alerts(railway, updated_at DESC);

ALTER TABLE public.transit_alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'transit_alerts'
          AND policyname = 'Allow public read access to transit_alerts'
    ) THEN
        CREATE POLICY "Allow public read access to transit_alerts"
        ON public.transit_alerts FOR SELECT
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'transit_alerts'
          AND policyname = 'Allow service role write access to transit_alerts'
    ) THEN
        CREATE POLICY "Allow service role write access to transit_alerts"
        ON public.transit_alerts FOR ALL
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;
