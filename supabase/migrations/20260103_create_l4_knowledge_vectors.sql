-- L4 Knowledge Base Vector Search Schema
-- Enables semantic search for L4 expert knowledge
-- Generated: 2026-01-03

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create L4 Knowledge embeddings table
CREATE TABLE IF NOT EXISTS public.l4_knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_type TEXT NOT NULL, -- 'railway', 'hub_station', 'accessibility', 'special_location', 'pass', 'crowd'
    entity_id TEXT NOT NULL, -- Station ID, Railway ID, or Category ID
    entity_name JSONB DEFAULT '{}'::jsonb, -- Multi-lingual name
    content TEXT NOT NULL, -- The actual knowledge tip/advice
    icon TEXT, -- Emoji icon for display
    category TEXT, -- For filtering: 'warning', 'tip', 'pass', 'accessibility', 'crowd', etc.
    subcategory TEXT, -- For filtering: 'transfer', 'facility', 'tourist', etc.

    -- Context tags for filtering
    time_context JSONB DEFAULT '[]'::jsonb, -- ['weekday-morning', 'weekday-evening', 'weekend', 'holiday']
    user_context JSONB DEFAULT '[]'::jsonb, -- ['wheelchair', 'stroller', 'largeLuggage', 'vision', 'senior', 'general']
    ward_context JSONB DEFAULT '[]'::jsonb, -- ['新宿區', '港區', etc.]

    -- Vector embedding (768 dimensions - Gemini standard)
    embedding vector(768),

    -- Metadata
    source TEXT DEFAULT 'expertKnowledgeBase', -- Data source reference
    confidence FLOAT DEFAULT 1.0, -- Confidence score for the knowledge
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.l4_knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.l4_knowledge_embeddings
    FOR SELECT USING (true);

CREATE POLICY "Enable insert/update for service role only" ON public.l4_knowledge_embeddings
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_l4_knowledge_type ON public.l4_knowledge_embeddings(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_l4_entity_id ON public.l4_knowledge_embeddings(entity_id);
CREATE INDEX IF NOT EXISTS idx_l4_category ON public.l4_knowledge_embeddings(category);
CREATE INDEX IF NOT EXISTS idx_l4_user_context ON public.l4_knowledge_embeddings USING GIN(user_context);

-- Create HNSW index for vector similarity search
-- Using cosine similarity for semantic search
CREATE INDEX IF NOT EXISTS idx_l4_embedding_hnsw ON public.l4_knowledge_embeddings
USING hnsw (embedding vector_cosine_ops);

-- Create function for semantic search with filters
CREATE OR REPLACE FUNCTION match_l4_knowledge (
    query_embedding vector(768),
    match_threshold float,
    match_count int,
    filter_knowledge_type text default null,
    filter_entity_id text default null,
    filter_category text default null,
    filter_user_context text[] default null,
    filter_time_context text[] default null
)
RETURNS TABLE (
    id uuid,
    knowledge_type text,
    entity_id text,
    entity_name jsonb,
    content text,
    icon text,
    category text,
    subcategory text,
    time_context jsonb,
    user_context jsonb,
    ward_context jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        l4.id,
        l4.knowledge_type,
        l4.entity_id,
        l4.entity_name,
        l4.content,
        l4.icon,
        l4.category,
        l4.subcategory,
        l4.time_context,
        l4.user_context,
        l4.ward_context,
        1 - (l4.embedding <=> query_embedding) AS similarity
    FROM public.l4_knowledge_embeddings l4
    WHERE
        -- Apply filters
        (filter_knowledge_type IS NULL OR l4.knowledge_type = filter_knowledge_type) AND
        (filter_entity_id IS NULL OR l4.entity_id = filter_entity_id) AND
        (filter_category IS NULL OR l4.category = filter_category) AND
        (filter_user_context IS NULL OR l4.user_context @> to_jsonb(filter_user_context)) AND
        (filter_time_context IS NULL OR l4.time_context @> to_jsonb(filter_time_context)) AND
        -- Similarity threshold
        1 - (l4.embedding <=> query_embedding) > match_threshold
    ORDER BY l4.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Create function to get knowledge by station with context-aware filtering
CREATE OR REPLACE FUNCTION get_station_knowledge_contextual (
    station_id text,
    user_query_embedding vector(768),
    user_context text[], -- ['wheelchair', 'largeLuggage', etc.]
    time_context text, -- 'weekday-morning', 'weekday-evening', 'weekend', 'holiday'
    max_results int default 5
)
RETURNS TABLE (
    id uuid,
    knowledge_type text,
    content text,
    icon text,
    category text,
    subcategory text,
    relevance_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH base_knowledge AS (
        -- Get knowledge directly related to this station
        SELECT
            l4.id,
            l4.knowledge_type,
            l4.content,
            l4.icon,
            l4.category,
            l4.subcategory,
            0.8 AS base_score
        FROM public.l4_knowledge_embeddings l4
        WHERE l4.entity_id = station_id

        UNION

        -- Get knowledge for the parent hub station
        SELECT
            l4.id,
            l4.knowledge_type,
            l4.content,
            l4.icon,
            l4.category,
            l4.subcategory,
            0.6 AS base_score
        FROM public.l4_knowledge_embeddings l4
        WHERE l4.entity_id LIKE '%' || split_part(station_id, '.', -1) || '%'
        AND l4.knowledge_type = 'hub_station'
    ),
    contextual_scores AS (
        SELECT
            bk.*,
            1 - (l4.embedding <=> user_query_embedding) AS semantic_score,
            -- Boost score for matching user context
            CASE
                WHEN user_context IS NOT NULL AND l4.user_context @> to_jsonb(user_context)
                THEN 0.3 ELSE 0.0
            END AS context_boost,
            -- Boost score for matching time context
            CASE
                WHEN time_context IS NOT NULL AND l4.time_context @> to_jsonb(ARRAY[time_context])
                THEN 0.1 ELSE 0.0
            END AS time_boost
        FROM base_knowledge bk
        JOIN public.l4_knowledge_embeddings l4 ON bk.id = l4.id
    )
    SELECT
        cs.id,
        cs.knowledge_type,
        cs.content,
        cs.icon,
        cs.category,
        cs.subcategory,
        (cs.base_score + cs.semantic_score + cs.context_boost + cs.time_boost) AS relevance_score
    FROM contextual_scores cs
    ORDER BY relevance_score DESC
    LIMIT max_results;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION match_l4_knowledge TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_station_knowledge_contextual TO anon, authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.l4_knowledge_embeddings IS 'L4 Expert Knowledge with vector embeddings for semantic search';
COMMENT ON FUNCTION match_l4_knowledge IS 'Semantic search for L4 knowledge with optional filters';
COMMENT ON FUNCTION get_station_knowledge_contextual IS 'Get station-specific knowledge with context-aware filtering';
