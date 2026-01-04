-- Migration: Create wards table (simple version)
-- Execute this SQL directly in Supabase SQL Editor if migration push fails

-- 1. Create wards table
CREATE TABLE IF NOT EXISTS public.wards (
    id TEXT PRIMARY KEY,
    name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
    prefecture TEXT NOT NULL DEFAULT 'Tokyo',
    ward_code TEXT UNIQUE,
    boundary GEOMETRY(Geometry, 4326),
    center_point GEOMETRY(Point, 4326),
    priority_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    node_count INTEGER DEFAULT 0,
    hub_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create spatial indexes
CREATE INDEX IF NOT EXISTS idx_wards_boundary ON public.wards USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_wards_center_point ON public.wards USING GIST (center_point);
CREATE INDEX IF NOT EXISTS idx_wards_prefecture ON public.wards (prefecture);
CREATE INDEX IF NOT EXISTS idx_wards_active ON public.wards (is_active);

-- 3. Add ward_id column to nodes table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nodes' AND column_name = 'ward_id'
    ) THEN
        ALTER TABLE public.nodes ADD COLUMN ward_id TEXT REFERENCES public.wards(id);
        CREATE INDEX IF NOT EXISTS idx_nodes_ward_id ON public.nodes (ward_id);
    END IF;
END $$;

-- 4. Create find_ward_by_point function
CREATE OR REPLACE FUNCTION public.find_ward_by_point(
    point_lng DOUBLE PRECISION,
    point_lat DOUBLE PRECISION
)
RETURNS TABLE (
    id TEXT,
    name_i18n JSONB,
    prefecture TEXT,
    ward_code TEXT,
    center_point GEOMETRY,
    priority_order INTEGER,
    is_active BOOLEAN,
    node_count INTEGER,
    hub_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id, w.name_i18n, w.prefecture, w.ward_code,
        w.center_point, w.priority_order, w.is_active,
        w.node_count, w.hub_count
    FROM public.wards w
    WHERE w.is_active = true
      AND w.boundary IS NOT NULL
      AND ST_Contains(w.boundary, ST_SetSRID(ST_MakePoint(point_lng, point_lat), 4326))
    ORDER BY w.priority_order ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            w.id, w.name_i18n, w.prefecture, w.ward_code,
            w.center_point, w.priority_order, w.is_active,
            w.node_count, w.hub_count
        FROM public.wards w
        WHERE w.is_active = true AND w.center_point IS NOT NULL
        ORDER BY ST_Distance(w.center_point, ST_SetSRID(ST_MakePoint(point_lng, point_lat), 4326)::geography) ASC
        LIMIT 1;
    END IF;
END;
$$;

-- 5. Register migration in schema_migrations
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('20260104070000', 'create_wards_simple.sql', ARRAY[5]::text[])
ON CONFLICT (version) DO NOTHING;

-- 6. Verify the table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'wards';
