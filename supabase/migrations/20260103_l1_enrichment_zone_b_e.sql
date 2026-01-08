-- L1 Data Enrichment - Zone B~E Outer Stations  
-- Phase 3: 補齊東京 23 區外圍行政區車站的 L1 數據
-- 執行時間: 2026-01-03

-- 涵蓋行政區: 目黑、大田、世田谷、杉並、豊島、北、荒川、板橋、練馬、足立、葛飾、江東、江戶川

-- =====================================================
-- SECTION A: 目黑區 (Meguro Ward)
-- =====================================================

-- 目黒 (JR Meguro)
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["優雅","住宅","咖啡廳"],"ja":["エレガント","住宅","カフェ"],"en":["elegant","residential","cafe"]}',
    facility_profile = '{"category_counts": {"dining": 12, "shopping": 6, "leisure": 4}, "highlights": [{"name": "目黑川", "type": "leisure", "description": "賞櫻名勝"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Meguro';

-- 中目黒
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["住宅","寧靜","時尚"],"ja":["住宅","静かな","ファッション"],"en":["residential","quiet","fashion"]}',
    facility_profile = '{"category_counts": {"dining": 8, "shopping": 5}}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Tokyu.Meguro.NakaMeguro';

-- 下北沢
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["下北澤","次文化","時尚"],"ja":["下北沢","サブカル","ファッション"],"en":["shimokitazawa","subculture","fashion"]}',
    facility_profile = '{"category_counts": {"dining": 15, "shopping": 10, "leisure": 5}, "highlights": [{"name": "下北澤", "type": "shopping", "description": "古著街"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Odakyu.NakaMeguro';

-- =====================================================
-- SECTION B: 大田区 (Ota Ward)
-- =====================================================

-- 蒲田
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["機場","交通樞紐","商業"],"ja":["エアポート","交通の要","ビジネス"],"en":["airport","transport_hub","commercial"]}',
    facility_profile = '{"category_counts": {"service": 15, "dining": 10, "shopping": 8}, "highlights": [{"name": "蒲田", "type": "dining", "description": "美食區"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Kamata';

-- 大森
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["住宅","溫泉","寧靜"],"ja":["住宅","温泉","静かな"],"en":["residential","onsen","quiet"]}',
    facility_profile = '{"category_counts": {"dining": 8, "shopping": 4, "leisure": 3}, "highlights": [{"name": "大森溫泉", "type": "leisure", "description": "天然溫泉"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Omori';

-- 平和島
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["物流","工業","展覽"],"ja":["物流","工業","展示"],"en":["logistics","industrial","exhibition"]}',
    facility_profile = '{"category_counts": {"service": 8, "dining": 3}, "highlights": [{"name": "平和島競艇場", "type": "entertainment", "description": "賽艇場"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Keikyu.Heiwajima';

-- 羽田機場
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["機場","國際","交通"],"ja":["エアポート","国際","交通"],"en":["airport","international","transport"]}',
    facility_profile = '{"category_counts": {"service": 10, "dining": 8, "shopping": 6}}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Keikyu.HanedaAirportTerminal3';

-- =====================================================
-- SECTION C: 世田谷區 (Setagaya Ward)
-- =====================================================

-- 二子玉川
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["高級住宅","自然","時尚"],"ja":["高級住宅","自然","ファッション"],"en":["upscale","nature","fashion"]}',
    facility_profile = '{"category_counts": {"shopping": 10, "dining": 8, "leisure": 5}, "highlights": [{"name": "二子玉川", "type": "shopping", "description": "高級商業設施"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Tokyu.Tamagawa.FutakoTamagawa';

-- 用賀
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["住宅區","寧靜","綠地"],"ja":["住宅地","静かな","緑地"],"en":["residential","quiet","green"]}',
    facility_profile = '{"category_counts": {"dining": 5, "shopping": 4}}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Tokyu.Tamagawa.Yoga';

-- 成城學園前
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["學區","寧靜","住宅"],"ja":["学区","静かな","住宅"],"en":["school_district","quiet","residential"]}',
    facility_profile = '{"category_counts": {"dining": 5, "shopping": 4}, "highlights": [{"name": "成城學園", "type": "education", "description": "學區"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Odakyu.Seijogakuenmae';

