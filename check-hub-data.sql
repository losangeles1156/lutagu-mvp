-- 檢查上野站的資料
SELECT
  id,
  name->>'zh-TW' as name_zh,
  name->>'ja' as name_ja,
  is_hub,
  parent_hub_id,
  is_active
FROM nodes
WHERE (name->>'zh-TW' LIKE '%上野%' OR name->>'ja' LIKE '%上野%')
  AND node_type = 'station'
ORDER BY is_hub DESC NULLS LAST, id;

-- 檢查有多少個 Hub
SELECT
  is_hub,
  COUNT(*) as count
FROM nodes
WHERE node_type = 'station'
  AND is_active = true
GROUP BY is_hub;

-- 檢查 hub_stations_view 是否有資料
SELECT COUNT(*) as hub_count
FROM hub_stations_view;

-- 檢查上野站是否在 hub_stations_view 中
SELECT *
FROM hub_stations_view
WHERE hub_id LIKE '%Ueno%'
LIMIT 5;
