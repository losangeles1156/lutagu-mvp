-- Akasaka-mitsuke L4 Knowledge (Traps & Hacks)
UPDATE nodes 
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "永田町駅も実は同じ駅",
        "en": "Hidden Connection to Nagatacho",
        "zh": "永田町站其實是同一站"
      },
      "description": {
        "ja": "赤坂見附駅と永田町駅は改札内でつながっていますが、ホーム間の移動は結構距離があります（徒歩5分以上）。",
        "en": "Akasaka-mitsuke and Nagatacho are connected inside the gates, but the walk between platforms is surprisingly long (5+ mins).",
        "zh": "赤坂見附站與永田町站雖然改札內相通，但月台之間的移動距離頗遠（步行 5 分鐘以上）。"
      },
      "advice": {
        "ja": "半蔵門線・有楽町線・南北線への乗り換えは時間に余裕を持って。",
        "en": "Allow extra time when transferring to Hanzomon, Yurakucho, or Namboku lines.",
        "zh": "轉乘半藏門線、有樂町線或南北線時，請預留充裕時間。"
      },
      "icon": "🚶"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "0分乗り換え (銀座線⇔丸ノ内線)",
        "en": "0-Minute Transfer",
        "zh": "0 分鐘轉乘神技"
      },
      "description": {
        "ja": "東京の地下鉄で最強の乗り換え駅。銀座線と丸ノ内線が同じホームの向かい側に停まるため、3秒で乗り換え可能です。",
        "en": "The best transfer in Tokyo. Ginza and Marunouchi lines stop on opposite sides of the SAME platform. Transfer in 3 seconds.",
        "zh": "東京地鐵最強轉乘站。銀座線與丸之內線停靠在同一月台的兩側，3 秒鐘即可完成轉乘。"
      },
      "advice": {
        "ja": "新宿方面⇔渋谷方面の乗り換えはここで！",
        "en": "Transfer here between Shinjuku and Shibuya directions!",
        "zh": "往返新宿⇔澀谷方向請在此轉乘！"
      },
      "icon": "⚡"
    },
    {
      "title": {
        "ja": "ビックカメラ直結",
        "en": "Bic Camera Direct",
        "zh": "Bic Camera 直結"
      },
      "description": {
        "ja": "ベルビー赤坂口を出ると、ビックカメラに直結しています。急な買い物や雨宿りに便利。",
        "en": "Direct access to Bic Camera from the Belle Vie Akasaka exit. Convenient for quick shopping or escaping rain.",
        "zh": "從 Belle Vie 赤坂口出來，直接連通 Bic Camera。急需購物或躲雨時非常方便。"
      },
      "icon": "📷"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%AkasakaMitsuke';
