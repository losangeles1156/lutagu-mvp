-- Fix migration history by deleting conflicting entries
-- This resolves the duplicate migration name issue between local and remote

-- Delete conflicting migration entries from schema_migrations
DELETE FROM supabase_migrations.schema_migrations WHERE version IN ('20251230', '20260104');

-- Verify the deletion
SELECT version, name, EXTRACT(EPOCH FROM (executed_at - created_at)) as duration_seconds
FROM supabase_migrations.schema_migrations
ORDER BY version;
