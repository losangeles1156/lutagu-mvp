-- Shinagawa L4 Knowledge (Traps & Hacks)
UPDATE nodes
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "高輪口 vs 港南口",
        "en": "Takanawa vs. Konan Exit",
        "zh": "高輪口 vs 港南口"
      },
      "description": {
        "ja": "「高輪口（西口）」はプリンスホテルや水族館方面。「港南口（東口）」は新幹線乗り場やオフィス街です。長い連絡通路で繋がっています。",
        "en": "\"Takanawa (West)\" is for Prince Hotels_Aquarium. \"Konan (East)\" is for Shinkansen/Offices. They are connected by a long corridor.",
        "zh": "「高輪口（西口）」通往王子飯店和水族館。「港南口（東口）」通往新幹線和辦公區。兩者由長長的通道連接。"
      },
      "advice": {
        "ja": "新幹線に乗るなら「港南口」方面へ進んでください。",
        "en": "For Shinkansen, head towards \"Konan Exit\".",
        "zh": "若要搭乘新幹線，請往「港南口」方向前進。"
      },
      "icon": "↔️"
    },
    {
      "title": {
        "ja": "京急線乗り換え (改札内)",
        "en": "Keikyu Transfer Gate",
        "zh": "京急線轉乘 (改札內)"
      },
      "description": {
        "ja": "JRと京急線の乗り換えには専用の「連絡改札」があります。一度外に出る必要はありませんが、切符の取り扱いに注意。",
        "en": "There is a direct transfer gate between JR and Keikyu lines. No need to exit, but ensure you have tickets/IC cards for both.",
        "zh": "JR 和京急線之間有專用的「連絡改札」。不需要出站，但請注意車票或 IC 卡的使用。"
      },
      "icon": "✈️"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "エキュート品川 (駅ナカグルメ)",
        "en": "Ecute Shinagawa (Food Paradise)",
        "zh": "Ecute 品川 (站內美食)"
      },
      "description": {
        "ja": "改札内の「エキュート」は東京屈指の駅ナカグルメスポット。乗り換えの隙間時間に美味しいお弁当やお土産が買えます。",
        "en": "One of Tokyo's best in-station malls. Perfect for grabbing high-quality bento or souvenirs during a quick transfer.",
        "zh": "改札內的「Ecute」是東京首屈一指的站內美食區。轉乘空檔也能買到美味便當或伴手禮。"
      },
      "icon": "🍱"
    },
    {
      "title": {
        "ja": "レインボーロード (中央自由通路)",
        "en": "Rainbow Road (Central Walkway)",
        "zh": "彩虹大道 (中央自由通路)"
      },
      "description": {
        "ja": "東西をつなぐ広い通路は、朝の通勤ラッシュ時は「人の川」になります。観光なら9時前は避けるのが無難です。",
        "en": "The wide central walkway becomes a \"river of humans\" during rush hour. Tourists should avoid it before 9:30 AM on weekdays.",
        "zh": "連接東西兩側的寬敞通道，上班尖峰時刻會變成「人河」。觀光客平日早上 9 點前最好避開。"
      },
      "icon": "🚶"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Shinagawa';
