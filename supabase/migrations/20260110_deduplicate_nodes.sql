DO $$
DECLARE
    r RECORD;
    new_id TEXT;
BEGIN
    FOR r IN SELECT id FROM nodes WHERE id LIKE 'odpt.Station:%' LOOP
        -- Generate Logical ID (Regular 3-part or 2-part)
        new_id := regexp_replace(r.id, '^odpt\.Station:([^.]+)\.([^.]+\.)?(.+)$', 'odpt:Station:\1.\3');
        -- Wait, my regex above for 3-part was: ^odpt.Station:([^.]+).[^.]+.(.+)$ -> \1.\2
        -- This discards the middle part (Line).
        -- For 2-part: ^odpt.Station:([^.]+)\.([^.]+)$ -> \1.\2
        -- I need a unified regex or two passes.
        -- Let's stick to the two-pass logic or just handle specific 2-part ones here since 3-part are mostly done?
        -- Actually, audit said 122 remaining. They are 2-part.
        -- But I should be robust.

        -- Try 2-part first simply
        new_id := regexp_replace(r.id, '^odpt\.Station:([^.]+)\.([^.]+)$', 'odpt:Station:\1.\2');

        -- If it didn't change (maybe it was 3-part and regex didn't match?), try 3-part
        IF new_id = r.id THEN
             new_id := regexp_replace(r.id, '^odpt\.Station:([^.]+)\.[^.]+\.(.+)$', 'odpt:Station:\1.\2');
        END IF;

        IF new_id != r.id AND new_id LIKE 'odpt:Station:%' THEN

            -- Check if Logical ID already exists
            PERFORM 1 FROM nodes WHERE id = new_id;

            IF FOUND THEN
                -- DUPLICATE DETECTED: MERGE & DELETE PHYSICAL
                -- 1. Re-link L3 Facilities
                BEGIN
                    UPDATE l3_facilities SET station_id = new_id WHERE station_id = r.id;
                EXCEPTION WHEN unique_violation THEN
                    -- If merged result causes conflict in L3 (rare but possible), we keep Logical's data
                    -- and delete Physical's L3 data
                    DELETE FROM l3_facilities WHERE station_id = r.id;
                END;

                -- 2. Re-link Hub Members (As Member)
                BEGIN
                    UPDATE hub_station_members SET member_id = new_id WHERE member_id = r.id;
                EXCEPTION WHEN unique_violation THEN
                    DELETE FROM hub_station_members WHERE member_id = r.id;
                END;

                -- 3. Re-link Hub Members (As Hub)
                BEGIN
                    UPDATE hub_station_members SET hub_id = new_id WHERE hub_id = r.id;
                EXCEPTION WHEN unique_violation THEN
                    DELETE FROM hub_station_members WHERE hub_id = r.id;
                END;

                 -- 4. Re-link nodes.parent_hub_id
                 -- parent_hub_id is simple FK updates (no unique constraint usually)
                 UPDATE nodes SET parent_hub_id = new_id WHERE parent_hub_id = r.id;

                -- 5. Delete Physical Node
                DELETE FROM nodes WHERE id = r.id;

            ELSE
                -- NO DUPLICATE: RENAME
                UPDATE nodes SET id = new_id WHERE id = r.id;

                -- Relink Hub Members (No FK)
                BEGIN
                    UPDATE hub_station_members SET member_id = new_id WHERE member_id = r.id;
                EXCEPTION WHEN unique_violation THEN
                    DELETE FROM hub_station_members WHERE member_id = r.id;
                END;
                BEGIN
                    UPDATE hub_station_members SET hub_id = new_id WHERE hub_id = r.id;
                EXCEPTION WHEN unique_violation THEN
                    DELETE FROM hub_station_members WHERE hub_id = r.id;
                END;
            END IF;

        END IF;
    END LOOP;
END $$;