-- 豪德寺
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["豪德寺","招財貓","寺廟"],"ja":["豪徳寺","招き猫","寺"],"en":["gotokuji","maneki-neko","temple"]}',
    facility_profile = '{"category_counts": {"leisure": 4, "dining": 3}, "highlights": [{"name": "豪德寺", "type": "leisure", "description": "招財貓發源地"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Odakyu.Gotokuji';

-- =====================================================
-- SECTION D: 杉並區 (Suginami Ward)
-- =====================================================

-- 荻窪
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["咖哩","庶民美食","住宅"],"ja":["カレー","大衆食","住宅"],"en":["curry","平民美食","residential"]}',
    facility_profile = '{"category_counts": {"dining": 15, "shopping": 5}, "highlights": [{"name": "荻窪咖哩", "type": "dining", "description": "咖哩激戰區"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Ogikubo';

-- 高圓寺
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["高圓寺","阿波羅","表演"],"ja":["高円寺","ア波罗","パフォーマンス"],"en":["koenji","apollo","performances"]}',
    facility_profile = '{"category_counts": {"dining": 12, "shopping": 6, "entertainment": 4}, "highlights": [{"name": "高圓寺", "type": "shopping", "description": "二手古著"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Koenji';

-- 阿佐ヶ谷
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["阿佐ヶ谷","住宅","寧靜"],"ja":["阿佐ヶ谷","住宅","静かな"],"en":["asagaya","residential","quiet"]}',
    facility_profile = '{"category_counts": {"dining": 8, "shopping": 4}}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Asagaya';

-- 西荻窪
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["西荻窪","古玩","住宅"],"ja":["西荻窪","骨董","住宅"],"en":["nishiogikubo","antique","residential"]}',
    facility_profile = '{"category_counts": {"shopping": 8, "dining": 5}, "highlights": [{"name": "西荻窪", "type": "shopping", "description": "古玩街"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.NishiOgikubo';

-- =====================================================
-- SECTION E: 豊島區 (Toshima Ward)
-- =====================================================

-- 巢鴨
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["巢鴨","地藏通","傳統"],"ja":["巣鴨","地蔵通り","伝統"],"en":["sugamo","zojo","tradition"]}',
    facility_profile = '{"category_counts": {"shopping": 10, "dining": 6, "leisure": 4}, "highlights": [{"name": "巢鴨地藏通", "type": "shopping", "description": "老太太的原宿"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Sugamo';

-- 要町
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["要町","住宅","寧靜"],"ja":["要町","住宅","静かな"],"en":["kanamecho","residential","quiet"]}',
    facility_profile = '{"category_counts": {"dining": 4, "shopping": 2}}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Seibu.Ikebukuro.Kanamecho';

-- =====================================================
-- SECTION F: 北區 (Kita Ward)
-- =====================================================

-- 赤羽
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["赤羽","交通樞紐","美食"],"ja":["赤羽","交通の要","グルメ"],"en":["akabane","transport_hub","gourmet"]}',
    facility_profile = '{"category_counts": {"dining": 15, "shopping": 6, "service": 5}, "highlights": [{"name": "赤羽", "type": "dining", "description": "美食激戰區"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Akabane';

-- 田端
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["田端","住宅","文學"],"ja":["田端","住宅","文学"],"en":["tabata","residential","literature"]}',
    facility_profile = '{"category_counts": {"dining": 5, "shopping": 3, "leisure": 2}, "highlights": [{"name": "田端文士村", "type": "leisure", "description": "文學家故居"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Tabata';

-- 王子
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["王子","飛鳥山","賞櫻"],"ja":["王子","飛鳥山","桜"],"en":["oji","asukayama","sakura"]}',
    facility_profile = '{"category_counts": {"leisure": 5, "dining": 4, "shopping": 2}, "highlights": [{"name": "飛鳥山公園", "type": "leisure", "description": "賞櫻名勝"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Oji';

-- =====================================================
-- SECTION G: 荒川區 (Arakawa Ward)
-- =====================================================

-- 日暮里
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["日暮里","谷中","懷舊"],"ja":["日暮里","谷中","レトロ"],"en":["nippori","yanaka","retro"]}',
    facility_profile = '{"category_counts": {"shopping": 8, "dining": 5, "leisure": 4}, "highlights": [{"name": "谷中銀座", "type": "shopping", "description": "懷舊商店街"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Nippori';

-- 西日暮里
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["西日暮里","交通","住宅"],"ja":["西日暮里","交通","住宅"],"en":["nishi-nippori","transport","residential"]}',
    facility_profile = '{"category_counts": {"dining": 5, "shopping": 3}}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.NishiNippori';

