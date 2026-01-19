-- Enhanced L4 Knowledge Base with Node and Tag Integration
-- Integrates nodes and tags for more efficient AI knowledge retrieval
-- Generated: 2026-01-03

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create enhanced L4 knowledge table with node/tag relationships
CREATE TABLE IF NOT EXISTS public.l4_knowledge_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core content
    knowledge_type TEXT NOT NULL, -- 'railway', 'hub_station', 'accessibility', 'special_location', 'pass', 'crowd'
    title JSONB DEFAULT '{}'::jsonb, -- Multi-lingual title
    content TEXT NOT NULL, -- The actual knowledge tip/advice
    icon TEXT, -- Emoji icon for display

    -- Node relationship (for node-specific knowledge)
    node_id TEXT REFERENCES public.nodes(id) ON DELETE CASCADE, -- Direct node reference
    node_vibe JSONB DEFAULT '[]'::jsonb, -- Node vibes for filtering ['culture', 'geek', 'luxury', etc.]

    -- Tag relationship (for tag-based knowledge)
    tag_category JSONB DEFAULT '[]'::jsonb, -- Main categories ['leisure', 'shopping', 'dining', 'service']
    tag_subcategory JSONB DEFAULT '[]'::jsonb, -- Sub categories ['nature', 'culture', 'market', 'cafe']
    tag_detail JSONB DEFAULT '[]'::jsonb, -- Detail categories ['park', 'museum', 'souvenir']

    -- Classification
    category TEXT, -- 'warning', 'tip', 'pass', 'accessibility', 'crowd', 'facility', 'transfer', 'tourist', 'shopping'
    subcategory TEXT, -- For finer classification

    -- Context tags for filtering
    time_context JSONB DEFAULT '[]'::jsonb, -- ['weekday-morning', 'weekday-evening', 'weekend', 'holiday']
    user_context JSONB DEFAULT '[]'::jsonb, -- ['wheelchair', 'stroller', 'largeLuggage', 'vision', 'senior', 'general']
    ward_context JSONB DEFAULT '[]'::jsonb, -- ['新宿區', '港區', etc.]

    -- Importance and filtering
    importance INT DEFAULT 5, -- 1-10, higher = more important
    relevance_weight FLOAT DEFAULT 1.0, -- Weight for ranking

    -- Vector embedding (768 dimensions - Gemini standard)
    embedding vector(768),

    -- Metadata
    source TEXT DEFAULT 'expertKnowledgeBase', -- Data source reference
    confidence FLOAT DEFAULT 1.0, -- Confidence score
    language TEXT DEFAULT 'zh-TW', -- Primary language
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.l4_knowledge_v2 ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.l4_knowledge_v2
    FOR SELECT USING (true);

