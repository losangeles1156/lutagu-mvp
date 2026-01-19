-- Migration: Node Admin System - Phase 1
-- Purpose: 建立節點與數據管理後台所需的資料表
-- Date: 2026-01-04

-- ============================================
-- 1. 節點層級結構表 (node_hierarchy)
-- ============================================
CREATE TABLE IF NOT EXISTS node_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id TEXT NOT NULL UNIQUE,
    hub_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_node_hierarchy_hub ON node_hierarchy(hub_id);
CREATE INDEX IF NOT EXISTS idx_node_hierarchy_node ON node_hierarchy(node_id);

COMMENT ON TABLE node_hierarchy IS '節點層級結構，管理 Hub/子站關係';

-- ============================================
-- 2. L1 數據配置表 (node_l1_config)
-- ============================================
CREATE TABLE IF NOT EXISTS node_l1_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id TEXT NOT NULL,
    category TEXT NOT NULL,
    source_table TEXT NOT NULL,
    source_id TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    notes TEXT,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(node_id, source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_l1_config_node ON node_l1_config(node_id, category, is_approved);

COMMENT ON TABLE node_l1_config IS 'L1 數據顯示配置，控制哪些 L1 數據顯示在前端';

-- ============================================
-- 3. L3 數據配置表 (node_l3_config)
-- ============================================
CREATE TABLE IF NOT EXISTS node_l3_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id TEXT NOT NULL,
    facility_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    notes TEXT,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(node_id, facility_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_l3_config_node ON node_l3_config(node_id, facility_type, is_approved);

COMMENT ON TABLE node_l3_config IS 'L3 設施數據顯示配置';

-- ============================================
-- 4. 節點標籤配置表 (node_tags_config)
-- ============================================
CREATE TABLE IF NOT EXISTS node_tags_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id TEXT NOT NULL,
    tag_key TEXT NOT NULL,
    tag_value JSONB NOT NULL,
    weight INTEGER DEFAULT 50,
    is_override BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(node_id, tag_key)
);

CREATE INDEX IF NOT EXISTS idx_tags_config_node ON node_tags_config(node_id, is_active);

COMMENT ON TABLE node_tags_config IS '節點標籤配置';

-- ============================================
-- 5. Views (不使用 lat/lon，簡化處理)
-- ============================================
CREATE OR REPLACE VIEW v_l1_pending AS
SELECT
    l1.id,
    l1.station_id AS node_id,
    l1.name,
    l1.category,
    l1.osm_id,
    c.is_approved,
    c.is_featured,
    c.notes
FROM l1_places l1
LEFT JOIN node_l1_config c ON l1.station_id = c.node_id
    AND c.source_id = l1.id::TEXT
WHERE c.is_approved IS NULL OR c.is_approved = FALSE;

CREATE OR REPLACE VIEW v_l1_approved AS
SELECT
    l1.id,
    l1.station_id AS node_id,
    l1.name,
    l1.category,
    l1.osm_id,
    c.is_featured,
    c.display_order
FROM l1_places l1
JOIN node_l1_config c ON l1.station_id = c.node_id
    AND c.source_id = l1.id::TEXT
WHERE c.is_approved = TRUE
ORDER BY c.display_order, l1.name;

-- ============================================
-- 6. RLS
-- ============================================
ALTER TABLE node_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_l1_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_l3_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_tags_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read" ON node_hierarchy FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read" ON node_l1_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read" ON node_l3_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read" ON node_tags_config FOR SELECT TO authenticated USING (true);

-- 完成
DO $$
BEGIN
    RAISE NOTICE 'Node Admin Phase 1: 資料表建立完成';
END;
$$;
