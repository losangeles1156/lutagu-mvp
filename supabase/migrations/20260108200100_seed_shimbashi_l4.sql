-- Shimbashi L4 Knowledge (Traps & Hacks)
UPDATE nodes 
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "ゆりかもめ乗り換え (意外と遠い)",
        "en": "Yurikamome is Far",
        "zh": "百合海鷗號很遠"
      },
      "description": {
        "ja": "JR新橋駅からゆりかもめの駅までは、駅前広場を渡ってエスカレーターを上る必要があり、5〜8分かかります。",
        "en": "Transferring to the Yurikamome Line requires crossing the station plaza and going up escalators. Allow 5-8 mins.",
        "zh": "從 JR 新橋站到百合海鷗號車站，需要穿過站前廣場並搭乘手扶梯，需時 5-8 分鐘。"
      },
      "advice": {
        "ja": "「烏森口」ではなく「銀座口」か「汐留口」が近いです。",
        "en": "Use \"Ginza Exit\" or \"Shiodome Exit\", NOT \"Karasumori Exit\".",
        "zh": "請走「銀座口」或「汐留口」，不要走「烏森口」。"
      },
      "icon": "🚆"
    },
    {
      "title": {
        "ja": "SL広場は待ち合わせの定番",
        "en": "SL Square Meeting Point",
        "zh": "SL 廣場是經典會合點"
      },
      "description": {
        "ja": "有名な蒸気機関車（SL）がある広場は日比谷口側にあります。夜はサラリーマンで激混みします。",
        "en": "The famous Steam Locomotive (SL) square is at the Hibiya Exit. Extremely crowded with salarymen at night.",
        "zh": "著名的蒸氣火車 (SL) 廣場位於日比谷口側。夜晚會擠滿上班族。"
      },
      "icon": "🚂"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "汐留へは地下直結",
        "en": "Underground to Shiodome",
        "zh": "地下直通汐留"
      },
      "description": {
        "ja": "新橋駅から汐留（カレッタ汐留など）へは、地下通路「ウイング新橋」経由で濡れずに行けます。",
        "en": "You can walk to Shiodome (Caretta, etc.) completely underground via \"Wing Shimbashi\".",
        "zh": "從新橋站可以經由地下通道「Wing 新橋」不淋雨前往汐留（Caretta 汐留等地）。"
      },
      "icon": "☂️"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Shimbashi';
