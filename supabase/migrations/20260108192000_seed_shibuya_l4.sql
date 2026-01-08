-- Shibuya L4 Knowledge (Traps & Hacks)
-- Updating all Shibuya nodes (JR and Metro) to ensure coverage
UPDATE nodes 
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "銀座線は地上3階、他は地下深く",
        "en": "The Vertical Labyrinth (Ginza Line is high up)",
        "zh": "垂直迷宮 (銀座線在 3F)"
      },
      "description": {
        "ja": "銀座線のホームは地上3階にありますが、副都心線や東横線は地下5階です。乗り換えには垂直移動で10分以上かかります。",
        "en": "The Ginza Line is on the 3rd floor, while the Fukutoshin/Toyoko Lines are deep underground (B5). Transfers involve massive vertical travel (>10 mins).",
        "zh": "銀座線月台位於地上 3 樓，但副都心線和東橫線位於地下 5 樓。轉乘需要垂直移動超過 10 分鐘。"
      },
      "advice": {
        "ja": "「ヒカリエ改札」を利用すると、比較的スムーズに移動できます。",
        "en": "Use the \"Hikarie Gate\" for a slightly smoother vertical transition.",
        "zh": "利用「Hikarie 改札」可以相對順暢地移動。"
      },
      "icon": "🧗"
    },
    {
      "title": {
        "ja": "ハチ公口 vs モヤイ像",
        "en": "Hachiko vs. Moyai (Meeting Spots)",
        "zh": "八公口 vs 摩埃像"
      },
      "description": {
        "ja": "待ち合わせの定番ですが、ハチ公（北側）とモヤイ像（南西側）は駅の反対側にあります。間違えると人混みで戻れません。",
        "en": "Hachiko (North) and Moyai Statue (South-West) are on opposite sides of the station. Mixing them up means fighting through the scramble crossing crowd.",
        "zh": "雖然是經典會合點，但八公（北側）和摩埃像（西南側）位於車站的相反兩側。搞錯的話很難穿過人潮走回來。"
      },
      "advice": {
        "ja": "混雑を避けるなら「モヤイ像」や「マークシティ下」がおすすめ。",
        "en": "For less crowded meetups, choose \"Moyai Statue\" or \"Mark City\" area.",
        "zh": "想避開人潮的話，推薦「摩埃像」或「Mark City 下方」。"
      },
      "icon": "🐕"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "渋谷ストリーム改札 (人混み回避)",
        "en": "Shibuya Stream Exit (Crowd Evasion)",
        "zh": "Shibuya Stream 出口 (避開人潮)"
      },
      "description": {
        "ja": "スクランブル交差点を渡らずに、南側のエリア（渋谷ストリーム、Google方面）へ直接アクセスできる穴場改札です。",
        "en": "A direct exit to the south side (Shibuya Stream, Google) that completely bypasses the chaos of the Scramble Crossing.",
        "zh": "無需經過著名的十字路口，可直接通往南側區域（Shibuya Stream、Google 方向）的隱藏改札口。"
      },
      "icon": "🌊"
    },
    {
      "title": {
        "ja": "マークシティ連絡通路 (井の頭線へ)",
        "en": "Mark City Connector (To Inokashira Line)",
        "zh": "Mark City 連通道 (往井之頭線)"
      },
      "description": {
        "ja": "JRと井の頭線の乗り換えは、マークシティ内の通路を使うと雨に濡れず、人混みも比較的少ないです。",
        "en": "Use the Mark City walkway for a roofed, less crowded transfer between JR and the Inokashira Line.",
        "zh": "JR 與井之頭線的轉乘，利用 Mark City 內的通道既不淋雨，人潮也相對較少。"
      },
      "icon": "🏢"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Shibuya';
