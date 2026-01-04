-- Phase 1: Ward System Database Migration
-- Creates the wards table and related infrastructure
-- Run: supabase db push

-- ============================================
-- 1. Create wards table
-- ============================================
CREATE TABLE IF NOT EXISTS wards (
    id TEXT PRIMARY KEY,                    -- 'ward:taito', 'ward:shinjuku', etc.
    name_i18n JSONB NOT NULL,               -- {"zh-TW": "台東區", "ja": "台東区", "en": "Taito"}
    prefecture TEXT NOT NULL DEFAULT 'Tokyo',
    ward_code INT,                          -- ISO 13131 ward code (1-23 for Tokyo)

    -- Geographic Data (from 国土地理院)
    boundary GEOMETRY(MultiPolygon, 4326),  -- Administrative boundary
    center_point GEOMETRY(Point, 4326),     -- Centroid for quick lookup

    -- Statistics (aggregated from nodes table)
    node_count INT DEFAULT 0,
    hub_count INT DEFAULT 0,

    -- Metadata
    priority_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Create indexes for spatial queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_wards_boundary_gist
ON wards USING GIST(boundary);

CREATE INDEX IF NOT EXISTS idx_wards_center_gist
ON wards USING GIST(center_point);

CREATE INDEX IF NOT EXISTS idx_wards_priority
ON wards(priority_order) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_wards_prefecture
ON wards(prefecture) WHERE is_active = true;

-- ============================================
-- 3. Add ward_id column to nodes table
-- ============================================
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS ward_id TEXT REFERENCES wards(id);

CREATE INDEX IF NOT EXISTS idx_nodes_ward_id
ON nodes(ward_id) WHERE ward_id IS NOT NULL;

-- ============================================
-- 4. Create PostGIS function for finding ward by point
-- ============================================
CREATE OR REPLACE FUNCTION find_ward_by_point(
    lat float,
    lng float
)
RETURNS TABLE (
    id text,
    name_i18n jsonb,
    prefecture text,
    distance_km float
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.name_i18n,
        w.prefecture,
        ST_Distance(
            w.center_point,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)
        ) / 1000 as distance_km
    FROM wards w
    WHERE ST_Contains(w.boundary, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
    ORDER BY distance_km ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_ward_by_point(float, float) TO anon;
GRANT EXECUTE ON FUNCTION find_ward_by_point(float, float) TO authenticated;

-- ============================================
-- 5. Seed Tokyo 23 wards data
-- ============================================
-- Note: Boundary data should be imported from 国土地理院
-- This is a placeholder with basic ward information

INSERT INTO wards (id, name_i18n, prefecture, ward_code, priority_order, is_active) VALUES
-- Core 9 wards (priority order)
('ward:taito', '{"zh-TW": "台東區", "ja": "台東区", "en": "Taito"}', 'Tokyo', 13103, 1, true),
('ward:chiyoda', '{"zh-TW": "千代田區", "ja": "千代田区", "en": "Chiyoda"}', 'Tokyo', 13101, 2, true),
('ward:shinjuku', '{"zh-TW": "新宿區", "ja": "新宿区", "en": "Shinjuku"}', 'Tokyo', 13104, 3, true),
('ward:bunkyo', '{"zh-TW": "文京區", "ja": "文京区", "en": "Bunkyo"}', 'Tokyo', 13105, 4, true),
('ward:minato', '{"zh-TW": "港區", "ja": "港区", "en": "Minato"}', 'Tokyo', 13103, 5, true),
('ward:shibuya', '{"zh-TW": "渋谷區", "ja": "渋谷区", "en": "Shibuya"}', 'Tokyo', 13113, 6, true),
('ward:shinagawa', '{"zh-TW": "品川區", "ja": "品川区", "en": "Shinagawa"}', 'Tokyo', 13109, 7, true),
('ward:toshima', '{"zh-TW": "豐島區", "ja": "豊島区", "en": "Toshima"}', 'Tokyo', 13116, 8, true),
('ward:chuo', '{"zh-TW": "中央區", "ja": "中央区", "en": "Chuo"}', 'Tokyo', 13102, 9, true),
-- Remaining 14 wards
('ward:sumida', '{"zh-TW": "墨田區", "ja": "墨田区", "en": "Sumida"}', 'Tokyo', 13107, 10, true),
('ward:koto', '{"zh-TW": "江東區", "ja": "江東区", "en": "Koto"}', 'Tokyo', 13108, 11, true),
('ward:arikawa', '{"zh-TW": "荒川區", "ja": "荒川区", "en": "Arakawa"}', 'Tokyo', 13117, 12, true),
('ward:itabashi', '{"zh-TW": "板橋區", "ja": "板橋区", "en": "Itabashi"}', 'Tokyo', 13119, 13, true),
('ward:nerima', '{"zh-TW": "練馬區", "ja": "練馬区", "en": "Nerima"}', 'Tokyo', 13120, 14, true),
('ward:adachi', '{"zh-TW": "足立區", "ja": "足立区", "en": "Adachi"}', 'Tokyo', 13121, 15, true),
('ward:katsushika', '{"zh-TW": "葛飾區", "ja": "葛飾区", "en": "Katsushika"}', 'Tokyo', 13122, 16, true),
('ward:edogawa', '{"zh-TW": "江戶川區", "ja": "江戸川区", "en": "Edogawa"}', 'Tokyo', 13123, 17, true),
('ward:setagaya', '{"zh-TW": "世田谷區", "ja": "世田谷区", "en": "Setagaya"}', 'Tokyo', 13112, 18, true),
('ward:ota', '{"zh-TW": "大田區", "ja": "大田区", "en": "Ota"}', 'Tokyo', 13111, 19, true),
('ward:meguro', '{"zh-TW": "目黑區", "ja": "目黒区", "en": "Meguro"}', 'Tokyo', 13110, 20, true),
('ward:nakano', '{"zh-TW": "中野區", "ja": "中野区", "en": "Nakano"}', 'Tokyo', 13114, 21, true),
('ward:suginami', '{"zh-TW": "杉並區", "ja": "杉並区", "en": "Suginami"}', 'Tokyo', 13115, 22, true),
('ward:kita', '{"zh-TW": "北區", "ja": "北区", "en": "Kita"}', 'Tokyo', 13118, 23, true)
ON CONFLICT (id) DO NOTHING;

-- Note: Boundary and center_point columns need to be populated separately
-- from 国土地理院 GeoJSON data. Run scripts/seed_ward_boundaries.ts after this migration.
