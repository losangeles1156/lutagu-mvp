-- Phase 3: Similar POI Precomputation Migration
-- 相似 POI 預計算系統

-- 1. 建立相似度預計算表
CREATE TABLE IF NOT EXISTS l1_poi_similarities (
    id BIGSERIAL PRIMARY KEY,
    poi_id VARCHAR(64) NOT NULL REFERENCES l1_places(id) ON DELETE CASCADE,
    similar_poi_id VARCHAR(64) NOT NULL REFERENCES l1_places(id) ON DELETE CASCADE,
    similarity_score DECIMAL(4,3) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
    similarity_breakdown JSONB NOT NULL,
    common_tags TEXT[],
    recommendation_reason TEXT,
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    UNIQUE(poi_id, similar_poi_id)
);

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_similar_poi_id ON l1_poi_similarities(poi_id);
CREATE INDEX IF NOT EXISTS idx_similar_similar_poi_id ON l1_poi_similarities(similar_poi_id);
CREATE INDEX IF NOT EXISTS idx_similarity_score ON l1_poi_similarities(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_expires_at ON l1_poi_similarities(expires_at);
CREATE INDEX IF NOT EXISTS idx_similar_computed ON l1_poi_similarities(computed_at DESC);

-- 3. 建立相似度統計視圖
CREATE OR REPLACE VIEW v_l1_similarity_statistics AS
SELECT
    p.id as poi_id,
    p.name as poi_name,
    p.category,
    COUNT(s.id) as similar_count,
    ROUND(AVG(s.similarity_score)::numeric, 3) as avg_similarity,
    ROUND(MAX(s.similarity_score)::numeric, 3) as max_similarity,
    ROUND(MIN(s.similarity_score)::numeric, 3) as min_similarity,
    MIN(s.expires_at) as expires_at
FROM l1_places p
LEFT JOIN l1_poi_similarities s ON p.id = s.poi_id AND s.expires_at > NOW()
GROUP BY p.id, p.name, p.category;

-- 4. 建立預計算任務追蹤表
CREATE TABLE IF NOT EXISTS l1_similarity_job_log (
    id BIGSERIAL PRIMARY KEY,
    job_id VARCHAR(32) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(32) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    pois_processed INT DEFAULT 0,
    similarities_inserted INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 建立任務追蹤索引
CREATE INDEX IF NOT EXISTS idx_job_log_status ON l1_similarity_job_log(status);
CREATE INDEX IF NOT EXISTS idx_job_log_started ON l1_similarity_job_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_log_job_id ON l1_similarity_job_log(job_id);

-- 6. 建立相似 POI 查詢視圖（排除過期的）
CREATE OR REPLACE VIEW v_l1_similar_pois AS
SELECT
    s.poi_id,
    p1.name as poi_name,
    s.similar_poi_id,
    p2.name as similar_name,
    p2.category as similar_category,
    p2.location as similar_location,
    s.similarity_score,
    s.common_tags,
    s.recommendation_reason,
    s.computed_at
FROM l1_poi_similarities s
JOIN l1_places p1 ON s.poi_id = p1.id
JOIN l1_places p2 ON s.similar_poi_id = p2.id
WHERE s.expires_at > NOW()
ORDER BY s.poi_id, s.similarity_score DESC;

-- 7. 建立相似度分布統計視圖
CREATE OR REPLACE VIEW v_l1_similarity_distribution AS
SELECT
    '0.4-0.5' as range,
    COUNT(*) as count
FROM l1_poi_similarities
WHERE similarity_score >= 0.4 AND similarity_score < 0.5 AND expires_at > NOW()
UNION ALL
SELECT
    '0.5-0.6' as range,
    COUNT(*) as count
FROM l1_poi_similarities
WHERE similarity_score >= 0.5 AND similarity_score < 0.6 AND expires_at > NOW()
UNION ALL
SELECT
    '0.6-0.7' as range,
    COUNT(*) as count
FROM l1_poi_similarities
WHERE similarity_score >= 0.6 AND similarity_score < 0.7 AND expires_at > NOW()
UNION ALL
SELECT
    '0.7-0.8' as range,
    COUNT(*) as count
FROM l1_poi_similarities
WHERE similarity_score >= 0.7 AND similarity_score < 0.8 AND expires_at > NOW()
UNION ALL
SELECT
    '0.8-0.9' as range,
    COUNT(*) as count
FROM l1_poi_similarities
WHERE similarity_score >= 0.8 AND similarity_score < 0.9 AND expires_at > NOW()
UNION ALL
SELECT
    '0.9-1.0' as range,
    COUNT(*) as count
FROM l1_poi_similarities
WHERE similarity_score >= 0.9 AND similarity_score <= 1.0 AND expires_at > NOW();

-- 8. 建立相似 POI 獲取函數
CREATE OR REPLACE FUNCTION get_similar_pois(
    p_poi_id VARCHAR(64),
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    similar_poi_id VARCHAR(64),
    name TEXT,
    category TEXT,
    location TEXT,
    similarity_score DECIMAL(4,3),
    common_tags TEXT[],
    recommendation_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.similar_poi_id,
        p.name,
        p.category,
        p.location,
        s.similarity_score,
        s.common_tags,
        s.recommendation_reason
    FROM l1_poi_similarities s
    JOIN l1_places p ON s.similar_poi_id = p.id
    WHERE s.poi_id = p_poi_id
    AND s.expires_at > NOW()
    ORDER BY s.similarity_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 9. 建立相似度過期清理函數
CREATE OR REPLACE FUNCTION cleanup_expired_similarities()
RETURNS BIGINT AS $$
DECLARE
    v_count BIGINT;
BEGIN
    DELETE FROM l1_poi_similarities
    WHERE expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 10. 建立標籤更新觸發器（當 POI 標籤更新時重新計算相似度）
CREATE OR REPLACE FUNCTION trigger_similarity_recompute()
RETURNS TRIGGER AS $$
BEGIN
    -- 標記該 POI 的現有相似度為過期
    UPDATE l1_poi_similarities
    SET expires_at = NOW()
    WHERE poi_id = NEW.id OR similar_poi_id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- COMMENT ON TRIGGER trigger_similarity_recompute ON l1_places
--     IS 'Triggers similarity recomputation when POI tags are updated';

-- 11. 建立相似度更新函數（手動觸發）
CREATE OR REPLACE FUNCTION recompute_poi_similarities(p_poi_id VARCHAR(64))
RETURNS INT AS $$
DECLARE
    v_count INT := 0;
BEGIN
    -- 標記現有相似度為過期
    UPDATE l1_poi_similarities
    SET expires_at = NOW()
    WHERE poi_id = p_poi_id;

    -- 返回需要重新計算的數量（供應用程式使用）
    SELECT COUNT(*) INTO v_count
    FROM l1_places
    WHERE id != p_poi_id
    AND id NOT IN (SELECT similar_poi_id FROM l1_poi_similarities WHERE poi_id = p_poi_id AND expires_at > NOW());

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 12. 建立定期任務記錄函數
CREATE OR REPLACE FUNCTION log_similarity_job(
    p_job_id VARCHAR(32),
    p_status VARCHAR(32),
    p_stats JSONB DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_id BIGINT;
BEGIN
    INSERT INTO l1_similarity_job_log (
        job_id, status, pois_processed, similarities_inserted, error_message
    ) VALUES (
        p_job_id,
        p_status,
        (p_stats->>'processed')::INT,
        (p_stats->>'inserted')::INT,
        p_stats->>'error'
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 13. 建立相似度統計儀表板函數
CREATE OR REPLACE FUNCTION get_similarity_dashboard()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_pois', (SELECT COUNT(*) FROM l1_places),
        'pois_with_similarities', (SELECT COUNT(DISTINCT poi_id) FROM l1_poi_similarities WHERE expires_at > NOW()),
        'total_similarities', (SELECT COUNT(*) FROM l1_poi_similarities WHERE expires_at > NOW()),
        'avg_similarity', (SELECT ROUND(AVG(similarity_score)::numeric, 3) FROM l1_poi_similarities WHERE expires_at > NOW()),
        'high_similarity_count', (SELECT COUNT(*) FROM l1_poi_similarities WHERE similarity_score >= 0.7 AND expires_at > NOW()),
        'expiring_soon', (SELECT COUNT(*) FROM l1_poi_similarities WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '1 day'),
        'last_job', (SELECT jsonb_build_object(
            'job_id', job_id,
            'status', status,
            'pois_processed', pois_processed,
            'similarities_inserted', similarities_inserted,
            'started_at', started_at
        ) FROM l1_similarity_job_log ORDER BY started_at DESC LIMIT 1)
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 印出遷移完成訊息
DO $$
BEGIN
    RAISE NOTICE 'Phase 3: Similarity Precomputation Migration completed successfully';
    RAISE NOTICE 'Tables created: l1_poi_similarities, l1_similarity_job_log';
    RAISE NOTICE 'Views created: v_l1_similarity_statistics, v_l1_similar_pois, v_l1_similarity_distribution';
    RAISE NOTICE 'Functions created: get_similar_pois, cleanup_expired_similarities, recompute_poi_similarities, get_similarity_dashboard';
END $$;
