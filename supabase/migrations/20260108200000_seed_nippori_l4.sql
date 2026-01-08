-- Nippori L4 Knowledge (Traps & Hacks)
UPDATE nodes 
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "舎人ライナーは遠い",
        "en": "Toneri Liner Distance",
        "zh": "舍人線稍微遠"
      },
      "description": {
        "ja": "JR日暮里駅から日暮里・舎人ライナーの駅へは、コンコースを少し歩きます。雨の日は濡れずに移動できます。",
        "en": "The Nippori-Toneri Liner station is connected but requires a walk through the concourse.",
        "zh": "從 JR 日暮里站到日暮里・舍人線車站需要走過大廳。下雨天可不淋濕移動。"
      },
      "advice": {
        "ja": "時間に余裕を持って乗り換えましょう。",
        "en": "Allow a little extra time for the transfer.",
        "zh": "轉乘請預留時間。"
      },
      "icon": "🚶"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "スカイライナー乗り換え (最強ルート)",
        "en": "Skyliner Shortcut",
        "zh": "Skyliner 轉乘 (最強路徑)"
      },
      "description": {
        "ja": "JR山手線等から京成スカイライナーへの乗り換えは、日暮里が東京で一番スムーズです。専用改札を通れば数分で乗り換え可能。",
        "en": "Nippori offers the smoothest transfer from JR lines to the Keisei Skyliner. Use the dedicated transfer gate to switch in minutes.",
        "zh": "從 JR 山手線等轉乘京成 Skyliner，日暮里是東京最順暢的車站。通過專用轉乘改札，幾分鐘內即可完成。"
      },
      "advice": {
        "ja": "上野で乗り換えるより、日暮里の方が圧倒的に楽です！",
        "en": "It's overwhelmingly easier than transferring at Ueno!",
        "zh": "比起在上野轉乘，日暮里絕對比較輕鬆！"
      },
      "icon": "✈️"
    },
    {
      "title": {
        "ja": "谷中銀座への近道 (北改札)",
        "en": "Shortest to Yanaka Ginza",
        "zh": "往谷中銀座的近路 (北改札)"
      },
      "description": {
        "ja": "レトロな商店街「谷中銀座」へは、北改札を出て西口へ。夕焼けだんだんまで徒歩5分です。",
        "en": "For the retro \"Yanaka Ginza\" shopping street, use the North Gate and exit West. A 5-min walk to the \"Sunset Stairs\".",
        "zh": "若要去復古商店街「谷中銀座」，請走北改札的西口。步行 5 分鐘即達「夕陽階梯」。"
      },
      "icon": "🌇"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Nippori';
