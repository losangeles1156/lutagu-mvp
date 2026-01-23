
-- Critical cleanup for Voyage 4 Upgrade
-- Clears old embeddings that might be 768 or 1536 dims (Gemini/Mistral/OpenAI)
-- Ensures HNSW index is optimized for 1024 dims

BEGIN;

-- 1. Truncate Table (Clears all data)
TRUNCATE TABLE public.l4_knowledge_embeddings;

-- 2. Ensure Column Dimensions are strictly 1024 (Verification)
ALTER TABLE public.l4_knowledge_embeddings ALTER COLUMN embedding TYPE vector(1024);

-- 3. Rebuild Index (Clean Slate)
DROP INDEX IF EXISTS idx_l4_embedding_hnsw;
CREATE INDEX idx_l4_embedding_hnsw ON public.l4_knowledge_embeddings 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

COMMIT;
