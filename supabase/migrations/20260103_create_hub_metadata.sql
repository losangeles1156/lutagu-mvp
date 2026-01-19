-- =============================================================================
-- Hub Metadata & Hub Members Tables for Station Node Grouping
-- Created: 2026-01-03
-- Purpose: Store hub (parent node) metadata and child member relationships
-- =============================================================================

-- Drop existing tables if they exist (for clean re-creation)
DROP TABLE IF EXISTS hub_members CASCADE;
DROP TABLE IF EXISTS hub_metadata CASCADE;

-- =============================================================================
-- Hub Metadata Table
-- Stores information about hub stations (parent nodes)
-- =============================================================================
CREATE TABLE hub_metadata (
    hub_id VARCHAR(100) PRIMARY KEY,
    transfer_type VARCHAR(20) NOT NULL DEFAULT 'indoor' CHECK (transfer_type IN ('indoor', 'outdoor', 'adjacent')),
    walking_distance_meters INT,
    indoor_connection_notes TEXT,
    transfer_complexity VARCHAR(20) NOT NULL DEFAULT 'simple' CHECK (transfer_complexity IN ('simple', 'moderate', 'complex')),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Hub Members Table
-- Stores child member relationships for each hub
-- =============================================================================
CREATE TABLE hub_members (
    id SERIAL PRIMARY KEY,
    hub_id VARCHAR(100) NOT NULL REFERENCES hub_metadata(hub_id) ON DELETE CASCADE,
    member_id VARCHAR(100) NOT NULL,
    member_name JSONB NOT NULL DEFAULT '{}'::jsonb,
    operator VARCHAR(100) NOT NULL DEFAULT '',
    line_name VARCHAR(200),
    transfer_type VARCHAR(20) NOT NULL DEFAULT 'indoor' CHECK (transfer_type IN ('indoor', 'outdoor')),
    walking_seconds INT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hub_id, member_id)
);

