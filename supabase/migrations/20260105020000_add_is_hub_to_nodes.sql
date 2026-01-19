-- Add is_hub column to nodes table to support explicit hub definition
-- This allows a node to be a hub even if it has a parent (e.g. major interchange within a larger complex)
-- or to be a non-hub even if it has no parent (e.g. small standalone bus stop)

ALTER TABLE nodes ADD COLUMN IF NOT EXISTS is_hub BOOLEAN DEFAULT false;

-- Update existing records based on the current logic to ensure data consistency
-- Logic: If parent_hub_id is NULL, it is likely a Hub (default assumption)
UPDATE nodes
SET is_hub = true
WHERE parent_hub_id IS NULL;

UPDATE nodes
SET is_hub = false
WHERE parent_hub_id IS NOT NULL;

-- Create an index for performance as this will be frequently queried in Viewport API
CREATE INDEX IF NOT EXISTS idx_nodes_is_hub ON nodes(is_hub);

-- Comment on column
COMMENT ON COLUMN nodes.is_hub IS 'Explicit flag to identify if this node is a transport hub. Prioritized over parent_hub_id logic.';
