-- Asakusa L4 Knowledge (Traps & Hacks)
UPDATE nodes
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "浅草線と銀座線の乗り換え",
        "en": "Ginza Line vs. Asakusa Line",
        "zh": "銀座線 vs 淺草線"
      },
      "description": {
        "ja": "同じ「浅草駅」ですが、銀座線と浅草線の改札は離れており、一度地上に出る必要がある場合もあります。",
        "en": "Though both are \"Asakusa Station\", the ticket gates are far apart. You often have to exit to street level to transfer.",
        "zh": "雖然都是「淺草站」，但銀座線和淺草線的改札口相距甚遠，通常需要先出到地面才能轉乘。"
      },
      "advice": {
        "ja": "雷門に行くなら「銀座線」の1番出口が一番近いです。",
        "en": "For Kaminarimon (Thunder Gate), Ginza Line Exit 1 is the closest.",
        "zh": "若要去雷門，銀座線的 1 號出口最近。"
      },
      "icon": "🚧"
    },
    {
      "title": {
        "ja": "つくばエクスプレス浅草駅の罠",
        "en": "The Tsukuba Express Trap",
        "zh": "筑波快線淺草站的陷阱"
      },
      "description": {
        "ja": "つくばエクスプレスの浅草駅は、他の浅草駅（銀座線・浅草線・東武）から徒歩10分ほど離れています。",
        "en": "The Tsukuba Express (TX) Asakusa Station is isolated, about a 10-minute walk from the main Subway/Tobu station area.",
        "zh": "筑波快線 (TX) 的淺草站與其他淺草站（銀座線、淺草線、東武）相距約 10 分鐘路程，是完全分開的。"
      },
      "icon": "🏃"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "浅草文化観光センター (無料展望台)",
        "en": "Free Observation Deck",
        "zh": "免費觀景台"
      },
      "description": {
        "ja": "雷門の目の前にある「浅草文化観光センター」の8階は、無料で仲見世通りやスカイツリーを一望できる穴場スポットです。",
        "en": "The 8th floor of the Tourist Information Center (opposite Kaminarimon) offers a free, stunning view of Nakamise-dori and Skytree.",
        "zh": "雷門對面的「淺草文化觀光中心」8 樓，是個可免費眺望仲見世通和晴空塔的絕佳隱藏景點。"
      },
      "icon": "🔭"
    },
    {
      "title": {
        "ja": "水上バスりば (隅田川クルーズ)",
        "en": "Water Bus Pier",
        "zh": "水上巴士碼頭"
      },
      "description": {
        "ja": "銀座線・東武線から徒歩すぐ。ここからお台場や浜離宮へ船で移動できます。電車とは違った東京を楽しめます。",
        "en": "Located near the station. Take a scenic boat ride to Odaiba or Hamarikyu Gardens instead of the crowded train.",
        "zh": "離車站很近。可以搭船前往台場或濱離宮，體驗與電車截然不同的東京風情。"
      },
      "icon": "🚢"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Asakusa%';
