DO $$
DECLARE
    r RECORD;
    new_id TEXT;
BEGIN
    FOR r IN SELECT id FROM nodes WHERE id LIKE 'odpt.Station:%' LOOP
        -- For 2-part IDs specifically
        new_id := regexp_replace(r.id, '^odpt\.Station:([^.]+)\.([^.]+)$', 'odpt:Station:\1.\2');

        IF new_id != r.id AND new_id LIKE 'odpt:Station:%' THEN
            -- Check existence
            PERFORM 1 FROM nodes WHERE id = new_id;
            IF NOT FOUND THEN
               UPDATE nodes SET id = new_id WHERE id = r.id;

               -- Updates for members
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

            ELSE
               RAISE WARNING 'Collision % -> %', r.id, new_id;
            END IF;
        END IF;
    END LOOP;
END $$;
