-- Shinjuku L4 Knowledge (Traps & Hacks)
UPDATE nodes
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "「中央東口」と「東口」は別物",
        "en": "Central East vs. East Exit",
        "zh": "「中央東口」與「東口」是不同的"
      },
      "description": {
        "ja": "「中央東口」は改札内にあります。「東口」は改札を出てアルタ前などに行くための出口です。歌舞伎町へは「東口」が便利です。",
        "en": "The \"Central East Exit\" is confusingly named—it is often inside the gate area or leads to a different spot than the main \"East Exit\" (Alta/Kabukicho). Use the standard \"East Exit\" for Kabukicho.",
        "zh": "「中央東口」容易混淆，它通常位於改札口內或通往與主要「東口」（Alta/歌舞伎町）不同的地方。去歌舞伎町請使用標準的「東口」。"
      },
      "advice": {
        "ja": "歌舞伎町やアルタ前なら「東口」へ。",
        "en": "For Kabukicho/Alta, stick to the simple \"East Exit\".",
        "zh": "若要去歌舞伎町或 Alta，請務必走「東口」。"
      },
      "icon": "🚧"
    },
    {
      "title": {
        "ja": "新南口は遠い",
        "en": "New South Gate is Isolated",
        "zh": "新南口非常遠"
      },
      "description": {
        "ja": "高島屋やバスタ新宿には便利ですが、歌舞伎町や西口方面へは非常に遠いです。",
        "en": "Convenient for Takashimaya and the Bus Terminal (Busta), but extremely far from Kabukicho or the West Exit area.",
        "zh": "雖然離高島屋和巴士總站（Busta）很近，但距離歌舞伎町或西口非常遠。"
      },
      "icon": "🏃"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "メトロプロムナード (地下トンネル)",
        "en": "Metro Promenade Tunnel",
        "zh": "Metro Promenade (地下通道)"
      },
      "description": {
        "ja": "新宿駅と新宿三丁目駅をつなぐ長い地下通路。雨の日でも濡れずに伊勢丹や映画館へアクセスできます。",
        "en": "A long underground tunnel connecting Shinjuku Station to Shinjuku-sanchome. Perfect for reaching Isetan or cinemas without getting wet in the rain.",
        "zh": "連接新宿站和新宿三丁目站的長地下通道。下雨天也能不淋濕地前往伊勢丹或電影院。"
      },
      "icon": "🚇"
    },
    {
      "title": {
        "ja": "大江戸線の罠",
        "en": "Oedo Line Confusion",
        "zh": "大江戶線的陷阱"
      },
      "description": {
        "ja": "大江戸線の「新宿駅」は南側にあり、「新宿西口駅」は西側にあります。乗り換え時は注意。",
        "en": "The Oedo Line has \"Shinjuku\" (South) and \"Shinjuku-Nishiguchi\" (West). They are separate stations. Check which one is closer to your destination.",
        "zh": "大江戶線有「新宿站」（南側）和「新宿西口站」（西側）。它們是分開的車站，請確認哪個離你的目的地較近。"
      },
      "icon": "🌀"
    }
  ]
}
$$::jsonb
WHERE id = 'odpt.Station:JR-East.Shinjuku';