-- 町屋
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["町屋","住宅","河川"],"ja":["町屋","住宅","川"],"en":["machiya","residential","river"]}',
    facility_profile = '{"category_counts": {"dining": 5, "shopping": 3, "leisure": 3}, "highlights": [{"name": "町屋溫泉", "type": "leisure", "description": "天然溫泉"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Machiya';

-- 三之輪橋
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["荒川線","電車","懷舊"],"ja":["荒川線","電車","レトロ"],"en":["arakawa_line","tram","retro"]}',
    facility_profile = '{"category_counts": {"leisure": 8, "dining": 4}, "highlights": [{"name": "荒川線", "type": "transport", "description": "東京唯一的路面電車"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Toei.Arakawa.Minowabashi';

-- =====================================================
-- SECTION H: 板橋區 (Itabashi Ward)
-- =====================================================

-- 板橋
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["板橋","住宅","交通"],"ja":["板橋","住宅","交通"],"en":["itabashi","residential","transport"]}',
    facility_profile = '{"category_counts": {"dining": 8, "shopping": 4}}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Itabashi';

-- 大山
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["大山","溫泉","住宅"],"ja":["大山","温泉","住宅"],"en":["oyama","onsen","residential"]}',
    facility_profile = '{"category_counts": {"leisure": 6, "dining": 4}, "highlights": [{"name": "東京天然溫泉", "type": "leisure", "description": "錢湯"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Toei.Oedo.Oyama';

-- 成増
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["成増","住宅","教育"],"ja":["成増","住宅","教育"],"en":["narimasu","residential","education"]}',
    facility_profile = '{"category_counts": {"dining": 5, "shopping": 3}}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Tobu.Narimasu';

-- =====================================================
-- SECTION I: 練馬區 (Nerima Ward)
-- =====================================================

-- 練馬
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["練馬","交通樞紐","住宅"],"ja":["練馬","交通の要","住宅"],"en":["nerima","transport_hub","residential"]}',
    facility_profile = '{"category_counts": {"dining": 10, "shopping": 5, "leisure": 3}}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Seibu.Nerima';

-- 石神井公園
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["石神井公園","自然","住宅"],"ja":["石神井公園","自然","住宅"],"en":["shakujiikoen","nature","residential"]}',
    facility_profile = '{"category_counts": {"leisure": 8, "dining": 4, "shopping": 3}, "highlights": [{"name": "石神井公園", "type": "leisure", "description": "自然公園"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Seibu.ShakujiiKoen';

-- 大泉學園
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["大泉學園","教育","住宅"],"ja":["大泉学園","教育","住宅"],"en":["oizumi_gakuen","education","residential"]}',
    facility_profile = '{"category_counts": {"dining": 6, "shopping": 4, "leisure": 3}, "highlights": [{"name": "大泉學園", "type": "education", "description": "學區"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Seibu.OizumiGakuen';

-- 氷川台
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["氷川台","住宅","寧靜"],"ja":["氷川台","住宅","静かな"],"en":["hikawaidai","residential","quiet"]}',
    facility_profile = '{"category_counts": {"dining": 4, "shopping": 2}}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Seibu.Hikarigaoka';

-- =====================================================
-- SECTION J: 足立區 (Adachi Ward)
-- =====================================================

-- 北千住
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["北千住","交通樞紐","住宅"],"ja":["北千住","交通の要","住宅"],"en":["kitasenju","transport_hub","residential"]}',
    facility_profile = '{"category_counts": {"dining": 12, "shopping": 6, "leisure": 4}, "highlights": [{"name": "千住大橋", "type": "leisure", "description": "隅田川景觀"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.KitaSenju';

-- 龜有
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["龜有","住宅","卡通"],"ja":["亀有","住宅","アニメ"],"en":["kameari","residential","anime"]}',
    facility_profile = '{"category_counts": {"dining": 6, "shopping": 4, "leisure": 3}, "highlights": [{"name": "烏龍派出所", "type": "leisure", "description": "卡通景點"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Kameari';

-- 綾瀬
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["綾瀬","住宅","寧靜"],"ja":["綾瀬","住宅","静かな"],"en":["ayase","residential","quiet"]}',
    facility_profile = '{"category_counts": {"dining": 5, "shopping": 3}}',
    updated_at = NOW()
WHERE id = 'odpt:Station:TokyoMetro.Ayase';

