-- Oshiage L4 Knowledge (Traps & Hacks)
UPDATE nodes
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "押上駅 vs とうきょうスカイツリー駅",
        "en": "Oshiage vs. Tokyo Skytree Stn",
        "zh": "押上站 vs 東京晴空塔站"
      },
      "description": {
        "ja": "スカイツリーへはどちらの駅からも行けますが、半蔵門線・浅草線なら「押上」、東武線なら「とうきょうスカイツリー」が便利です。",
        "en": "Both serve Skytree. Use \"Oshiage\" for Hanzomon/Asakusa Lines. Use \"Tokyo Skytree Station\" for Tobu Line. Don't worry, they are connected.",
        "zh": "去晴空塔兩個站都能到。搭半藏門線/淺草線請在「押上」下車；搭東武線則在「東京晴空塔站」下車。"
      },
      "advice": {
        "ja": "地下鉄で来るなら「押上」で間違いありません。",
        "en": "If coming by Subway, \"Oshiage\" is your correct stop.",
        "zh": "搭地鐵來的話，選「押上」絕對沒錯。"
      },
      "icon": "🗼"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "ソラマチ直結 (雨でも安心)",
        "en": "Solamachi Direct Access",
        "zh": "Solamachi 直結 (雨天安心)"
      },
      "description": {
        "ja": "押上駅はスカイツリータウン「ソラマチ」の地下に直結しています。改札を出ればすぐショッピングモールです。",
        "en": "Oshiage Station is directly connected to the Solamachi basement. You enter the mall immediately after exiting the gates.",
        "zh": "押上站與晴空塔商場「Solamachi」地下直結。一出改札口就是購物中心。"
      },
      "icon": "🛍️"
    },
    {
      "title": {
        "ja": "ライフ (庶民派スーパー)",
        "en": "Life Supermarket",
        "zh": "Life 超市 (庶民派)"
      },
      "description": {
        "ja": "押上駅のすぐ近くにある大型スーパー。観光地価格ではない、普通の東京の価格でお惣菜や飲み物が買えます。",
        "en": "A large supermarket right near the station B3 exit. Great for grabbing drinks/food at normal (non-tourist) prices.",
        "zh": "位於押上站 B3 出口旁的大型超市。能以一般東京物價（非觀光地價格）購買熟食和飲料。"
      },
      "icon": "🥦"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Oshiage%';
