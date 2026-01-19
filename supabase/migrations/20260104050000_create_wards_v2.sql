-- Migration: Create wards table for ward-based node redesign
-- Created: 2026-01-04
-- Purpose: Add administrative ward data structure for geographic node grouping

-- Create wards table
CREATE TABLE IF NOT EXISTS wards (
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

-- Create spatial indexes for efficient geographic queries
CREATE INDEX IF NOT EXISTS idx_wards_boundary ON wards USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_wards_center_point ON wards USING GIST (center_point);
CREATE INDEX IF NOT EXISTS idx_wards_prefecture ON wards (prefecture);
CREATE INDEX IF NOT EXISTS idx_wards_active ON wards (is_active);

-- Create PostGIS function to find ward by point
CREATE OR REPLACE FUNCTION find_ward_by_point(
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
    FROM wards w
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
        FROM wards w
        WHERE w.is_active = true AND w.center_point IS NOT NULL
        ORDER BY ST_Distance(w.center_point, ST_SetSRID(ST_MakePoint(point_lng, point_lat), 4326)::geography) ASC
        LIMIT 1;
    END IF;
END;
$$;

-- Add ward_id column to nodes table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'nodes' AND column_name = 'ward_id'
    ) THEN
        ALTER TABLE nodes ADD COLUMN ward_id TEXT REFERENCES wards(id);
        CREATE INDEX IF NOT EXISTS idx_nodes_ward_id ON nodes (ward_id);
    END IF;
END $$;

-- Add updated_at trigger for wards table
CREATE OR REPLACE FUNCTION update_wards_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_wards_updated ON wards;
CREATE TRIGGER trigger_wards_updated
    BEFORE UPDATE ON wards
    FOR EACH ROW
    EXECUTE FUNCTION update_wards_timestamp();
