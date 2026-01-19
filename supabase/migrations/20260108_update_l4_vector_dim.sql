
-- Migration to update L4 knowledge embeddings to 1024 dimensions for Mistral
ALTER TABLE public.l4_knowledge_embeddings ALTER COLUMN embedding TYPE vector(1024);

-- Recreate the HNSW index as the dimension changed
DROP INDEX IF EXISTS idx_l4_embedding_hnsw;
CREATE INDEX IF NOT EXISTS idx_l4_embedding_hnsw ON public.l4_knowledge_embeddings
USING hnsw (embedding vector_cosine_ops);

-- Update the RPC function to accept 1024 dimensions
CREATE OR REPLACE FUNCTION match_l4_knowledge (
    query_embedding vector(1024),
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
        (filter_user_context IS NULL OR (l4.user_context ?| filter_user_context)) AND
        (filter_time_context IS NULL OR (l4.time_context ?| filter_time_context)) AND
        1 - (l4.embedding <=> query_embedding) > match_threshold
    ORDER BY l4.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
