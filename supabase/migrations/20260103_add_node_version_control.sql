-- =============================================================================
-- Node Version Control System
-- Created: 2026-01-03
-- Purpose: Add version control to nodes for cache invalidation and data consistency
-- =============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS dedupe_nodes_by_version(nodes_data[]);

-- =============================================================================
-- Add version columns to nodes table (if not exists)
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'nodes' AND column_name = 'version'
    ) THEN
        ALTER TABLE nodes ADD COLUMN version INTEGER DEFAULT 1;
        RAISE NOTICE 'Added version column to nodes table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'nodes' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE nodes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to nodes table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'nodes' AND column_name = 'data_hash'
    ) THEN
        ALTER TABLE nodes ADD COLUMN data_hash TEXT; -- SHA-256 hash of node data for change detection
        RAISE NOTICE 'Added data_hash column to nodes table';
    END IF;
END $$;

-- =============================================================================
-- Create trigger to auto-update version and timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION update_node_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();

    -- Auto-increment version on update
    IF OLD.version IS NULL THEN
        NEW.version = 1;
    ELSE
        NEW.version = OLD.version + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS trigger_node_version_update ON nodes;

CREATE TRIGGER trigger_node_version_update
    BEFORE UPDATE ON nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_node_version();

-- =============================================================================
-- Helper function to deduplicate nodes by version
-- Returns the most recent version for each node ID
-- =============================================================================
CREATE OR REPLACE FUNCTION dedupe_nodes_by_version(input_nodes JSONB)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '[]'::JSONB;
    node_record RECORD;
    current_id TEXT;
    latest_node JSONB;
BEGIN
    -- Process each node in the input array
    FOR node_record IN SELECT * FROM jsonb_array_elements(input_nodes) AS node
    LOOP
        current_id := node_record.node ->> 'id';

        -- Check if we already have this node in result
        IF (result -> 0 IS NULL) OR NOT (
            SELECT COUNT(*) > 0
            FROM jsonb_array_elements(result) AS existing
            WHERE existing ->> 'id' = current_id
        ) THEN
            -- First time seeing this ID, add to result
            result := result || node_record.node;
        ELSE
            -- Already have this ID, check version
            SELECT jsonb_agg(node) INTO latest_node
            FROM jsonb_array_elements(result) AS node
            WHERE node ->> 'id' = current_id;

            -- If new node has higher version, replace
            IF (node_record.node ->> 'version')::INT > (latest_node -> 0 ->> 'version')::INT THEN
                result := (
                    SELECT jsonb_agg(
                        CASE WHEN node ->> 'id' = current_id THEN node_record.node ELSE node END
                    )
                    FROM jsonb_array_elements(result) AS node
                );
            ELSIF (node_record.node ->> 'version')::INT = (latest_node -> 0 ->> 'version')::INT THEN
                -- Same version, prefer newer updated_at
                IF (node_record.node ->> 'updated_at') > (latest_node -> 0 ->> 'updated_at') THEN
                    result := (
                        SELECT jsonb_agg(
                            CASE WHEN node ->> 'id' = current_id THEN node_record.node ELSE node END
                        )
                        FROM jsonb_array_elements(result) AS node
                    );
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Function to get node change history
-- =============================================================================
CREATE OR REPLACE FUNCTION get_node_history(p_node_id VARCHAR, p_limit INT DEFAULT 10)
RETURNS TABLE (
    version INT,
    updated_at TIMESTAMPTZ,
    data_snapshot JSONB,
    change_summary TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.version,
        n.updated_at,
        to_jsonb(n) AS data_snapshot,
        'Updated node data' AS change_summary
    FROM nodes n
    WHERE n.id = p_node_id
    ORDER BY n.version DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Function to detect if node data has changed (compare data_hash)
-- =============================================================================
CREATE OR REPLACE FUNCTION check_node_changed(p_node_id VARCHAR, p_data_hash TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_hash TEXT;
BEGIN
    SELECT data_hash INTO v_current_hash
    FROM nodes WHERE id = p_node_id;

    -- If no hash stored or hash differs, data has changed
    RETURN v_current_hash IS NULL OR v_current_hash != p_data_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Function to update node data hash
-- =============================================================================
CREATE OR REPLACE FUNCTION update_node_hash(p_node_id VARCHAR, p_data_hash TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE nodes
    SET data_hash = p_data_hash,
        version = COALESCE(version, 0) + 1,
        updated_at = NOW()
    WHERE id = p_node_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Create index for faster version lookups
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_nodes_version ON nodes(version);
CREATE INDEX IF NOT EXISTS idx_nodes_updated_at ON nodes(updated_at);
CREATE INDEX IF NOT EXISTS idx_nodes_data_hash ON nodes(data_hash);

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON TABLE nodes IS 'Tokyo 23 wards station nodes with version control';
COMMENT ON COLUMN nodes.version IS 'Incremental version number for cache invalidation';
COMMENT ON COLUMN nodes.updated_at IS 'Timestamp of last update';
COMMENT ON COLUMN nodes.data_hash IS 'SHA-256 hash of node data for change detection';
COMMENT ON FUNCTION dedupe_nodes_by_version(JSONB) IS 'Deduplicate nodes array, keeping only the most recent version per node ID';
COMMENT ON FUNCTION get_node_history(VARCHAR, INT) IS 'Get version history for a specific node';

-- Done
DO $$
BEGIN
    RAISE NOTICE '✅ Node version control system created!';
    RAISE NOTICE '✅ Columns added: version, updated_at, data_hash';
    RAISE NOTICE '✅ Functions: dedupe_nodes_by_version, get_node_history, check_node_changed, update_node_hash';
    RAISE NOTICE '✅ Trigger: trigger_node_version_update (auto-increment version on update)';
END;
$$;
