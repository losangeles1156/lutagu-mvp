-- Migration: Add L1 POI Tagging System (Phase 1)
-- Date: 2026-01-07
-- Purpose: Add location_tags and category_tags columns for AI-powered POI recommendations

-- 1. Add tag columns to l1_places
ALTER TABLE l1_places ADD COLUMN IF NOT EXISTS location_tags JSONB DEFAULT '{}'::jsonb;
ALTER TABLE l1_places ADD COLUMN IF NOT EXISTS category_tags JSONB DEFAULT '{}'::jsonb;
ALTER TABLE l1_places ADD COLUMN IF NOT EXISTS atmosphere_tags JSONB DEFAULT '{}'::jsonb;

-- 2. Create indexes for tag queries
CREATE INDEX IF NOT EXISTS idx_l1_places_location_tags
ON l1_places USING GIN(location_tags);

CREATE INDEX IF NOT EXISTS idx_l1_places_category_tags
ON l1_places USING GIN(category_tags);

CREATE INDEX IF NOT EXISTS idx_l1_places_atmosphere_tags
ON l1_places USING GIN(atmosphere_tags);

CREATE INDEX IF NOT EXISTS idx_l1_places_ward_location
ON l1_places ((location_tags->>'ward'));

CREATE INDEX IF NOT EXISTS idx_l1_places_hub_id
ON l1_places ((location_tags->>'hub_id'));

CREATE INDEX IF NOT EXISTS idx_l1_places_category_primary
ON l1_places ((category_tags->>'primary'));

CREATE INDEX IF NOT EXISTS idx_l1_places_chain_brand
ON l1_places ((category_tags->>'brand_name'))
WHERE (category_tags->>'is_chain')::boolean = true;

-- 3. Create brand category mapping table
CREATE TABLE IF NOT EXISTS l1_brand_category_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name TEXT NOT NULL UNIQUE,
    category_tags JSONB NOT NULL,
    atmosphere_tags JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Insert common brand mappings
INSERT INTO l1_brand_category_map (brand_name, category_tags) VALUES
    -- 連鎖餐廳
    ('吉野家', '{"primary": "dining", "secondary": "japanese_food", "detailed": "gyudon", "characteristics": {"is_chain": true, "is_24h": false, "is_partner": false, "price_range": 1}}'::jsonb),
    ('松屋', '{"primary": "dining", "secondary": "japanese_food", "detailed": "gyudon", "characteristics": {"is_chain": true, "is_24h": true, "is_partner": false, "price_range": 1}}'::jsonb),
    (' SUBWAY', '{"primary": "dining", "secondary": "western_food", "detailed": "sandwich", "characteristics": {"is_chain": true, "is_24h": false, "is_partner": false, "price_range": 1}}'::jsonb),
    (' Starbucks', '{"primary": "dining", "secondary": "cafe", "detailed": "coffee", "characteristics": {"is_chain": true, "is_24h": false, "is_partner": false, "price_range": 2}}'::jsonb),
    (' ドトールコーヒー', '{"primary": "dining", "secondary": "cafe", "detailed": "coffee", "characteristics": {"is_chain": true, "is_24h": false, "is_partner": false, "price_range": 1}}'::jsonb),
    (' 一蘭', '{"primary": "dining", "secondary": "japanese_food", "detailed": "ramen", "characteristics": {"is_chain": true, "is_24h": true, "is_partner": false, "price_range": 2}}'::jsonb),
    (' 鳥貴族', '{"primary": "dining", "secondary": "izakaya", "detailed": "yakitori", "characteristics": {"is_chain": true, "is_24h": false, "is_partner": false, "price_range": 2}}'::jsonb),
    (' 魚民', '{"primary": "dining", "secondary": "izakaya", "detailed": "izakaya", "characteristics": {"is_chain": true, "is_24h": true, "is_partner": false, "price_range": 2}}'::jsonb),
    -- 便利商店
    (' セブン-イレブン', '{"primary": "shopping", "secondary": "convenience", "detailed": "convenience_store", "characteristics": {"is_chain": true, "is_24h": true, "is_partner": false, "price_range": 1}}'::jsonb),
    (' ファミリーマート', '{"primary": "shopping", "secondary": "convenience", "detailed": "convenience_store", "characteristics": {"is_chain": true, "is_24h": true, "is_partner": false, "price_range": 1}}'::jsonb),
    (' ローソン', '{"primary": "shopping", "secondary": "convenience", "detailed": "convenience_store", "characteristics": {"is_chain": true, "is_24h": true, "is_partner": false, "price_range": 1}}'::jsonb),
    -- 速食
    (' マクドナルド', '{"primary": "dining", "secondary": "western_food", "detailed": "burger", "characteristics": {"is_chain": true, "is_24h": false, "is_partner": false, "price_range": 1}}'::jsonb),
    (' 肯德基', '{"primary": "dining", "secondary": "western_food", "detailed": "fried_chicken", "characteristics": {"is_chain": true, "is_24h": false, "is_partner": false, "price_range": 1}}'::jsonb),
    -- 百貨/電器
    (' 伊勢丹', '{"primary": "shopping", "secondary": "department", "detailed": "department_store", "characteristics": {"is_chain": true, "is_24h": false, "is_partner": false, "price_range": 4}}'::jsonb),
    (' 高島屋', '{"primary": "shopping", "secondary": "department", "detailed": "department_store", "characteristics": {"is_chain": true, "is_24h": false, "is_partner": false, "price_range": 4}}'::jsonb),
    (' BIC CAMERA', '{"primary": "shopping", "secondary": "electronics", "detailed": "electronics", "characteristics": {"is_chain": true, "is_24h": false, "is_partner": false, "price_range": 3}}'::jsonb),
    (' ヤマダ電機', '{"primary": "shopping", "secondary": "electronics", "detailed": "electronics", "characteristics": {"is_chain": true, "is_24h": false, "is_partner": false, "price_range": 3}}'::jsonb),
    (' UNIQLO', '{"primary": "shopping", "secondary": "fashion", "detailed": "clothing", "characteristics": {"is_chain": true, "is_24h": false, "is_partner": false, "price_range": 2}}'::jsonb),
    (' GU', '{"primary": "shopping", "secondary": "fashion", "detailed": "clothing", "characteristics": {"is_chain": true, "is_24h": false, "is_partner": false, "price_range": 1}}'::jsonb)
