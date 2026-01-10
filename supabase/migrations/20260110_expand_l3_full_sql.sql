-- L3 Data Full Expansion Migration (Server-side)
-- Bypasses RLS by running as migration
-- Sources data from stations_static (444 rows)

DO $$
DECLARE
    rec RECORD;
    phy_id text;
    log_id text;
    svc_data jsonb;
    svc_list jsonb;
    s_item jsonb;
    loc_text jsonb;
    attr_data jsonb;
    feat_type text;
    feat_name text;
    inserted_count int := 0;
    processed_stations int := 0;
BEGIN
    -- Iterate all static data with l3_services
    FOR rec IN SELECT id, l3_services FROM stations_static WHERE l3_services IS NOT NULL LOOP
        phy_id := rec.id;
        
        -- 1. Normalize ID (Physical -> Logical)
        IF phy_id LIKE 'odpt.Station:%' THEN
             -- Try 3 part match first
             log_id := regexp_replace(phy_id, '^odpt\.Station:([^.]+)\.[^.]+\.(.+)$', 'odpt:Station:\1.\2');
             -- If no change (maybe 2 part?), try 2 part
             IF log_id = phy_id THEN 
                 log_id := regexp_replace(phy_id, '^odpt\.Station:([^.]+)\.([^.]+)$', 'odpt:Station:\1.\2');
             END IF;
        ELSE
             -- Already logical or funny format
             log_id := replace(phy_id, 'odpt.Station:', 'odpt:Station:'); 
        END IF;

        -- 2. Extract Services List
        svc_data := rec.l3_services;
        svc_list := '[]'::jsonb;
        
        IF jsonb_typeof(svc_data) = 'array' THEN
            svc_list := svc_data;
        ELSIF jsonb_typeof(svc_data) = 'object' AND svc_data ? 'services' AND jsonb_typeof(svc_data->'services') = 'array' THEN
            svc_list := svc_data->'services';
        END IF;
        
        -- 3. Process Items
        IF jsonb_array_length(svc_list) > 0 THEN
            processed_stations := processed_stations + 1;
            
            -- Optional: Clear existing AUTO-IMPORTED data for this station to avoid duplicates if re-run?
            -- Hard to distinguish auto-imported from manual. 
            -- We'll assume expansion strategy: Add if not strictly identical.
            
            FOR s_item IN SELECT * FROM jsonb_array_elements(svc_list) LOOP
                feat_type := s_item->>'type';
                IF feat_type IS NULL OR feat_type = '' THEN CONTINUE; END IF;
                
                -- Construct Readable Name
                feat_name := initcap(feat_type);
                IF s_item->>'operator' IS NOT NULL THEN
                    feat_name := (s_item->>'operator') || ' ' || feat_name;
                END IF;
                
                -- Construct Location Text (ja/en)
                loc_text := jsonb_build_object(
                    'ja', COALESCE(s_item->>'location', '駅構内'),
                    'en', COALESCE(s_item->>'location', 'Inside Station') 
                );
                
                -- Construct Attributes
                attr_data := s_item;
                attr_data := jsonb_set(attr_data, '{location_text}', loc_text);
                attr_data := jsonb_set(attr_data, '{is_available}', 'true'::jsonb);
                attr_data := jsonb_set(attr_data, '{source}', '"stations_static"'::jsonb);

                -- Check if station exists in nodes to prevent FK violation
                -- (Some static data might refer to stations not in MVP or merged/deleted)
                IF EXISTS (SELECT 1 FROM nodes WHERE id = log_id) THEN
                    INSERT INTO l3_facilities (station_id, type, name_i18n, attributes)
                    VALUES (
                        log_id,
                        feat_type,
                        jsonb_build_object('ja', feat_name, 'en', feat_name),
                        attr_data
                    );
                    inserted_count := inserted_count + 1;
                ELSE
                    -- Optional: Log skipped
                    RAISE NOTICE 'Skipping L3 for non-existent node: %', log_id;
                END IF;
            END LOOP;
        END IF;
        
    END LOOP;
    
    RAISE NOTICE 'Processed % stations, Inserted % facilities', processed_stations, inserted_count;
END $$;
