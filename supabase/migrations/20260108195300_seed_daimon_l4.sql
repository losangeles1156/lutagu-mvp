-- Daimon L4 Knowledge (Traps & Hacks)
UPDATE nodes
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "大門と浜松町はほぼ同じ",
        "en": "Daimon = Hamamatsucho",
        "zh": "大門 = 濱松町"
      },
      "description": {
        "ja": "地下鉄の「大門駅」とJR/モノレールの「浜松町駅」は隣接しており、徒歩1〜2分で乗り換えられます。名前が違うので注意。",
        "en": "Subway \"Daimon\" and JR/Monorail \"Hamamatsucho\" are essentially adjacent. Transfer takes 1-2 mins. Don't be fooled by the different names.",
        "zh": "地鐵「大門站」與 JR/單軌電車「濱松町站」相鄰，轉乘僅需步行 1-2 分鐘。請注意別被不同的站名騙了。"
      },
      "advice": {
        "ja": "羽田空港へ行くなら、大門で降りてモノレールへの乗り換えが便利です。",
        "en": "For Haneda Airport, get off at Daimon and transfer to the Monorail.",
        "zh": "若要前往羽田機場，在大門下車轉乘單軌電車非常方便。"
      },
      "icon": "✈️"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "東京タワーへの近道",
        "en": "Shortest to Tokyo Tower",
        "zh": "往東京鐵塔的捷徑"
      },
      "description": {
        "ja": "東京タワーへは「増上寺」を経由して行くのが一番景色が良いルートです。A6出口から出て増上寺大門をくぐりましょう。",
        "en": "The most scenic route to Tokyo Tower is via Zojoji Temple. Take Exit A6 and walk through the Daimon Gate.",
        "zh": "前往東京鐵塔景色最棒的路線是經由「增上寺」。請從 A6 出口出來，穿過增上寺大門。"
      },
      "icon": "🗼"
    },
    {
      "title": {
        "ja": "世界貿易センタービル (展望台)",
        "en": "World Trade Center View",
        "zh": "世界貿易中心 (觀景台)"
      },
      "description": {
        "ja": "駅直結のビルには展望台がありましたが、現在は建て替え工事中の場合があります。最新情報をチェックしてください。",
        "en": "The connected building used to have a great observatory. Check current status as it assumes reconstruction.",
        "zh": "車站直結的大樓曾有觀景台，但可能正處於重建工程中。請確認最新資訊。"
      },
      "icon": "🏗️"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Daimon';
