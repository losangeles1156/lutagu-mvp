-- Phase 2: Atmosphere Tags Migration
-- 氣氛標籤分類系統與分類日誌追蹤

-- 1. 新增 atmosphere_tags 欄位
DO $$ BEGIN
    ALTER TABLE l1_places ADD COLUMN IF NOT EXISTS atmosphere_tags JSONB;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. 建立氣氛標籤統計視圖
CREATE OR REPLACE VIEW v_l1_atmosphere_statistics AS
SELECT 
    category,
    (atmosphere_tags->'core'->>'energy') as energy,
    (atmosphere_tags->'core'->>'style') as style,
    (atmosphere_tags->'core'->>'crowd_level') as crowd_level,
    COUNT(*) as count,
    ROUND(AVG((atmosphere_tags->>'confidence')::float)::numeric, 2) as avg_confidence
FROM l1_places
WHERE atmosphere_tags IS NOT NULL
GROUP BY category, 
    (atmosphere_tags->'core'->>'energy'),
    (atmosphere_tags->'core'->>'style'),
    (atmosphere_tags->'core'->>'crowd_level');

-- 3. 建立批次分類追蹤表
CREATE TABLE IF NOT EXISTS l1_atmosphere_classification_log (
    id BIGSERIAL PRIMARY KEY,
    poi_id VARCHAR(64) NOT NULL REFERENCES l1_places(id) ON DELETE CASCADE,
    batch_id VARCHAR(32) NOT NULL,
    model_used VARCHAR(64),
    confidence float,
    classified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(32) DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 建立索引
CREATE INDEX IF NOT EXISTS idx_atmosphere_log_batch ON l1_atmosphere_classification_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_atmosphere_log_status ON l1_atmosphere_classification_log(status);
CREATE INDEX IF NOT EXISTS idx_atmosphere_log_poi ON l1_atmosphere_classification_log(poi_id);
CREATE INDEX IF NOT EXISTS idx_atmosphere_log_created ON l1_atmosphere_classification_log(created_at DESC);

-- 5. 建立分類進度視圖
CREATE OR REPLACE VIEW v_l1_atmosphere_progress AS
SELECT 
    'total' as metric,
    COUNT(*) as value
FROM l1_places
UNION ALL
SELECT 
    'classified' as metric,
    COUNT(*) as value
FROM l1_places
WHERE atmosphere_tags IS NOT NULL
UNION ALL
SELECT 
    'unclassified' as metric,
    COUNT(*) as value
FROM l1_places
WHERE atmosphere_tags IS NULL;

-- 6. 建立最近分類記錄視圖
CREATE OR REPLACE VIEW v_l1_recent_classifications AS
SELECT 
    l.poi_id,
    p.name as poi_name,
    p.category,
    l.model_used,
    (p.atmosphere_tags->>'confidence') as confidence,
    (p.atmosphere_tags->'core'->>'energy') as energy,
    (p.atmosphere_tags->'core'->>'style') as style,
    l.classified_at,
    l.status
FROM l1_atmosphere_classification_log l
JOIN l1_places p ON l.poi_id = p.id
ORDER BY l.classified_at DESC
LIMIT 100;

-- 7. 建立失敗重試函數
CREATE OR REPLACE FUNCTION retry_failed_classifications(
    p_batch_id VARCHAR(32),
    p_max_retries INT DEFAULT 3
) RETURNS INT AS $$
DECLARE
    v_poi_id VARCHAR(64);
    v_retry_count INT;
    v_count INT := 0;
    v_log_id BIGINT;
BEGIN
    FOR v_log_id, v_poi_id, v_retry_count IN 
        SELECT id, poi_id, retry_count 
        FROM l1_atmosphere_classification_log 
        WHERE batch_id = p_batch_id 
        AND status = 'failed'
        AND retry_count < p_max_retries
    LOOP
        -- 更新重試次數
        UPDATE l1_atmosphere_classification_log 
        SET retry_count = retry_count + 1 
        WHERE id = v_log_id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 8. 建立分類統計函數
CREATE OR REPLACE FUNCTION get_atmosphere_stats(p_category VARCHAR DEFAULT NULL)
RETURNS TABLE (
    category VARCHAR,
    energy VARCHAR,
    style VARCHAR,
    count BIGINT,
    avg_confidence FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.category,
        (p.atmosphere_tags->'core'->>'energy')::VARCHAR as energy,
        (p.atmosphere_tags->'core'->>'style')::VARCHAR as style,
        COUNT(*)::BIGINT as count,
        AVG((p.atmosphere_tags->>'confidence')::float)::FLOAT as avg_confidence
    FROM l1_places p
    WHERE p.atmosphere_tags IS NOT NULL
    AND (p_category IS NULL OR p.category = p_category)
    GROUP BY p.category,
        (p.atmosphere_tags->'core'->>'energy'),
        (p.atmosphere_tags->'core'->>'style');
END;
$$ LANGUAGE plpgsql;

-- 9. 建立批次清理函數（清理舊的分類記錄）
CREATE OR REPLACE FUNCTION cleanup_old_classification_logs(p_days INT DEFAULT 30)
RETURNS BIGINT AS $$
DECLARE
    v_count BIGINT;
BEGIN
    DELETE FROM l1_atmosphere_classification_log 
    WHERE created_at < NOW() - (p_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 10. 授與權限（根據需要調整）
-- GRANT SELECT ON v_l1_atmosphere_statistics TO authenticated;
-- GRANT SELECT ON v_l1_atmosphere_progress TO authenticated;
-- GRANT SELECT ON v_l1_recent_classifications TO authenticated;

-- 印出遷移完成訊息
DO $$
BEGIN
    RAISE NOTICE 'Phase 2: Atmosphere Tags Migration completed successfully';
    RAISE NOTICE 'Tables created: l1_atmosphere_classification_log';
    RAISE NOTICE 'Views created: v_l1_atmosphere_statistics, v_l1_atmosphere_progress, v_l1_recent_classifications';
    RAISE NOTICE 'Functions created: retry_failed_classifications, get_atmosphere_stats, cleanup_old_classification_logs';
END $$;