ON CONFLICT (brand_name) DO NOTHING;

-- 5. Create tag generation functions

-- Generate location tags for a single POI
CREATE OR REPLACE FUNCTION generate_location_tags(
    p_poi_id UUID,
    p_station_id TEXT,
    p_location geography
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_ward RECORD;
    v_station RECORD;
    v_near_station BOOLEAN;
    v_walking_minutes INT;
    v_micro_areas TEXT[];
BEGIN
    -- Find containing ward
    SELECT w.code INTO v_ward
    FROM wards w
    WHERE ST_Contains(w.boundary, p_location)
    LIMIT 1;

    -- Find nearest station
    SELECT n.id, n.parent_hub_id, n.coordinates, n.name
    INTO v_station
    FROM nodes n
    WHERE n.is_active = true
    ORDER BY n.coordinates <-> p_location
    LIMIT 1;

    -- Calculate distance to station
    IF v_station.coordinates IS NOT NULL THEN
        v_near_station := ST_DWithin(p_location, v_station.coordinates::geography, 500);
        v_walking_minutes := ROUND(ST_Distance(p_location, v_station.coordinates::geography) / 80)::INT;
    ELSE
        v_near_station := false;
        v_walking_minutes := NULL;
    END IF;

    -- Build result
    v_result := jsonb_build_object(
        'ward', v_ward.code,
        'micro_areas', ARRAY(SELECT code FROM wards WHERE ST_DWithin(boundary, p_location, 500)),
        'hub_id', COALESCE(v_station.parent_hub_id, v_station.id),
        'station_id', v_station.id,
        'station_name', v_station.name,
        'near_station', v_near_station,
        'walking_minutes', v_walking_minutes,
        'generated_at', NOW()::TEXT
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Generate category tags for a single POI
CREATE OR REPLACE FUNCTION generate_category_tags(
    p_name TEXT,
    p_category TEXT,
    p_tags JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_brand_map RECORD;
    v_detailed TEXT;
    v_is_chain BOOLEAN := false;
    v_price_range INT := 2;
BEGIN
    -- Check brand mapping
    SELECT * INTO v_brand_map
    FROM l1_brand_category_map
    WHERE is_active = true
    AND (p_name LIKE '%' || brand_name || '%' OR p_name ILIKE '%' || brand_name || '%')
    ORDER BY length(brand_name) DESC
    LIMIT 1;

    IF v_brand_map.id IS NOT NULL THEN
        -- Use brand mapping
        v_result := v_brand_map.category_tags;

        -- Add brand name if not present
        IF NOT (v_result->>'brand_name' = v_brand_map.brand_name) THEN
            v_result := jsonb_set(v_result, '{brand_name}', to_jsonb(v_brand_map.brand_name));
        END IF;
    ELSE
        -- Auto-detect from OSM tags
        v_detailed := auto_detect_detailed_category(p_category, p_tags);

        -- Detect if chain from name patterns
        v_is_chain := detect_chain_from_name(p_name);

        -- Estimate price range
        v_price_range := estimate_price_range(p_category, p_tags);

        v_result := jsonb_build_object(
            'primary', p_category,
            'secondary', auto_detect_secondary_category(p_category, p_tags),
            'detailed', v_detailed,
            'characteristics', jsonb_build_object(
                'is_chain', v_is_chain,
                'is_24h', (p_tags->>'opening_hours') = '24/7',
                'is_partner', false,
                'price_range', v_price_range
            )
        );
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Helper: Auto-detect detailed category
CREATE OR REPLACE FUNCTION auto_detect_detailed_category(
    p_category TEXT,
    p_tags JSONB
)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE p_category
        WHEN 'dining' THEN
            CASE
                WHEN p_tags->>'cuisine' ILIKE '%ramen%' THEN 'ramen'
                WHEN p_tags->>'cuisine' ILIKE '%sushi%' THEN 'sushi'
                WHEN p_tags->>'cuisine' ILIKE '%tempura%' THEN 'tempura'
                WHEN p_tags->>'cuisine' ILIKE '%udon%' THEN 'udon'
                WHEN p_tags->>'cuisine' ILIKE '%soba%' THEN 'soba'
                WHEN p_tags->>'cuisine' ILIKE '%yakitori%' THEN 'yakitori'
                WHEN p_tags->>'cuisine' ILIKE '%izakaya%' THEN 'izakaya'
                WHEN p_tags->>'cuisine' ILIKE '%burger%' THEN 'burger'
                WHEN p_tags->>'cuisine' ILIKE '%coffee%' THEN 'coffee'
                ELSE 'other'
            END
        WHEN 'shopping' THEN
            CASE
                WHEN p_tags->>'shop' = 'supermarket' THEN 'supermarket'
                WHEN p_tags->>'shop' = 'convenience' THEN 'convenience_store'
                WHEN p_tags->>'shop' = 'clothes' THEN 'clothing'
                WHEN p_tags->>'shop' = 'electronics' THEN 'electronics'
                ELSE 'other'
            END
        ELSE 'other'
    END;
END;
$$ LANGUAGE plpgsql;

-- Helper: Detect chain from name patterns
CREATE OR REPLACE FUNCTION detect_chain_from_name(p_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_patterns TEXT[] := ARRAY[
        '株式会社', '株式会社', 'Co.', 'Ltd.', 'Inc.',
        'チェーン', 'チェーン店', 'フランチャイズ'
    ];
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM unnest(v_patterns) p
        WHERE p_name ILIKE '%' || p || '%'
    );
END;
$$ LANGUAGE plpgsql;

-- Helper: Estimate price range
CREATE OR REPLACE FUNCTION estimate_price_range(
    p_category TEXT,
    p_tags JSONB
)
RETURNS INT AS $$
BEGIN
    RETURN CASE p_category
        WHEN 'dining' THEN
            CASE
                WHEN p_tags->>'price_range' = 'high' THEN 4
                WHEN p_tags->>'price_range' = 'medium' THEN 3
                WHEN p_tags->>'cuisine' ILIKE '%fast_food%' THEN 1
                WHEN p_tags->>'cuisine' ILIKE '%restaurant%' THEN 3
                ELSE 2
            END
        WHEN 'shopping' THEN
            CASE
                WHEN p_tags->>'shop' = 'department_store' THEN 4
                WHEN p_tags->>'shop' = 'supermarket' THEN 1
                WHEN p_tags->>'shop' = 'convenience' THEN 1
                ELSE 2
            END
        ELSE 2
    END;
END;
$$ LANGUAGE plpgsql;

-- Helper: Detect secondary category
CREATE OR REPLACE FUNCTION auto_detect_secondary_category(
    p_category TEXT,
    p_tags JSONB
)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE p_category
        WHEN 'dining' THEN
            CASE
                WHEN p_tags->>'amenity' = 'restaurant' THEN 'restaurant'
                WHEN p_tags->>'amenity' = 'fast_food' THEN 'fast_food'
                WHEN p_tags->>'amenity' = 'cafe' THEN 'cafe'
                WHEN p_tags->>'amenity' = 'bar' THEN 'bar'
                WHEN p_tags->>'amenity' = 'ice_cream' THEN 'dessert'
                ELSE 'other'
            END
        WHEN 'shopping' THEN
            CASE
                WHEN p_tags->>'shop' ILIKE '%food%' THEN 'grocery'
                WHEN p_tags->>'shop' ILIKE '%cloth%' THEN 'clothing'
                WHEN p_tags->>'shop' ILIKE '%electron%' THEN 'electronics'
                WHEN p_tags->>'shop' ILIKE '%book%' THEN 'books'
                ELSE 'other'
            END
        ELSE 'other'
    END;
END;
$$ LANGUAGE plpgsql;

-- 6. Batch update function
CREATE OR REPLACE FUNCTION batch_update_l1_tags(
    p_batch_size INT DEFAULT 1000,
    p_tag_type TEXT DEFAULT 'location'  -- 'location', 'category', 'all'
)
RETURNS JSON AS $$
DECLARE
    v_updated_count INT := 0;
    v_error_count INT := 0;
    v_poi RECORD;
    v_location_tags JSONB;
    v_category_tags JSONB;
    v_cursor CURSOR FOR
        SELECT id, name, station_id, location, category, tags
        FROM l1_places
        WHERE (p_tag_type = 'all' OR p_tag_type = 'location')
            AND location_tags IS NULL
            AND location IS NOT NULL
        LIMIT p_batch_size;
BEGIN
    OPEN v_cursor;
    LOOP
        FETCH v_cursor INTO v_poi;
        EXIT WHEN NOT FOUND;

        BEGIN
            -- Generate location tags
            IF p_tag_type IN ('all', 'location') THEN
                v_location_tags := generate_location_tags(v_poi.id, v_poi.station_id, v_poi.location);
            END IF;

            -- Generate category tags
            IF p_tag_type IN ('all', 'category') THEN
                v_category_tags := generate_category_tags(v_poi.name, v_poi.category, v_poi.tags);
            END IF;

            -- Update record
            UPDATE l1_places
            SET
                location_tags = COALESCE(v_location_tags, location_tags),
                category_tags = COALESCE(v_category_tags, category_tags),
                updated_at = NOW()
            WHERE id = v_poi.id;

            v_updated_count := v_updated_count + 1;

        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            RAISE NOTICE 'Error processing POI %: %', v_poi.id, SQLERRM;
        END;
    END LOOP;
    CLOSE v_cursor;

    RETURN jsonb_build_object(
        'updated', v_updated_count,
        'errors', v_error_count,
        'tag_type', p_tag_type,
        'timestamp', NOW()::TEXT
    );
END;
$$ LANGUAGE plpgsql;

-- 7. Create view for tag statistics
CREATE OR REPLACE VIEW v_l1_tag_statistics AS
SELECT
    'total' AS stat_type,
    COUNT(*)::int AS count,
    COUNT(*) FILTER (WHERE location_tags IS NOT NULL)::int AS with_location_tags,
    COUNT(*) FILTER (WHERE category_tags IS NOT NULL)::int AS with_category_tags,
    COUNT(*) FILTER (WHERE atmosphere_tags IS NOT NULL)::int AS with_atmosphere_tags,
    ROUND(COUNT(*) FILTER (WHERE location_tags IS NOT NULL)::float / NULLIF(COUNT(*), 0) * 100, 1)::float AS location_tag_rate,
    ROUND(COUNT(*) FILTER (WHERE category_tags IS NOT NULL)::float / NULLIF(COUNT(*), 0) * 100, 1)::float AS category_tag_rate,
    ROUND(COUNT(*) FILTER (WHERE atmosphere_tags IS NOT NULL)::float / NULLIF(COUNT(*), 0) * 100, 1)::float AS atmosphere_tag_rate
FROM l1_places;

-- 8. Update timestamp trigger
CREATE OR REPLACE FUNCTION update_l1_places_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_l1_places_updated_at ON l1_places;
CREATE TRIGGER trigger_l1_places_updated_at
    BEFORE UPDATE ON l1_places
    FOR EACH ROW
    EXECUTE FUNCTION update_l1_places_timestamp();

-- 9. Add comments
COMMENT ON COLUMN l1_places.location_tags IS 'Location tags: ward, micro_areas, hub_id, near_station, walking_minutes';
COMMENT ON COLUMN l1_places.category_tags IS 'Category tags: primary, secondary, detailed, characteristics';
COMMENT ON COLUMN l1_places.atmosphere_tags IS 'Atmosphere tags: core, context, style, target_audience, special';

-- 10. Verify migration
SELECT 'l1_places' AS table_name,
       COUNT(*) AS total_records,
       COUNT(*) FILTER (WHERE location_tags IS NOT NULL) AS with_location_tags,
       COUNT(*) FILTER (WHERE category_tags IS NOT NULL) AS with_category_tags,
       COUNT(*) FILTER (WHERE atmosphere_tags IS NOT NULL) AS with_atmosphere_tags
FROM l1_places;
