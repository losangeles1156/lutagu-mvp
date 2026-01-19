-- Migration: Add location_tags column to l1_places table
-- Created: 2026-01-10
-- Purpose: Fix POITaggedEngine query error - column l1_places.location_tags does not exist

-- 新增 location_tags 欄位（使用 JSONB 類型以支援複雜查詢）
ALTER TABLE l1_places ADD COLUMN IF NOT EXISTS location_tags JSONB DEFAULT '[]'::jsonb;

-- 建立 GIN 索引以優化 JSONB 查詢效能
-- 支援 @>、?、?|、&< 等運算子查詢
CREATE INDEX IF NOT EXISTS idx_l1_places_location_tags_gin
ON l1_places USING GIN (location_tags);

-- 建立 GIN 索引支援全文搜尋（可選）
CREATE INDEX IF NOT EXISTS idx_l1_places_location_tags_gin_path
ON l1_places USING GIN (location_tags jsonb_path_ops);

-- 新增註解說明欄位用途
COMMENT ON COLUMN l1_places.location_tags IS
'POI location tags stored as JSONB array, e.g. ["日本料理", "咖啡廳", "拉麵"]';

-- 更新現有資料：如果有舊的 location_tags 字串欄位，遷移到新的 JSONB 格式
-- 假設可能存在 text 類型的舊欄位，需要轉換
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'l1_places'
        AND column_name = 'location_tags_text'
        AND data_type = 'text'
    ) THEN
        -- 將舊的文字欄位遷移到新的 JSONB 欄位
        UPDATE l1_places
        SET location_tags = (
            SELECT jsonb_array_elements(
                ('[' || REPLACE(location_tags_text, ',', '","') || ']')::jsonb
            )::jsonb
            FROM l1_places AS old
            WHERE old.id = l1_places.id
            AND location_tags_text IS NOT NULL
        )
        WHERE EXISTS (
            SELECT 1 FROM l1_places AS old
            WHERE old.id = l1_places.id
            AND old.location_tags_text IS NOT NULL
        );

        -- 刪除舊的 text 欄位
        ALTER TABLE l1_places DROP COLUMN IF EXISTS location_tags_text;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 建立更新時間戳觸發器（如果 updated_at 欄位存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'l1_places' AND column_name = 'updated_at'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'trigger_update_l1_places_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION update_l1_places_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trigger_update_l1_places_timestamp
        BEFORE UPDATE ON l1_places
        FOR EACH ROW
        EXECUTE FUNCTION update_l1_places_timestamp();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 驗證遷移結果
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'l1_places' AND column_name = 'location_tags';
