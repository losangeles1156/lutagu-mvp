-- 修正 L4 知識庫中的問題
-- 執行時間：2026-01-06

-- 1. 品川站：修正韓文錯誤
UPDATE nodes
SET riding_knowledge = jsonb_set(
  riding_knowledge,
  '{hacks,2,description}',
  '"品川站是東海道・山陽新幹線的主要車站，搭乘新幹線前往大阪、神戶非常方便。"'
)
WHERE id = 'odpt:Station:JR-East.Shinagawa';

-- 2. 大門站：澄清機場交通方式
UPDATE nodes
SET riding_knowledge = jsonb_set(
  riding_knowledge,
  '{hacks,0}',
  '{"icon": "🛬", "title": "機場交通", "description": "可搭淺草線前往濱松町，轉乘東京單軌電車到羽田機場；或搭直通京急線列車直達羽田。"}'
)
WHERE id = 'odpt:Station:Toei.Asakusa.Daimon';

-- 3. 中野站：簡化蘸麵描述
UPDATE nodes
SET riding_knowledge = jsonb_set(
  riding_knowledge,
  '{hacks,2,description}',
  '"蘸麵的「元祖」常被認為是東池袋大勝軒（山岸一雄）系譜；中野一帶也有許多拉麵與蘸麵名店，適合排入美食散步。"'
)
WHERE id = 'odpt:Station:JR-East.Nakano';

-- 4. 白金高輪站：強化直通運轉說明
UPDATE nodes
SET riding_knowledge = jsonb_set(
  riding_knowledge,
  '{traps,0,advice}',
  '"若要去目黑，可搭乘標示「目黑行き」的列車，無需換乘。請確認車頭顯示的目的地。"'
)
WHERE id = 'odpt:Station:Toei.Mita.ShirokaneTakanawa';

-- 完成修正
SELECT '已修正 4 個車站的知識庫內容' as status;
