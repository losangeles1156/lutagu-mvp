
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ No connection string found in .env.local');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const sql = `
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

GRANT EXECUTE ON FUNCTION match_l4_knowledge TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_station_knowledge_contextual TO anon, authenticated;
`;

async function run() {
  try {
    await client.connect();
    console.log('🔌 Connected to database');

    await client.query(sql);
    console.log('✅ Functions match_l4_knowledge and get_station_knowledge_contextual created/updated successfully');

  } catch (err) {
    console.error('❌ Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

run();
