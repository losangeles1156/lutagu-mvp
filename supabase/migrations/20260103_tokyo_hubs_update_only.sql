-- =============================================================================
-- Complete Fix: 東京23區所有車站父子節點修復 - UPDATE only 版
-- 使用 UPDATE 避免 NOT NULL 約束問題
-- =============================================================================

-- Step 1: 將所有節點先重置為 Standalone
UPDATE nodes SET is_hub = false, parent_hub_id = NULL WHERE true;

-- Step 2: 更新 Hub 站點
UPDATE nodes SET is_hub = true, parent_hub_id = NULL WHERE id IN (
  -- 中央區
  'odpt:Station:JR-East.Yurakucho',
  'odpt:Station:JR-East.Shimbashi',
  'odpt:Station:TokyoMetro.Nihombashi',
  'odpt:Station:TokyoMetro.Kayabacho',
  'odpt:Station:TokyoMetro.Ningyocho',
  'odpt:Station:JR-East.Hatchobori',
  'odpt:Station:TokyoMetro.Yurakucho.Tsukishima',
  'odpt:Station:TokyoMetro.Yurakucho.Toyosu',
  'odpt:Station:JR-East.Hamamatsucho',
  'odpt:Station:TokyoMetro.Ginza',
  -- 港區
  'odpt:Station:JR-East.Shinagawa',
  'odpt:Station:TokyoMetro.Ginza.Akasaka',
  'odpt:Station:TokyoMetro.Ginza.AkasakaMitsuke',
  'odpt:Station:TokyoMetro.Ginza.AoyamaItchome',
  'odpt:Station:TokyoMetro.Hibiya.Roppongi',
  'odpt:Station:Toei.Namboku.AzabuJuban',
  'odpt:Station:JR-East.Ebisu',
  'odpt:Station:JR-East.Meguro',
  'odpt:Station:Keikyu.Sengakuji',
  'odpt:Station:TokyoMetro.Namboku.ShirokaneTakanawa',
  'odpt:Station:Toei.Mita.Mita',
  -- 豐島區
  'odpt:Station:JR-East.Ikebukuro',
  'odpt:Station:JR-East.Komagome',
  'odpt:Station:TokyoMetro.Yurakucho.Wakamatsukawara',
  -- 涉谷區
  'odpt:Station:JR-East.Shibuya',
  'odpt:Station:TokyoMetro.Chiyoda.Omotesando',
  'odpt:Station:TokyoMetro.Hibiya.NakaMeguro',
  'odpt:Station:Odakyu.YoyogiUehara',
  'odpt:Station:JR-East.Yoyogi',
  -- 千代田區
  'odpt:Station:JR-East.Tokyo',
  'odpt:Station:JR-East.Kanda',
  'odpt:Station:JR-East.Iidabashi',
  'odpt:Station:JR-East.Ichigaya',
  'odpt:Station:JR-East.Kudanshita',
  'odpt:Station:TokyoMetro.Hibiya',
  'odpt:Station:Toei.Jimbocho',
  'odpt:Station:Toei.Mita',
  -- 台東區
  'odpt:Station:JR-East.Ueno',
  'odpt:Station:JR-East.Akihabara',
  'odpt:Station:JR-East.Okachimachi',
  'odpt:Station:Toei.ShinOkachimachi',
  'odpt:Station:Toei.HigashiNihombashi',
  'odpt:Station:TokyoMetro.Asakusa',
  -- 新宿區
  'odpt:Station:JR-East.Shinjuku',
  -- 北區
  'odpt:Station:JR-East.Akabane',
  -- 足立區
  'odpt:Station:JR-East.KitaSenju',
  -- 中野區
  'odpt:Station:JR-East.Nakano',
  -- 大田区
  'odpt:Station:JR-East.HanedaAirport'
);

