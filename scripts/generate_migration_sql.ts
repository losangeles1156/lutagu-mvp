/**
 * Migrate Node IDs
 *
 * 將 nodes 表中的物理 ID 格式遷移為邏輯 ID 格式
 * 由於 FK 約束已設為 CASCADE，更新 nodes.id 會自動更新關聯表
 *
 * 步驟：
 * 1. 讀取所有物理 ID 格式的節點
 * 2. 轉換為邏輯 ID
 * 3. 檢查邏輯 ID 是否衝突（應該不會，但需防禦性檢查）
 * 4. 執行 UPDATE
 * 5. 手動更新 hub_station_members（因為無 FK）
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { normalizeToLogicalId } from '../src/lib/nodes/nodeIdNormalizer';

// dotenv.config({ path: '.env.local' }); // 移除，改為生成 SQL，避免 env 問題

async function main() {
    console.log('-- Auto-generated migration to migrate node_ids to logical format');

    // 這裡我們需要真實的 DB 數據來生成 UPDATE 語句
    // 由於無法連接 DB，我們將生成一個通用的 SQL 塊，
    // 或者我們需要先查詢數據。

    // 鑑於環境限制，最好的方法是寫一個能直接在 Supabase SQL Editor 運行的 PL/pgSQL 腳本？
    // 或者，我們可以查詢一次數據，然後生成 SQL。
    // 使用 auditNodeData 類似的查詢方式 (mcp_supabase-mcp-server_execute_sql)
}

// 由於無法直接執行，我將生成一個從 nodes 表讀取並更新的腳本。
// 但如果是生成 SQL 文件，我無法遍歷所有行。
//
// 替代方案：寫一個 SQL 腳本使用 PL/pgSQL 遊標進行遷移。
// 這樣不需要本地腳本與數據庫交互。

const sql = `
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
        -- r.id ~ '^odpt\.Station:([^.]+)\.([^.]+)\.(.+)$'

        new_id := regexp_replace(r.id, '^odpt\.Station:([^.]+)\.[^.]+\.(.+)$', 'odpt:Station:\\1.\\2');

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
        new_id := regexp_replace(r.id, '^odpt.Station:([^.]+)\\.([^.]+)$', 'odpt:Station:\\1.\\2');

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
`;

console.log(sql);