-- =====================================================
-- SECTION K: 葛飾區 (Katsushika Ward)
-- =====================================================

-- 柴又
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["柴又","寅次郎","懷舊"],"ja":["柴又","寅次郎","レトロ"],"en":["shibamata","tarako","retro"]}',
    facility_profile = '{"category_counts": {"leisure": 6, "dining": 4, "shopping": 3}, "highlights": [{"name": "柴又帝釋天", "type": "leisure", "description": "寅次郎紀念地"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Keisei.Shibamata';

-- 金町
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["金町","住宅","購物"],"ja":["金町","住宅","ショッピング"],"en":["kanamachi","residential","shopping"]}',
    facility_profile = '{"category_counts": {"dining": 6, "shopping": 4}}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Kanamachi';

-- 新小岩
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["新小岩","住宅","交通"],"ja":["新小岩","住宅","交通"],"en":["shinkoiwa","residential","transport"]}',
    facility_profile = '{"category_counts": {"dining": 8, "shopping": 4}}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Shinkoiwa';

-- =====================================================
-- SECTION L: 江東區 (Koto Ward)
-- =====================================================

-- 豐洲
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["豐洲","都市再開發","高級"],"ja":["豊洲","都市再開発","高級"],"en":["toyosu","urban_development","upscale"]}',
    facility_profile = '{"category_counts": {"shopping": 15, "dining": 10, "leisure": 8}, "highlights": [{"name": "豐洲市場", "type": "leisure", "description": "卸売市場"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Yurakucho.Toyosu';

-- 門前仲町
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["門前仲町","寺廟","懷舊"],"ja":["門前仲町","寺","レトロ"],"en":["monzen-nakacho","temple","retro"]}',
    facility_profile = '{"category_counts": {"dining": 10, "shopping": 5, "leisure": 4}, "highlights": [{"name": "富岡八幡宮", "type": "leisure", "description": "神社"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:Toei.Oedo.MonzenNakacho';

-- 木場
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["木場","家具","住宅"],"ja":["木場","家具","住宅"],"en":["kiba","furniture","residential"]}',
    facility_profile = '{"category_counts": {"shopping": 8, "dining": 4, "leisure": 3}, "highlights": [{"name": "木場公園", "type": "leisure", "description": "綠地"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:TokyoMetro.Kiba';

-- 清澄白河
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["清澄白河","文青","咖啡"],"ja":["清澄白河","文青","コーヒー"],"en":["kiyosumi","hipster","coffee"]}',
    facility_profile = '{"category_counts": {"dining": 12, "shopping": 6, "leisure": 4}, "highlights": [{"name": "清澄白河", "type": "dining", "description": "第三波咖啡廳"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:TokyoMetro.KiyosumiShirakawa';

-- =====================================================
-- SECTION M: 江戶川區 (Edogawa Ward)
-- =====================================================

-- 市川
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["市川","交通樞紐","住宅"],"ja":["市川","交通の要","住宅"],"en":["ichikawa","transport_hub","residential"]}',
    facility_profile = '{"category_counts": {"dining": 10, "shopping": 5, "leisure": 3}}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Ichikawa';

-- 本八幡
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["本八幡","交通","住宅"],"ja":["本八幡","交通","住宅"],"en":["hon-yawata","transport","residential"]}',
    facility_profile = '{"category_counts": {"dining": 6, "shopping": 4}}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.HonYawata';

-- 江戶川
UPDATE nodes SET 
    vibe_tags = '{"zh-TW":["江戶川","河川","自然"],"ja":["江戸川","川","自然"],"en":["edogawa","river","nature"]}',
    facility_profile = '{"category_counts": {"leisure": 6, "dining": 3}, "highlights": [{"name": "江戶川堤防", "type": "leisure", "description": "河岸步道"}]}',
    updated_at = NOW()
WHERE id = 'odpt:Station:JR-East.Edogawa';

-- =====================================================
-- 驗證查詢
-- =====================================================

-- 檢查覆蓋率
-- SELECT COUNT(*) FILTER (WHERE vibe_tags IS NOT NULL) as enriched
-- FROM nodes WHERE city_id = 'tokyo_core';

-- 抽查樣本
-- SELECT id, name->>'zh-TW', vibe_tags FROM nodes 
-- WHERE id IN ('odpt:Station:JR-East.Akabane', 'odpt:Station:Seibu.Nerima', 'odpt:Station:Yurakucho.Toyosu');
