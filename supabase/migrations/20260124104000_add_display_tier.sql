-- Add display control columns to nodes table
ALTER TABLE nodes 
ADD COLUMN IF NOT EXISTS display_tier INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS min_zoom_level INTEGER DEFAULT 16,
ADD COLUMN IF NOT EXISTS daily_passengers INTEGER,
ADD COLUMN IF NOT EXISTS brand_color TEXT,
ADD COLUMN IF NOT EXISTS primary_operator TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_nodes_display_tier ON nodes(display_tier);
CREATE INDEX IF NOT EXISTS idx_nodes_zoom_level ON nodes(min_zoom_level);

-- Comment on columns
COMMENT ON COLUMN nodes.display_tier IS '1=Super Hub (Always), 2=Major Hub (z12+), 3=Minor Hub (z14+), 4=Regular (z15+), 5=Local (z16+)';
COMMENT ON COLUMN nodes.min_zoom_level IS 'Minimum zoom level required to show this node';