-- =============================================================================
-- Indexes for performance
-- =============================================================================
CREATE INDEX idx_hub_members_hub_id ON hub_members(hub_id);
CREATE INDEX idx_hub_members_member_id ON hub_members(member_id);
CREATE INDEX idx_hub_members_active ON hub_members(hub_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_hub_metadata_transfer_type ON hub_metadata(transfer_type);
CREATE INDEX idx_hub_metadata_complexity ON hub_metadata(transfer_complexity);

-- =============================================================================
-- Comments for documentation
-- =============================================================================
COMMENT ON TABLE hub_metadata IS 'Stores metadata for hub stations (parent nodes) in the station grouping system';
COMMENT ON TABLE hub_members IS 'Stores child member relationships for each hub station';
COMMENT ON COLUMN hub_metadata.transfer_type IS 'Type of transfer: indoor (室內直通), outdoor (站外換乘), adjacent (鄰近)';
COMMENT ON COLUMN hub_metadata.transfer_complexity IS 'Complexity level: simple, moderate, complex';
COMMENT ON COLUMN hub_members.transfer_type IS 'Transfer type for this specific member: indoor or outdoor';
COMMENT ON COLUMN hub_members.walking_seconds IS 'Estimated walking time in seconds for this transfer';

-- =============================================================================
-- Sample Data for Major Tokyo Hubs
-- =============================================================================
INSERT INTO hub_metadata (hub_id, transfer_type, walking_distance_meters, indoor_connection_notes, transfer_complexity, display_order) VALUES
-- Major JR + Metro Hubs
('odpt.Station:JR-East.Ueno', 'indoor', 0, 'B1F 連絡通路連接 JR 與東京地下鐵', 'moderate', 1),
('odpt.Station:JR-East.Tokyo', 'indoor', 0, '丸の内地下街連接各公司站體', 'complex', 2),
('odpt.Station:JR-East.Shinjuku', 'outdoor', 300, '多個出口分散，需利用地下通道', 'complex', 3),
('odpt.Station:JR-East.Ikebukuro', 'indoor', 50, '南口地下連絡通路', 'moderate', 4),
('odpt.Station:JR-East.Yokohama', 'outdoor', 400, '橫浜站東西口分散', 'complex', 5),
('odpt.Station:TokyoMetro.Ginza.Ginza', 'indoor', 100, '銀座站地下連絡通路', 'simple', 6),
('odpt.Station:TokyoMetro.Shinjuku', 'indoor', 150, '地下通路連接各線', 'moderate', 7),
('odpt.Station:TokyoMetro.Otemachi', 'indoor', 80, '大手町站地下街', 'simple', 8);

-- Sample Hub Members
INSERT INTO hub_members (hub_id, member_id, member_name, operator, line_name, transfer_type, walking_seconds, sort_order) VALUES
-- Ueno Hub Members
('odpt.Station:JR-East.Ueno', 'odpt.Station:JR-East.Yamanote.Ueno', '{"zh-TW": "JR上野站", "en": "JR Ueno Station", "ja": "JR上野駅"}', 'JR-East', '山手線・京濱東北線', 'indoor', 0, 1),
('odpt.Station:JR-East.Ueno', 'odpt.Station:TokyoMetro.Ginza.Ueno', '{"zh-TW": "東京地下鐵銀座線上野站", "en": "Tokyo Metro Ginza Line Ueno", "ja": "東京メトロ銀座線上野駅"}', 'TokyoMetro', '銀座線', 'indoor', 0, 2),
('odpt.Station:JR-East.Ueno', 'odpt.Station:TokyoMetro.Hibiya.Ueno', '{"zh-TW": "東京地下鐵日比谷線上野站", "en": "Tokyo Metro Hibiya Line Ueno", "ja": "東京メトロ日比谷線上野駅"}', 'TokyoMetro', '日比谷線', 'indoor', 0, 3),
('odpt.Station:JR-East.Ueno', 'odpt.Station:Keisei.Ueno', '{"zh-TW": "京成上野站", "en": "Keisei Ueno Station", "ja": "京成上野駅"}', 'Keisei', '京成本線', 'outdoor', 180, 4),

-- Tokyo Station Hub Members
('odpt.Station:JR-East.Tokyo', 'odpt.Station:JR-East.Yamanote.Tokyo', '{"zh-TW": "JR東京站", "en": "JR Tokyo Station", "ja": "JR東京駅"}', 'JR-East', '山手線・中央線', 'indoor', 0, 1),
('odpt.Station:JR-East.Tokyo', 'odpt.Station:TokyoMetro.Marunouchi.Tokyo', '{"zh-TW": "東京地下鐵丸之內線東京站", "en": "Tokyo Metro Marunouchi Line Tokyo", "ja": "東京メトロ丸ノ内線東京駅"}', 'TokyoMetro', '丸之內線', 'indoor', 0, 2),
('odpt.Station:JR-East.Tokyo', 'odpt.Station:TokyoMetro.Tozai.Tokyo', '{"zh-TW": "東京地下鐵東西線東京站", "en": "Tokyo Metro Tozai Line Tokyo", "ja": "東京メトロ東西線東京駅"}', 'TokyoMetro', '東西線', 'indoor', 120, 3),

-- Shinjuku Hub Members
('odpt.Station:JR-East.Shinjuku', 'odpt.Station:JR-East.Yamanote.Shinjuku', '{"zh-TW": "JR新宿站", "en": "JR Shinjuku Station", "ja": "JR新宿駅"}', 'JR-East', '山手線・中央線・總武線', 'indoor', 0, 1),
('odpt.Station:JR-East.Shinjuku', 'odpt.Station:TokyoMetro.Marunouchi.Shinjuku', '{"zh-TW": "東京地下鐵丸之內線新宿站", "en": "Tokyo Metro Marunouchi Line Shinjuku", "ja": "東京メトロ丸ノ内線新宿駅"}', 'TokyoMetro', '丸之內線', 'indoor', 100, 2),
('odpt.Station:JR-East.Shinjuku', 'odpt.Station:Toei.Oedo.Shinjuku', '{"zh-TW": "都營大江戶線新宿站", "en": "Toei Oedo Line Shinjuku", "ja": "都営大江戸線新宿駅"}', 'Toei', '大江戶線', 'outdoor', 300, 3),
('odpt.Station:JR-East.Shinjuku', 'odpt.Station:Keio.Shinjuku', '{"zh-TW": "京王線新宿站", "en": "Keio Line Shinjuku", "ja": "京王線新宿駅"}', 'Keio', '京王線', 'outdoor', 240, 4),
('odpt.Station:JR-East.Shinjuku', 'odpt.Station:Odakyu.Shinjuku', '{"zh-TW": "小田急線新宿站", "en": "Odakyu Line Shinjuku", "ja": "小田急線新宿駅"}', 'Odakyu', '小田急線', 'outdoor', 300, 5),

-- Ikebukuro Hub Members
('odpt.Station:JR-East.Ikebukuro', 'odpt.Station:JR-East.Yamanote.Ikebukuro', '{"zh-TW": "JR池袋站", "en": "JR Ikebukuro Station", "ja": "JR池袋駅"}', 'JR-East', '山手線・崎京線', 'indoor', 0, 1),
('odpt.Station:JR-East.Ikebukuro', 'odpt.Station:TokyoMetro.Yurakucho.Ikebukuro', '{"zh-TW": "東京地下鐵有樂町線池袋站", "en": "Tokyo Metro Yurakucho Line Ikebukuro", "ja": "東京メトロ有楽町線池袋駅"}', 'TokyoMetro', '有樂町線', 'indoor', 50, 2),
('odpt.Station:JR-East.Ikebukuro', 'odpt.Station:Seibu.Ikebukuro', '{"zh-TW": "西武池袋站", "en": "Seibu Ikebukuro Station", "ja": "西武池袋駅"}', 'Seibu', '西武池袋線', 'outdoor', 180, 3),
('odpt.Station:JR-East.Ikebukuro', 'odpt.Station:Tobu.Ikebukuro', '{"zh-TW": "東武東上線池袋站", "en": "Tobu Tojo Line Ikebukuro", "ja": "東武東上線池袋駅"}', 'Tobu', '東武東上線', 'outdoor', 200, 4);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_hub_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_hub_metadata_updated
    BEFORE UPDATE ON hub_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_hub_metadata_timestamp();

CREATE OR REPLACE FUNCTION update_hub_members_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_hub_members_updated
    BEFORE UPDATE ON hub_members
    FOR EACH ROW
    EXECUTE FUNCTION update_hub_members_timestamp();

-- =============================================================================
-- Helper function to get hub members for a given station
-- =============================================================================
CREATE OR REPLACE FUNCTION get_hub_members(p_hub_id VARCHAR)
RETURNS TABLE (
    member_id VARCHAR,
    member_name JSONB,
    operator VARCHAR,
    line_name VARCHAR,
    transfer_type VARCHAR,
    walking_seconds INT,
    sort_order INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        hm.member_id,
        hm.member_name,
        hm.operator,
        COALESCE(hm.line_name, ''),
        hm.transfer_type,
        hm.walking_seconds,
        hm.sort_order
    FROM hub_members hm
    WHERE hm.hub_id = p_hub_id AND hm.is_active = TRUE
    ORDER BY hm.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Helper function to get hub info by member station ID
-- =============================================================================
CREATE OR REPLACE FUNCTION get_hub_info_by_member(p_member_id VARCHAR)
RETURNS TABLE (
    hub_id VARCHAR,
    transfer_type VARCHAR,
    walking_distance_meters INT,
    indoor_connection_notes TEXT,
    transfer_complexity VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        hm.hub_id,
        hm.transfer_type,
        hm.walking_distance_meters,
        hm.indoor_connection_notes,
        hm.transfer_complexity
    FROM hub_metadata hm
    INNER JOIN hub_members hmbr ON hm.hub_id = hmbr.hub_id
    WHERE hmbr.member_id = p_member_id AND hm.is_active = TRUE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Helper function to check if a station is a hub or a member of a hub
-- =============================================================================
CREATE OR REPLACE FUNCTION get_station_hub_relation(p_station_id VARCHAR)
RETURNS TABLE (
    is_hub BOOLEAN,
    hub_id VARCHAR,
    transfer_type VARCHAR,
    member_count INT,
    is_member_of_hub BOOLEAN
) AS $$
DECLARE
    v_is_hub BOOLEAN;
    v_hub_id VARCHAR;
    v_transfer_type VARCHAR;
    v_member_count INT;
BEGIN
    -- Check if it's a hub
    SELECT EXISTS(SELECT 1 FROM hub_metadata WHERE hub_id = p_station_id AND is_active = TRUE) INTO v_is_hub;

    IF v_is_hub THEN
        hub_id := p_station_id;
        SELECT transfer_type, (SELECT COUNT(*) FROM hub_members WHERE hub_id = p_station_id AND is_active = TRUE)
        INTO v_transfer_type, v_member_count;
        transfer_type := v_transfer_type;
        member_count := v_member_count;
        is_member_of_hub := FALSE;
        is_hub := TRUE;
        RETURN;
    END IF;

    -- Check if it's a member of a hub
    SELECT hm.hub_id, hm.transfer_type INTO v_hub_id, v_transfer_type
    FROM hub_metadata hm
    INNER JOIN hub_members hmbr ON hm.hub_id = hmbr.hub_id
    WHERE hmbr.member_id = p_station_id AND hm.is_active = TRUE AND hmbr.is_active = TRUE
    LIMIT 1;

    IF v_hub_id IS NOT NULL THEN
        hub_id := v_hub_id;
        transfer_type := v_transfer_type;
        SELECT COUNT(*) INTO v_member_count FROM hub_members WHERE hub_id = v_hub_id AND is_active = TRUE;
        member_count := v_member_count;
        is_member_of_hub := TRUE;
        is_hub := FALSE;
    ELSE
        is_hub := FALSE;
        hub_id := NULL;
        transfer_type := NULL;
        member_count := 0;
        is_member_of_hub := FALSE;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Done
DO $$
BEGIN
    RAISE NOTICE '✅ Hub metadata and members tables created successfully!';
    RAISE NOTICE '✅ Sample data inserted for major Tokyo hubs';
    RAISE NOTICE '✅ Helper functions created: get_hub_members, get_hub_info_by_member, get_station_hub_relation';
END;
$$;