-- Step 3: 更新 Child 站點
UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Ueno' WHERE id IN (
  'odpt:Station:TokyoMetro.Ueno',
  'odpt:Station:Keisei.Ueno'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Akihabara' WHERE id IN (
  'odpt:Station:TsukubaExpress.Akihabara',
  'odpt:Station:TokyoMetro.Hibiya.Akihabara'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Okachimachi' WHERE id IN (
  'odpt:Station:JR-East.UenoOkachimachi'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Tokyo' WHERE id IN (
  'odpt:Station:TokyoMetro.Otemachi',
  'odpt:Station:TokyoMetro.Chiyoda.Otemachi',
  'odpt:Station:Toei.Mita.Otemachi',
  'odpt:Station:TokyoMetro.Marunouchi.Tokyo',
  'odpt:Station:JR-East.SobuRapid.Tokyo',
  'odpt:Station:JR-East.Yamanote.Tokyo'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Kanda' WHERE id IN (
  'odpt:Station:TokyoMetro.Ginza.Kanda',
  'odpt:Station:TokyoMetro.Hibiya.Kanda',
  'odpt:Station:TokyoMetro.Kanda',
  'odpt:Station:JR-East.Yamanote.Kanda'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Iidabashi' WHERE id IN (
  'odpt:Station:TokyoMetro.Iidabashi',
  'odpt:Station:TokyoMetro.Yurakucho.Iidabashi',
  'odpt:Station:Toei.Oedo.Iidabashi'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Ichigaya' WHERE id IN (
  'odpt:Station:Toei.Shinjuku.Ichigaya',
  'odpt:Station:Toei.Oedo.Ichigaya'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Kudanshita' WHERE id IN (
  'odpt:Station:Toei.Shinjuku.Kudanshita',
  'odpt:Station:TokyoMetro.Tozai.Kudanshita'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:TokyoMetro.Hibiya' WHERE id IN (
  'odpt:Station:Toei.Mita.Hibiya'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:TokyoMetro.Ginza' WHERE id IN (
  'odpt:Station:TokyoMetro.Hibiya.Ginza'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:Toei.Jimbocho' WHERE id IN (
  'odpt:Station:Toei.Shinjuku.Jimbocho'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:Toei.Mita' WHERE id IN (
  'odpt:Station:TokyoMetro.Namboku.Mita'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:TokyoMetro.Nihombashi' WHERE id IN (
  'odpt:Station:Toei.Asakusa.Nihombashi'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:TokyoMetro.Ningyocho' WHERE id IN (
  'odpt:Station:Toei.Asakusa.Ningyocho'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Hatchobori' WHERE id IN (
  'odpt:Station:TokyoMetro.Hibiya.Hatchobori'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:TokyoMetro.Yurakucho.Toyosu' WHERE id IN (
  'odpt:Station:JR-East.Toyosu'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Hamamatsucho' WHERE id IN (
  'odpt:Station:Toei.Asakusa.Daimon',
  'odpt:Station:TokyoMonorail.HanedaAirport.Hamamatsucho'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Shinagawa' WHERE id IN (
  'odpt:Station:Keikyu.Shinagawa',
  'odpt:Station:JR-East.Yamanote.Shinagawa',
  'odpt:Station:JR-East.KeihinTohoku.Shinagawa',
  'odpt:Station:JR-East.Tokaido.Shinagawa',
  'odpt:Station:JR-East.Yokosuka.Shinagawa'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:TokyoMetro.Ginza.Akasaka' WHERE id IN (
  'odpt:Station:TokyoMetro.Chiyoda.Akasaka'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:TokyoMetro.Ginza.AkasakaMitsuke' WHERE id IN (
  'odpt:Station:TokyoMetro.Namboku.AkasakaMitsuke',
  'odpt:Station:TokyoMetro.Chiyoda.AkasakaMitsuke',
  'odpt:Station:TokyoMetro.Hanzomon.AkasakaMitsuke'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:TokyoMetro.Ginza.AoyamaItchome' WHERE id IN (
  'odpt:Station:TokyoMetro.Hanzomon.AoyamaItchome',
  'odpt:Station:TokyoMetro.Chiyoda.AoyamaItchome'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:TokyoMetro.Hibiya.Roppongi' WHERE id IN (
  'odpt:Station:Toei.Oedo.Roppongi'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:Toei.Namboku.AzabuJuban' WHERE id IN (
  'odpt:Station:Toei.Mita.AzabuJuban'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Ebisu' WHERE id IN (
  'odpt:Station:TokyoMetro.Hibiya.Ebisu'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Meguro' WHERE id IN (
  'odpt:Station:TokyoMetro.Namboku.Meguro',
  'odpt:Station:Toei.Mita.Meguro',
  'odpt:Station:TokyuToyoko.Meguro'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:Keikyu.Sengakuji' WHERE id IN (
  'odpt:Station:Toei.Asakusa.Sengakuji'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:TokyoMetro.Namboku.ShirokaneTakanawa' WHERE id IN (
  'odpt:Station:Toei.Mita.ShirokaneTakanawa'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Ikebukuro' WHERE id IN (
  'odpt:Station:TokyoMetro.Ikebukuro',
  'odpt:Station:TokyoMetro.Yurakucho.Ikebukuro',
  'odpt:Station:TokyoMetro.Namboku.Ikebukuro',
  'odpt:Station:Seibu.Ikebukuro'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Komagome' WHERE id IN (
  'odpt:Station:TokyoMetro.Namboku.Komagome',
  'odpt:Station:Toei.NipporiToneri.Komagome'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:TokyoMetro.Yurakucho.Wakamatsukawara' WHERE id IN (
  'odpt:Station:TokyoMetro.Tozai.Wakamatsukawara'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Shibuya' WHERE id IN (
  'odpt:Station:TokyoMetro.Ginza.Shibuya',
  'odpt:Station:TokyoMetro.Hanzomon.Shibuya',
  'odpt:Station:TokyoMetro.Fukutoshin.Shibuya',
  'odpt:Station:TokyoMetro.Chiyoda.Shibuya',
  'odpt:Station:TokyuToyoko.Shibuya',
  'odpt:Station:TokyuDenEnToshi.Shibuya',
  'odpt:Station:Keio.Shibuya'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:TokyoMetro.Chiyoda.Omotesando' WHERE id IN (
  'odpt:Station:TokyoMetro.Ginza.Omotesando',
  'odpt:Station:TokyoMetro.Hanzomon.Omotesando'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:TokyoMetro.Hibiya.NakaMeguro' WHERE id IN (
  'odpt:Station:TokyuToyoko.NakaMeguro',
  'odpt:Station:TokyuDenEnToshi.NakaMeguro'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:Odakyu.YoyogiUehara' WHERE id IN (
  'odpt:Station:TokyoMetro.Chiyoda.YoyogiUehara',
  'odpt:Station:Keio.YoyogiUehara'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Yoyogi' WHERE id IN (
  'odpt:Station:TokyoMetro.Chiyoda.YoyogiKoen',
  'odpt:Station:Toei.Oedo.Yoyogi'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Shinjuku' WHERE id IN (
  'odpt:Station:JR-East.SeibuShinjuku',
  'odpt:Station:TokyoMetro.Shinjuku',
  'odpt:Station:TokyoMetro.Hibiya.Shinjuku',
  'odpt:Station:Toei.Shinjuku.Shinjuku',
  'odpt:Station:Keio.Shinjuku',
  'odpt:Station:Odakyu.Shinjuku'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Akabane' WHERE id IN (
  'odpt:Station:TokyoMetro.Namboku.Akabane',
  'odpt:Station:TokyoMetro.SaitamaRailway.Akabane'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.KitaSenju' WHERE id IN (
  'odpt:Station:TokyoMetro.Chiyoda.KitaSenju',
  'odpt:Station:TokyoMetro.Hibiya.KitaSenju'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Nakano' WHERE id IN (
  'odpt:Station:TokyoMetro.Hibiya.Nakano'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.HanedaAirport' WHERE id IN (
  'odpt:Station:TokyoMonorail.HanedaAirport',
  'odpt:Station:Keikyu.HanedaAirport'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:TokyoMetro.Asakusa' WHERE id IN (
  'odpt:Station:Toei.Asakusa.Asakusa',
  'odpt:Station:Tobu.Asakusa',
  'odpt:Station:TsukubaExpress.Asakusa'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:JR-East.Ueno' WHERE id IN (
  'odpt:Station:Toei.Oedo.UenoOkachimachi'
);

UPDATE nodes SET is_hub = false, parent_hub_id = 'odpt:Station:Toei.ShinOkachimachi' WHERE id IN (
  'odpt:Station:Toei.Oedo.ShinOkachimachi'
);

-- Step 4: 驗證結果 - 只顯示 Hub 站點
SELECT id, name->>'zh-TW' as name, is_hub
FROM nodes
WHERE is_hub = true
ORDER BY name->>'zh-TW';

-- Step 5: 統計總數
SELECT
    COUNT(*) FILTER (WHERE is_hub = true) as hubs,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NOT NULL) as children,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NULL) as standalone
FROM nodes;

-- Step 6: 驗證父子關係
SELECT
    p.name->>'zh-TW' as hub_name,
    c.name->>'zh-TW' as child_name
FROM nodes c
JOIN nodes p ON c.parent_hub_id = p.id
ORDER BY p.name->>'zh-TW', c.name->>'zh-TW';
