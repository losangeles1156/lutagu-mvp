-- Update L4 Knowledge Vectors to 1024 dimensions (Mistral)

-- 1. Drop index depending on vector column
DROP INDEX IF EXISTS idx_l4_embedding_hnsw;

-- 2. Alter column type
-- This requires clearing data if dimensions don't match, or casting?
-- Since existing data is 768, we can't cast to 1024 generally without padding.
-- But we plan to regenerate embeddings, so truncating or nullifying is acceptable.
-- Ideally TRUNCATE to be clean.
TRUNCATE TABLE l4_knowledge_embeddings;

ALTER TABLE l4_knowledge_embeddings ALTER COLUMN embedding TYPE vector(1024);

-- 3. Recreate Index
CREATE INDEX IF NOT EXISTS idx_l4_embedding_hnsw ON public.l4_knowledge_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- 4. Update RPC function
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
    tags_core text[],
    tags_intent text[],
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
        l4.tags_core,
        l4.tags_intent,
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

NOTIFY pgrst, 'reload schema';
