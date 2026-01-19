-- Ginza & Yurakucho L4 Knowledge (Traps & Hacks)
UPDATE nodes
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "銀座駅と有楽町駅は徒歩圏内",
        "en": "Ginza & Yurakucho are Close",
        "zh": "銀座站與有樂町站其實很近"
      },
      "description": {
        "ja": "別々の駅に見えますが、地下通路で繋がっています。乗り換え検索で遠回りを指示されても、実は歩いた方が早いことがあります。",
        "en": "They look like separate stations, but are connected by an underground passage. Walking is often faster than taking a train detour.",
        "zh": "雖然看似不同的車站，但有地下通道相連。即使轉乘搜尋指示繞路，其實走路往往比較快。"
      },
      "advice": {
        "ja": "雨の日は地下通路（C9出口付近）を使って移動しましょう。",
        "en": "On rainy days, use the underground passage (near Exit C9).",
        "zh": "下雨天請利用地下通道（C9 出口附近）移動。"
      },
      "icon": "🌂"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "地下直結ハック (丸の内線→JR)",
        "en": "Underground Shortcut",
        "zh": "地下直結捷徑 (丸之內線→JR)"
      },
      "description": {
        "ja": "丸ノ内線銀座駅からJR有楽町駅へは、C9出口経由で「有楽町マリオン」を通ると、雨に濡れずに最短で移動できます。",
        "en": "From Ginza (Marunouchi Line) to JR Yurakucho, route through 'Yurakucho Mullion' via Exit C9. Fastest and dry.",
        "zh": "從丸之內線銀座站到 JR 有樂町站，經由 C9 出口穿過「有樂町 Mullion」是最快且不淋雨的路線。"
      },
      "icon": "🚶"
    },
    {
      "title": {
        "ja": "東急プラザ銀座 (眺望スポット)",
        "en": "Tokyu Plaza Ginza View",
        "zh": "東急 Plaza 銀座 (觀景點)"
      },
      "description": {
        "ja": "屋上の「キリコテラス」は無料で銀座を一望できる休憩スポット。買い物の合間の休憩に最適です。",
        "en": "The rooftop 'Kiriko Terrace' offers a free panoramic view of Ginza. Perfect for a break during shopping.",
        "zh": "頂樓的「Kiriko Terrace」是可免費眺望銀座的休息點。非常適合購物途中稍作休息。"
      },
      "icon": "☕"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Ginza%' OR id LIKE '%Yurakucho%';
