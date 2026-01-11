-- Add 3-5-8 Tag Columns to L1 and L4 Tables

-- 1. Add columns to l1_places
ALTER TABLE l1_places ADD COLUMN IF NOT EXISTS tags_core TEXT[] DEFAULT '{}';
ALTER TABLE l1_places ADD COLUMN IF NOT EXISTS tags_intent TEXT[] DEFAULT '{}';
ALTER TABLE l1_places ADD COLUMN IF NOT EXISTS tags_visual TEXT[] DEFAULT '{}';

-- 2. Add columns to l4_knowledge_embeddings
ALTER TABLE l4_knowledge_embeddings ADD COLUMN IF NOT EXISTS tags_core TEXT[] DEFAULT '{}';
ALTER TABLE l4_knowledge_embeddings ADD COLUMN IF NOT EXISTS tags_intent TEXT[] DEFAULT '{}';

-- 3. Create GIN indexes for fast array searching
CREATE INDEX IF NOT EXISTS idx_l1_places_tags_core ON l1_places USING GIN(tags_core);
CREATE INDEX IF NOT EXISTS idx_l1_places_tags_intent ON l1_places USING GIN(tags_intent);
CREATE INDEX IF NOT EXISTS idx_l1_places_tags_visual ON l1_places USING GIN(tags_visual);

CREATE INDEX IF NOT EXISTS idx_l4_knowledge_tags_core ON l4_knowledge_embeddings USING GIN(tags_core);
CREATE INDEX IF NOT EXISTS idx_l4_knowledge_tags_intent ON l4_knowledge_embeddings USING GIN(tags_intent);

-- 4. Reload PostgREST schema (notification)
NOTIFY pgrst, 'reload schema';
