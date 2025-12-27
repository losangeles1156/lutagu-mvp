-- Add i18n support to L1 Places
alter table l1_places 
add column if not exists name_i18n jsonb default '{}'::jsonb;

-- Backfill existing data using OSM tags
update l1_places
set name_i18n = jsonb_strip_nulls(jsonb_build_object(
  'ja', tags->>'name',
  'en', coalesce(tags->>'name:en', tags->>'name:en_rm', tags->>'name'), 
  'zh-TW', coalesce(tags->>'name:zh-Hant', tags->>'name:zh', tags->>'name'), 
  'zh-CN', coalesce(tags->>'name:zh-Hans', tags->>'name:zh', tags->>'name'),
  'ko', coalesce(tags->>'name:ko', tags->>'name')
));
