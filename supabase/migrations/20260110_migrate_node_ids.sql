
DO $$
DECLARE
    r RECORD;
    new_id TEXT;
    collision_check TEXT;
    updated_count INTEGER := 0;
BEGIN
    FOR r IN SELECT id FROM nodes WHERE id LIKE 'odpt.Station:%' LOOP
        -- 轉換邏輯：簡單的正則替換
        -- odpt.Station:Operator.Line.StationName -> odpt:Station:Operator.StationName
        -- 這裡的邏輯需要與 normalizeToLogicalId 保持一致

        -- 提取部分
        -- 假設格式總是 odpt.Station:Operator.Line.Name
        -- 我們可以用 split_part

        -- Operator: split_part(substring(r.id, 14), '.', 1)
        -- StationName: split_part(r.id, '.', 4) -- 假設 . 分隔
        -- 這種字串處理在 SQL 比較脆弱。

        -- 讓我們嘗試用正則表達式
        -- 捕獲 Operator 和 StationName
        -- r.id ~ '^odpt.Station:([^.]+).([^.]+).(.+)$'

        new_id := regexp_replace(r.id, '^odpt.Station:([^.]+).[^.]+.(.+)$', 'odpt:Station:\1.\2');

        -- 如果 new_id 與 old_id 不同 (確實發生了轉換)
        IF new_id != r.id AND new_id LIKE 'odpt:Station:%' THEN

            -- 檢查新 ID 是否已存在
            PERFORM 1 FROM nodes WHERE id = new_id;

            IF NOT FOUND THEN
                UPDATE nodes SET id = new_id WHERE id = r.id;

                -- 更新 hub_station_members (member_id)
                -- 如果更新導致衝突，說明目標記錄已存在，我們只需刪除舊記錄
                BEGIN
                    UPDATE hub_station_members SET member_id = new_id WHERE member_id = r.id;
                EXCEPTION WHEN unique_violation THEN
                    -- 目標已存在，刪除舊的
                    DELETE FROM hub_station_members WHERE member_id = r.id;
                END;

                -- 更新 hub_station_members (hub_id)
                BEGIN
                     UPDATE hub_station_members SET hub_id = new_id WHERE hub_id = r.id;
                EXCEPTION WHEN unique_violation THEN
                     DELETE FROM hub_station_members WHERE hub_id = r.id;
                END;

                updated_count := updated_count + 1;
            ELSE
                RAISE NOTICE 'Collision detected for % -> %, skipping', r.id, new_id;
            END IF;

        END IF;
    END LOOP;

    -- Pass 2: Handle 2-part IDs (odpt.Station:Operator.Name)
    FOR r IN SELECT id FROM nodes WHERE id LIKE 'odpt.Station:%' LOOP
        -- odpt.Station:Operator.Name -> odpt:Station:Operator.Name
        new_id := regexp_replace(r.id, '^odpt.Station:([^.]+)\.([^.]+)$', 'odpt:Station:\1.\2');

        IF new_id != r.id AND new_id LIKE 'odpt:Station:%' THEN
             -- 檢查新 ID 是否已存在
            PERFORM 1 FROM nodes WHERE id = new_id;

            IF NOT FOUND THEN
                UPDATE nodes SET id = new_id WHERE id = r.id;

                 -- Update hub_station_members (member_id)
                BEGIN
                    UPDATE hub_station_members SET member_id = new_id WHERE member_id = r.id;
                EXCEPTION WHEN unique_violation THEN
                    DELETE FROM hub_station_members WHERE member_id = r.id;
                END;

                -- Update hub_station_members (hub_id)
                BEGIN
                     UPDATE hub_station_members SET hub_id = new_id WHERE hub_id = r.id;
                EXCEPTION WHEN unique_violation THEN
                     DELETE FROM hub_station_members WHERE hub_id = r.id;
                END;

                updated_count := updated_count + 1;
            ELSE
                 -- For 2-part IDs, collision allows us to assume they are the same logical node
                 -- But we cannot merge if other fields differ.
                 -- Since P2 is about migration to Logical, if Logical exists, maybe we merge?
                 -- For now, just skip logging to avoid noise, or log as warning.
                RAISE NOTICE 'Pass 2 Collision: % -> %, skipping', r.id, new_id;
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE 'Migrated % nodes to logical IDs', updated_count;
END $$;