CREATE POLICY "Enable insert/update for service role only" ON public.l4_knowledge_v2
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_l4v2_knowledge_type ON public.l4_knowledge_v2(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_l4v2_node_id ON public.l4_knowledge_v2(node_id);
CREATE INDEX IF NOT EXISTS idx_l4v2_node_vibe ON public.l4_knowledge_v2 USING GIN(node_vibe);
CREATE INDEX IF NOT EXISTS idx_l4v2_tag_category ON public.l4_knowledge_v2 USING GIN(tag_category);
CREATE INDEX IF NOT EXISTS idx_l4v2_tag_subcategory ON public.l4_knowledge_v2 USING GIN(tag_subcategory);
CREATE INDEX IF NOT EXISTS idx_l4v2_category ON public.l4_knowledge_v2(category);
CREATE INDEX IF NOT EXISTS idx_l4v2_user_context ON public.l4_knowledge_v2 USING GIN(user_context);
CREATE INDEX IF NOT EXISTS idx_l4v2_importance ON public.l4_knowledge_v2(importance DESC);

-- Create HNSW index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_l4v2_embedding_hnsw ON public.l4_knowledge_v2
USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- ADVANCED SEARCH FUNCTIONS
-- ============================================================

-- Function 1: Search knowledge by node ID with vibe matching
CREATE OR REPLACE FUNCTION search_knowledge_by_node(
    p_node_id text,
    p_query_embedding vector(768),
    p_match_threshold float default 0.5,
    p_match_count int default 5,
    p_user_context text[] default null,
    p_time_context text default null
)
RETURNS TABLE (
    id uuid,
    knowledge_type text,
    title jsonb,
    content text,
    icon text,
    category text,
    tag_category jsonb,
    tag_subcategory jsonb,
    importance int,
    relevance_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        k.id,
        k.knowledge_type,
        k.title,
        k.content,
        k.icon,
        k.category,
        k.tag_category,
        k.tag_subcategory,
        k.importance,
        -- Calculate relevance score
        (1 - (k.embedding <=> p_query_embedding)) * k.relevance_weight +
        CASE WHEN p_user_context IS NOT NULL AND k.user_context @> to_jsonb(p_user_context) THEN 0.2 ELSE 0.0 END +
        CASE WHEN p_time_context IS NOT NULL AND k.time_context @> to_jsonb(ARRAY[p_time_context]) THEN 0.1 ELSE 0.0 END +
        (k.importance::float / 10.0) * 0.2 AS relevance_score
    FROM public.l4_knowledge_v2 k
    WHERE
        (k.node_id = p_node_id OR k.node_id IS NULL)
        AND (p_user_context IS NULL OR k.user_context @> to_jsonb(p_user_context))
        AND (p_time_context IS NULL OR k.time_context @> to_jsonb(ARRAY[p_time_context]))
        AND 1 - (k.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY relevance_score DESC
    LIMIT p_match_count;
END;
$$;

-- Function 2: Search knowledge by tag category (e.g., shopping, dining)
CREATE OR REPLACE FUNCTION search_knowledge_by_tag(
    p_tag_category text[],
    p_tag_subcategory text[] default null,
    p_node_vibe text[] default null,
    p_query_embedding vector(768),
    p_match_threshold float default 0.5,
    p_match_count int default 5
)
RETURNS TABLE (
    id uuid,
    knowledge_type text,
    title jsonb,
    content text,
    icon text,
    category text,
    node_id text,
    node_vibe jsonb,
    relevance_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        k.id,
        k.knowledge_type,
        k.title,
        k.content,
        k.icon,
        k.category,
        k.node_id,
        k.node_vibe,
        (1 - (k.embedding <=> p_query_embedding)) AS relevance_score
    FROM public.l4_knowledge_v2 k
    WHERE
        k.tag_category @> to_jsonb(p_tag_category)
        AND (p_tag_subcategory IS NULL OR k.tag_subcategory @> to_jsonb(p_tag_subcategory))
        AND (p_node_vibe IS NULL OR k.node_vibe && to_jsonb(p_node_vibe))
        AND 1 - (k.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY relevance_score DESC, k.importance DESC
    LIMIT p_match_count;
END;
$$;

-- Function 3: Get contextual knowledge for a node (combines all filters)
CREATE OR REPLACE FUNCTION get_contextual_knowledge(
    p_node_id text,
    p_user_context text[],
    p_time_context text,
    p_tag_focus text[] default null, -- Focus on specific tags
    p_max_results int default 5
)
RETURNS TABLE (
    id uuid,
    knowledge_type text,
    content text,
    icon text,
    category text,
    tag_category jsonb,
    importance int,
    context_relevance float
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_node record;
BEGIN
    -- Get node info for vibe matching
    SELECT * INTO v_node FROM public.nodes WHERE id = p_node_id LIMIT 1;

    RETURN QUERY
    SELECT
        k.id,
        k.knowledge_type,
        k.content,
        k.icon,
        k.category,
        k.tag_category,
        k.importance,
        -- Calculate contextual relevance
        (CASE WHEN k.node_id = p_node_id THEN 0.3 ELSE 0.0 END) +
        (CASE WHEN v_node.vibe_tags IS NOT NULL AND k.node_vibe && v_node.vibe_tags THEN 0.2 ELSE 0.0 END) +
        (CASE WHEN p_user_context IS NOT NULL AND k.user_context @> to_jsonb(p_user_context) THEN 0.2 ELSE 0.0 END) +
        (CASE WHEN p_time_context IS NOT NULL AND k.time_context @> to_jsonb(ARRAY[p_time_context]) THEN 0.1 ELSE 0.0 END) +
        (CASE WHEN p_tag_focus IS NOT NULL AND k.tag_category && to_jsonb(p_tag_focus) THEN 0.2 ELSE 0.0 END) +
        (k.importance::float / 10.0) * 0.1 AS context_relevance
    FROM public.l4_knowledge_v2 k
    WHERE
        (k.node_id = p_node_id OR k.node_id IS NULL)
        AND (p_tag_focus IS NULL OR k.tag_category && to_jsonb(p_tag_focus))
        AND (p_user_context IS NULL OR k.user_context @> to_jsonb(p_user_context))
        AND (p_time_context IS NULL OR k.time_context @> to_jsonb(ARRAY[p_time_context]))
    ORDER BY context_relevance DESC, k.importance DESC
    LIMIT p_max_results;
END;
$$;

-- Function 4: Get related knowledge based on facility tags
CREATE OR REPLACE FUNCTION get_knowledge_by_facility_tags(
    p_main_category text,
    p_sub_category text default null,
    p_detail_category text default null,
    p_radius_meters int default 500,
    p_location point default null
)
RETURNS TABLE (
    id uuid,
    knowledge_type text,
    content text,
    icon text,
    category text,
    distance_meters float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        k.id,
        k.knowledge_type,
        k.content,
        k.icon,
        k.category,
        0.0 AS distance_meters
    FROM public.l4_knowledge_v2 k
    WHERE
        k.tag_category @> to_jsonb(ARRAY[p_main_category])
        AND (p_sub_category IS NULL OR k.tag_subcategory @> to_jsonb(ARRAY[p_sub_category]))
        AND (p_detail_category IS NULL OR k.tag_detail @> to_jsonb(ARRAY[p_detail_category]))
    ORDER BY k.importance DESC
    LIMIT 10;
END;
$$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION search_knowledge_by_node TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_knowledge_by_tag TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_contextual_knowledge TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_knowledge_by_facility_tags TO anon, authenticated;

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE public.l4_knowledge_v2 IS 'Enhanced L4 Knowledge with Node/Tag relationships for efficient AI retrieval';
COMMENT ON FUNCTION search_knowledge_by_node IS 'Search knowledge by node with vibe and context matching';
COMMENT ON FUNCTION search_knowledge_by_tag IS 'Search knowledge by facility tag categories';
COMMENT ON FUNCTION get_contextual_knowledge IS 'Get contextual knowledge for a node with user/time/tag filters';
COMMENT ON FUNCTION get_knowledge_by_facility_tags IS 'Get knowledge related to specific facility tags';
