-- P2-2: Real-time Sync Mechanism
-- 當 nodes 表變更時自動同步 hub_station_members

-- 1. 建立同步函數
CREATE OR REPLACE FUNCTION sync_hub_station_members()
RETURNS TRIGGER AS $$
BEGIN
    -- 處理 INSERT 或 UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- 如果節點有 parent_hub_id，則添加到 hub_station_members
        IF NEW.parent_hub_id IS NOT NULL THEN
            INSERT INTO hub_station_members (hub_id, member_id, operator)
            VALUES (
                NEW.parent_hub_id,
                NEW.id,
                CASE 
                    WHEN NEW.id LIKE '%TokyoMetro%' THEN 'TokyoMetro'
                    WHEN NEW.id LIKE '%Toei%' THEN 'Toei'
                    WHEN NEW.id LIKE '%JR-East%' THEN 'JR-East'
                    ELSE 'Private'
                END
            )
            ON CONFLICT (hub_id, member_id) DO NOTHING;
        END IF;
        
        -- 如果節點是 Hub (is_hub = true)，確保自己也在成員列表中
        IF NEW.is_hub = true THEN
            INSERT INTO hub_station_members (hub_id, member_id, operator)
            VALUES (
                NEW.id,
                NEW.id,
                CASE 
                    WHEN NEW.id LIKE '%TokyoMetro%' THEN 'TokyoMetro'
                    WHEN NEW.id LIKE '%Toei%' THEN 'Toei'
                    WHEN NEW.id LIKE '%JR-East%' THEN 'JR-East'
                    ELSE 'Private'
                END
            )
            ON CONFLICT (hub_id, member_id) DO NOTHING;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- 處理 DELETE
    IF TG_OP = 'DELETE' THEN
        -- 刪除該節點的所有成員關係
        DELETE FROM hub_station_members WHERE member_id = OLD.id;
        DELETE FROM hub_station_members WHERE hub_id = OLD.id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. 建立 Trigger
DROP TRIGGER IF EXISTS trigger_sync_hub_members ON nodes;
CREATE TRIGGER trigger_sync_hub_members
    AFTER INSERT OR UPDATE OR DELETE ON nodes
    FOR EACH ROW
    EXECUTE FUNCTION sync_hub_station_members();

-- 3. 建立 ID 變更同步函數 (當 nodes.id 改變時)
CREATE OR REPLACE FUNCTION sync_node_id_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- 當 ID 變更時，同步更新 hub_station_members
    IF OLD.id IS DISTINCT FROM NEW.id THEN
        -- 更新作為成員的記錄
        UPDATE hub_station_members SET member_id = NEW.id WHERE member_id = OLD.id;
        -- 更新作為 Hub 的記錄
        UPDATE hub_station_members SET hub_id = NEW.id WHERE hub_id = OLD.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_node_id ON nodes;
CREATE TRIGGER trigger_sync_node_id
    AFTER UPDATE OF id ON nodes
    FOR EACH ROW
    EXECUTE FUNCTION sync_node_id_changes();

-- 4. 通知函數 (可選：用於 Supabase Realtime)
CREATE OR REPLACE FUNCTION notify_node_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('node_changes', json_build_object(
        'operation', TG_OP,
        'node_id', COALESCE(NEW.id, OLD.id),
        'timestamp', now()
    )::text);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_node_change ON nodes;
CREATE TRIGGER trigger_notify_node_change
    AFTER INSERT OR UPDATE OR DELETE ON nodes
    FOR EACH ROW
    EXECUTE FUNCTION notify_node_change();

COMMENT ON FUNCTION sync_hub_station_members() IS 'P2-2: 自動同步 Hub 成員關係';
COMMENT ON FUNCTION sync_node_id_changes() IS 'P2-2: 處理節點 ID 變更時的級聯同步';
COMMENT ON FUNCTION notify_node_change() IS 'P2-2: 發送節點變更通知供 Realtime 訂閱';
