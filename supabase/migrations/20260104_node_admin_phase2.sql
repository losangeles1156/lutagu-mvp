-- Migration: Node Admin System - Phase 2
-- Purpose: 數據遷移 - 同步現有數據到新結構
-- Date: 2026-01-04

-- ============================================
-- 1. 同步節點層級 (從 nodes 表)
-- ============================================
-- 插入有 parent_hub_id 的節點
INSERT INTO node_hierarchy (node_id, hub_id, is_active, display_order)
SELECT 
    id AS node_id,
    parent_hub_id AS hub_id,
    TRUE AS is_active,
    COALESCE(display_order, 0) AS display_order
FROM nodes
WHERE parent_hub_id IS NOT NULL
ON CONFLICT (node_id) DO UPDATE SET
    hub_id = EXCLUDED.hub_id,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- 標記所有節點為 active（無 hub_id 的為 Hub 站點）
INSERT INTO node_hierarchy (node_id, hub_id, is_active, display_order)
SELECT 
    id AS node_id,
    NULL AS hub_id,
    TRUE AS is_active,
    COALESCE(display_order, 0) AS display_order
FROM nodes
WHERE parent_hub_id IS NULL
ON CONFLICT (node_id) DO UPDATE SET
    is_active = EXCLUDED.is_active,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

RAISE NOTICE 'Phase 2-1: 節點層級同步完成';

-- ============================================
-- 2. 標記現有 L1 數據為待審核
-- ============================================
-- 為每個 L1 _places 記錄建立 config 條目，預設 is_approved = FALSE
INSERT INTO node_l1_config (node_id, category, source_table, source_id, is_approved)
SELECT 
    station_id AS node_id,
    category,
    'l1_places' AS source_table,
    id::TEXT AS source_id,
    FALSE AS is_approved
FROM l1_places
ON CONFLICT (node_id, source_table, source_id) DO NOTHING;

RAISE NOTICE 'Phase 2-2: L1 數據標記完成 (待審核)';

-- ============================================
-- 3. 預設批准核心站點的 L1 數據
-- ============================================
-- 核心站點列表（可自定義）
DO $$
DECLARE 
    core_hubs TEXT[] := ARRAY[
        'odpt.Station:JR-East.Ueno',
        'odpt.Station:JR-East.Shinjuku',
        'odpt.Station:JR-East.Ikebukuro',
        'odpt.Station:TokyoMetro.Ginza.Ginza',
        'odpt.Station:TokyoMetro.Shibuya',
        'odpt.Station:TokyoMetro.Ikebukuro',
        'odpt.Station:Toei.Oedo.Shinjuku',
        'odpt.Station:JR-East.Tokyo',
        'odpt.Station:TokyoMetro.Tokyo'
    ];
BEGIN
    UPDATE node_l1_config c
    SET is_approved = TRUE, approved_at = NOW()
    FROM unnest(core_hubs) AS hub_id
    WHERE c.node_id = hub_id
    AND c.is_approved = FALSE;
END;
$$;

RAISE NOTICE 'Phase 2-3: 核心站點 L1 數據預設批准完成';

-- ============================================
-- 4. 統計報告
-- ============================================
DO $$
DECLARE
    total_nodes INTEGER;
    total_l1 INTEGER;
    approved_l1 INTEGER;
    pending_l1 INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_nodes FROM node_hierarchy;
    SELECT COUNT(*) INTO total_l1 FROM node_l1_config;
    SELECT COUNT(*) INTO approved_l1 FROM node_l1_config WHERE is_approved = TRUE;
    SELECT COUNT(*) INTO pending_l1 FROM node_l1_config WHERE is_approved = FALSE;
    
    RAISE NOTICE '======================================';
    RAISE NOTICE 'Phase 2 數據遷移統計';
    RAISE NOTICE '======================================';
    RAISE NOTICE '總節點數: %', total_nodes;
    RAISE NOTICE '總 L1 數據: %', total_l1;
    RAISE NOTICE '已批准: %', approved_l1;
    RAISE NOTICE '待審核: %', pending_l1;
    RAISE NOTICE '======================================';
END;
$$;

-- 完成
DO $$
BEGIN
    RAISE NOTICE 'Node Admin Phase 2: 數據遷移完成';
END;
$$;
