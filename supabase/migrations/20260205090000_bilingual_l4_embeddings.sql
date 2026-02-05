-- Add bilingual fields to l4_knowledge_embeddings
ALTER TABLE public.l4_knowledge_embeddings
  ADD COLUMN IF NOT EXISTS content_original text,
  ADD COLUMN IF NOT EXISTS embedding_original vector(1024),
  ADD COLUMN IF NOT EXISTS content_en text,
  ADD COLUMN IF NOT EXISTS embedding_en vector(1024),
  ADD COLUMN IF NOT EXISTS language_mode text;

-- Backfill original fields from legacy columns
UPDATE public.l4_knowledge_embeddings
SET
  content_original = COALESCE(content_original, content),
  embedding_original = COALESCE(embedding_original, embedding)
WHERE content_original IS NULL OR embedding_original IS NULL;

-- Default language_mode to 'en' when absent
UPDATE public.l4_knowledge_embeddings
SET language_mode = 'en'
WHERE language_mode IS NULL;

-- Indexes for bilingual vectors
CREATE INDEX IF NOT EXISTS idx_l4_embedding_en_hnsw ON public.l4_knowledge_embeddings
USING hnsw (embedding_en vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_l4_embedding_original_hnsw ON public.l4_knowledge_embeddings
USING hnsw (embedding_original vector_cosine_ops);

-- Update RPC to use bilingual embeddings with mode
CREATE OR REPLACE FUNCTION match_l4_knowledge (
    query_embedding vector(1024),
    match_threshold float,
    match_count int,
    filter_language_mode text default 'en',
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
        COALESCE(l4.content_original, l4.content) AS content,
        l4.icon,
        l4.category,
        l4.subcategory,
        l4.time_context,
        l4.user_context,
        l4.ward_context,
        l4.tags_core,
        l4.tags_intent,
        1 - (
          CASE
            WHEN filter_language_mode = 'original' THEN COALESCE(l4.embedding_original, l4.embedding)
            WHEN filter_language_mode = 'dual' THEN COALESCE(l4.embedding_en, l4.embedding_original, l4.embedding)
            ELSE COALESCE(l4.embedding_en, l4.embedding_original, l4.embedding)
          END
        <=> query_embedding) AS similarity
    FROM public.l4_knowledge_embeddings l4
    WHERE
        (filter_knowledge_type IS NULL OR l4.knowledge_type = filter_knowledge_type) AND
        (filter_entity_id IS NULL OR l4.entity_id = filter_entity_id) AND
        (filter_category IS NULL OR l4.category = filter_category) AND
        (filter_user_context IS NULL OR (l4.user_context ?| filter_user_context)) AND
        (filter_time_context IS NULL OR (l4.time_context ?| filter_time_context)) AND
        1 - (
          CASE
            WHEN filter_language_mode = 'original' THEN COALESCE(l4.embedding_original, l4.embedding)
            WHEN filter_language_mode = 'dual' THEN COALESCE(l4.embedding_en, l4.embedding_original, l4.embedding)
            ELSE COALESCE(l4.embedding_en, l4.embedding_original, l4.embedding)
          END
        <=> query_embedding) > match_threshold
    ORDER BY
        CASE
            WHEN filter_language_mode = 'original' THEN COALESCE(l4.embedding_original, l4.embedding)
            WHEN filter_language_mode = 'dual' THEN COALESCE(l4.embedding_en, l4.embedding_original, l4.embedding)
            ELSE COALESCE(l4.embedding_en, l4.embedding_original, l4.embedding)
        END <=> query_embedding
    LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_l4_knowledge TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
