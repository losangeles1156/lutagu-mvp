-- Seed L4 Knowledge for Remainder Stations (Osaki, Sengakuji, Kamata, Nihombashi, Ochanomizu)

-- Osaki
UPDATE nodes 
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": { "ja": "北改札は孤立", "en": "North Gate Isolation", "zh": "北改札口孤立" },
      "description": { "ja": "北改札を出ると乗り換えができず、オフィスビルしかありません。乗り換えは必ず「南改札」へ。", "en": "The North Gate leads only to office buildings. For transfers (Rinkai Line), you MUST use the South Gate.", "zh": "北改札口出來只有辦公大樓，無法轉乘。轉乘請務必走「南改札」。" },
      "icon": "🚧"
    }
  ],
  "hacks": [
    {
      "title": { "ja": "お台場へ直通 (りんかい線)", "en": "Direct to Odaiba", "zh": "直達台場 (臨海線)" },
      "description": { "ja": "大崎始発のりんかい線が多く、座ってお台場・東京テレポートへ行けます。", "en": "Many Rinkai Line trains start here, guaranteeing a seat to Odaiba/Tokyo Teleport.", "zh": "許多臨海線列車從大崎發車，可以坐著去台場/東京電訊。" },
      "icon": "🌊"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Osaki%';

-- Sengakuji
UPDATE nodes 
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": { "ja": "行き先に注意 (空港 vs 横浜)", "en": "Check Destination", "zh": "注意目的地 (機場 vs 橫濱)" },
      "description": { "ja": "同じホームに「羽田空港行」と「横浜方面行」が交互に来ます。乗り間違いに注意。", "en": "Trains for Haneda Airport and Yokohama arrive at the same platform. Check the display carefully.", "zh": "同一月台會有「往羽田機場」和「往橫濱方面」的列車交替進站。請注意不要搭錯。" },
      "icon": "✈️"
    }
  ],
  "hacks": [
    {
      "title": { "ja": "泉岳寺ダッシュ (始発確保)", "en": "Sengakuji Dash", "zh": "泉岳寺衝刺 (搶座位)" },
      "description": { "ja": "西馬込方面からの始発列車乗り換え時、同じホームの向かい側に止まるため、座席確保のチャンスです。", "en": "Cross-platform transfer from Nishi-magome line trains allows you to grab a seat on the Airport Express.", "zh": "從西馬込方向來的始發列車轉乘時，因為停在同一月台對面，是搶座位的絕佳機會。" },
      "icon": "🏃"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Sengakuji%';

-- Kamata
UPDATE nodes 
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": { "ja": "JR蒲田と京急蒲田は別駅", "en": "JR vs Keikyu Kamata", "zh": "JR蒲田與京急蒲田是不同站" },
      "description": { "ja": "両駅は800m離れており、徒歩15分かかります。乗り換え扱いにはなりません。", "en": "The two stations are 800m apart (15 min walk). They are NOT connected.", "zh": "兩站相距 800 公尺，步行需 15 分鐘。不屬於轉乘站。" },
      "icon": "🚶"
    }
  ],
  "hacks": [
    {
      "title": { "ja": "京浜東北線の始発", "en": "Starts Here", "zh": "始發車天堂" },
      "description": { "ja": "蒲田始発の東京方面行きが多く、朝のラッシュ時でも並べば座れます。", "en": "Many Keihin-Tohoku line trains start here. Line up to get a seat even during rush hour.", "zh": "許多往東京方向的京濱東北線列車從此發車，即使是早高峰排隊也能坐到位子。" },
      "icon": "💺"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Kamata%';

-- Nihombashi
UPDATE nodes 
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": { "ja": "浅草線への遠い道", "en": "Asakusa Line is Far", "zh": "淺草線很遠" },
      "description": { "ja": "東西線・銀座線から浅草線への乗り換えは、一度改札を出て地下通路を長く歩く必要があります。", "en": "Transferring to the Asakusa Line from Tozai/Ginza Lines requires a long underground walk outside the gates.", "zh": "從東西線/銀座線轉乘淺草線，需要出改札口並走很長的地下通道。" },
      "icon": "⌛"
    }
  ],
  "hacks": [
    {
      "title": { "ja": "Coredo直結", "en": "Coredo Access", "zh": "直通 Coredo" },
      "description": { "ja": "B12出口などはCoredo日本橋に直結しており、雨に濡れずにショッピングエリアへ行けます。", "en": "Exits like B12 connect directly to Coredo Nihombashi shopping complex.", "zh": "B12 等出口與 Coredo 日本橋直結，下雨天也能不淋濕地前往購物區。" },
      "icon": "🛍️"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Nihombashi%';

-- Ochanomizu
UPDATE nodes 
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": { "ja": "聖橋口 vs 御茶ノ水橋口", "en": "Exit Confusion", "zh": "聖橋口 vs 御茶之水橋口" },
      "description": { "ja": "神田明神やソラシティへは「聖橋口」が便利です。御茶ノ水橋口に出ると遠回りになります。", "en": "Use 'Hijiribashi Exit' for Kanda Myojin/Sola City. The other exit is a detour.", "zh": "去神田明神或 Sola City 請走「聖橋口」。走御茶之水橋口會繞遠路。" },
      "icon": "⛩️"
    }
  ],
  "hacks": [
    {
      "title": { "ja": "0分乗り換え (中央・総武)", "en": "0-Minute Transfer", "zh": "0分轉乘 (中央・總武)" },
      "description": { "ja": "日本で最も便利な乗り換えの一つ。中央線快速と総武線各駅停車が同じホームの向かい側に到着します。", "en": "One of the best transfers in Tokyo. Chuo Rapid and Sobu Local trains arrive across the same platform.", "zh": "東京最方便的轉乘之一。中央線快速與總武線各站停車停在同一月台對面。" },
      "icon": "⚡"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Ochanomizu%';
