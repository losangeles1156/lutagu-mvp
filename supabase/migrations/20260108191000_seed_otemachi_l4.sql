-- Otemachi L4 Knowledge (Traps & Hacks)
-- Updating all Tokyo Metro Otemachi nodes to ensure coverage across lines
UPDATE nodes 
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "東西線⇔千代田線の罠 (遠すぎる乗り換え)",
        "en": "Tozai Line <-> Chiyoda Line Trap",
        "zh": "東西線⇔千代田線的陷阱 (遙遠的轉乘)"
      },
      "description": {
        "ja": "同じ「大手町駅」でも、東西線と千代田線のホームは端と端にあり、乗り換えに10分以上かかります。",
        "en": "Although both are \"Otemachi\", the Tozai and Chiyoda platforms are at opposite ends. Expect a 10+ minute walk.",
        "zh": "雖然都在「大手町站」，但東西線和千代田線的月台位於兩端，轉乘需要 10 分鐘以上。"
      },
      "advice": {
        "ja": "時間に余裕を持つか、別の駅（二重橋前など）の利用も検討を。",
        "en": "Allow extra time or consider using nearby stations like Nijubashimae if applicable.",
        "zh": "請預留充裕時間，或考慮使用鄰近車站（如二重橋前）。"
      },
      "icon": "⌛"
    },
    {
      "title": {
        "ja": "出口迷宮 (C13bってどこ？)",
        "en": "Exit Labyrinth",
        "zh": "出口迷宮"
      },
      "description": {
        "ja": "出口がA, B, C, D, E...と多数あり、地下で迷子になりやすいです。目的地に一番近い出口番号を必ず事前に調べてください。",
        "en": "With exits A through E, the underground complex is a maze. Always check the exact exit number (e.g., C13b) beforehand.",
        "zh": "出口有 A、B、C、D、E... 等眾多編號，地下容易迷路。請務必事先查好離目的地最近的出口編號。"
      },
      "advice": {
        "ja": "「何番出口」か分かれば、案内表示に従うだけで着きます。",
        "en": "Once you know the number, just follow the yellow signs blindly.",
        "zh": "只要知道是「幾號出口」，跟著黃色指示牌走就能到達。"
      },
      "icon": "🤔"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "C13b出口 (皇居への特等席)",
        "en": "Exit C13b (Imperial Palace Access)",
        "zh": "C13b 出口 (通往皇居的特等席)"
      },
      "description": {
        "ja": "パレスホテル直結のC13b出口を出ると、目の前が皇居のお堀です。都心とは思えない静けさで散歩に最適。",
        "en": "Exit C13b (connected to Palace Hotel) leads right to the Imperial Palace moat. A quiet, scenic spot for a walk.",
        "zh": "從與皇宮飯店直結的 C13b 出口出來，眼前就是皇居的護城河。是一個安靜優美、適合散步的好地方。"
      },
      "icon": "🌳"
    },
    {
      "title": {
        "ja": "地下直結 (雨に濡れない移動)",
        "en": "Underground Network",
        "zh": "地下連通網"
      },
      "description": {
        "ja": "大手町から東京駅、日比谷、二重橋前まで地下通路で繋がっています。雨の日は地下移動が最強のハックです。",
        "en": "Connected underground to Tokyo Station, Hibiya, and Nijubashimae. The ultimate hack for rainy days.",
        "zh": "大手町與東京站、日比谷、二重橋前皆有地下通道相連。這是雨天移動的最強攻略。"
      },
      "icon": "☂️"
    }
  ]
}
$$::jsonb
WHERE id LIKE 'odpt.Station:TokyoMetro.%Otemachi';
