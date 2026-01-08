-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS l1_custom_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'pending', -- approved, pending, rejected
    name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
    description_i18n JSONB DEFAULT '{}'::jsonb,
    category TEXT,
    location JSONB,
    affiliate_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add New Columns
ALTER TABLE l1_custom_places
ADD COLUMN IF NOT EXISTS primary_category TEXT,
ADD COLUMN IF NOT EXISTS vibe_tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_description TEXT,
ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'::jsonb;

-- 3. Create Indexes
CREATE INDEX IF NOT EXISTS idx_l1_custom_places_vibe_tags 
ON l1_custom_places USING GIN (vibe_tags);

CREATE INDEX IF NOT EXISTS idx_l1_custom_places_keywords 
ON l1_custom_places USING GIN (keywords);

-- 4. Create Agent Context View
CREATE OR REPLACE VIEW v_l1_agent_context AS
SELECT 
    id,
    station_id,
    name_i18n,
    primary_category,
    category as subcategory,
    vibe_tags,
    ai_description,
    keywords,
    location
FROM l1_custom_places
WHERE is_active = true 
  AND status = 'approved'
ORDER BY priority DESC;
