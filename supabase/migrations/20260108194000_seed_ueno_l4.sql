-- Ueno L4 Knowledge (Traps & Hacks)
UPDATE nodes
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "公園口はここじゃない？",
        "en": "The Park Exit Trap",
        "zh": "這裡不是公園口？"
      },
      "description": {
        "ja": "JR上野駅の「公園改札」は3階にあります。1階（中央改札）から出ると、公園まで長い坂道を登ることになります。",
        "en": "The \"Park Gate\" (for Zoo/Museums) is on the 3F. If you exit from the 1F Central Gate, you'll face a long uphill walk.",
        "zh": "JR 上野站的「公園改札」位於 3 樓。如果從 1 樓（中央改札）出去，就必須走很長的上坡路才能到公園。"
      },
      "advice": {
        "ja": "動物園や美術館へ行くなら、ホームの階段を「上って」公園改札へ。",
        "en": "For the Zoo or Museums, go UP the stairs to the Park Gate.",
        "zh": "要去動物園或美術館，請由月台「往上」走去公園改札。"
      },
      "icon": "🐼"
    },
    {
      "title": {
        "ja": "地下鉄乗り換えの距離",
        "en": "Subway Transfer Distance",
        "zh": "地鐵轉乘距離"
      },
      "description": {
        "ja": "JRから銀座線・日比谷線への乗り換えは、一度改札を出て地下通路を5〜10分歩きます。",
        "en": "Transferring from JR to Ginza/Hibiya or Keisei lines requires exiting the gates and walking 5-10 mins through underground passages.",
        "zh": "從 JR 轉乘銀座線、日比谷線或京成線，需要出改札口並在地下通道走 5-10 分鐘。"
      },
      "icon": "🚇"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "パンダ橋 (人混み回避)",
        "en": "Panda Bridge (Crowd Evasion)",
        "zh": "熊貓橋 (避開人潮)"
      },
      "description": {
        "ja": "上野駅の入谷改札（3F）を出てすぐの陸橋。公園側と高速道路側をつなぐ穴場ルートです。",
        "en": "A pedestrian bridge outside the Iriya Gate (3F). A quiet shortcut connecting the park side and the highway side.",
        "zh": "出了上野站入谷改札（3F）即達的陸橋。連接公園側與高速公路側的隱藏路線。"
      },
      "icon": "🌉"
    },
    {
      "title": {
        "ja": "駅ナカ「エキュート」",
        "en": "Ecute Ueno (Station Shopping)",
        "zh": "Ecute 上野 (站內購物)"
      },
      "description": {
        "ja": "3階の改札内にあるショッピングエリア。パンダグッズや限定スイーツが充実しており、お土産探しに最適です。",
        "en": "Shopping area inside the 3F gates. Packed with panda merch and limited sweets. Perfect for last-minute gifts.",
        "zh": "位於 3 樓改札內的購物區。熊貓週邊商品和限定甜點豐富，最適合挑選伴手禮。"
      },
      "icon": "🎁"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Ueno';
