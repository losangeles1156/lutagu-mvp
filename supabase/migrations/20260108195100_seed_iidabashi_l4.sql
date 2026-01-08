-- Iidabashi L4 Knowledge (Traps & Hacks)
UPDATE nodes 
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "東西線への乗り換え地獄",
        "en": "Tozai Line Transfer Hell",
        "zh": "東西線轉乘地獄"
      },
      "description": {
        "ja": "東西線の飯田橋駅は、他の路線（有楽町・南北・大江戸・JR）から非常に離れています。乗り換えに10分以上見てください。",
        "en": "The Tozai Line platform is extremely far from other lines (Yurakucho, Namboku, Oedo, JR). Allow 10+ mins for transfer.",
        "zh": "東西線的飯田橋站距離其他路線（有樂町、南北、大江戶、JR）非常遠。轉乘請預留 10 分鐘以上。"
      },
      "advice": {
        "ja": "九段下や大手町での乗り換えも検討してください。",
        "en": "Consider transferring at Kudanshita or Otemachi instead.",
        "zh": "請考慮改在九段下或大手町轉乘。"
      },
      "icon": "😫"
    },
    {
      "title": {
        "ja": "B2a出口の罠 (急坂)",
        "en": "Exit B2a Steep Slope",
        "zh": "B2a 出口的陷阱 (急坡)"
      },
      "description": {
        "ja": "B2a出口を出ると、神楽坂下交差点ですが、そこから神楽坂は結構な急坂です。荷物が多い時は注意。",
        "en": "Exit B2a leads to Kagurazaka-shita, but the hill up Kagurazaka is quite steep. Be careful with heavy luggage.",
        "zh": "從 B2a 出口出來是神樂坂下路口，但接下來的神樂坂坡度頗陡。行李多時請注意。"
      },
      "icon": "🏔️"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "カナルカフェ (水辺の休憩所)",
        "en": "Canal Cafe (Oasis)",
        "zh": "Canal Cafe (水邊休憩處)"
      },
      "description": {
        "ja": "お堀沿いにあるレストラン＆カフェ。都心にいながら水辺でゆっくりできる貴重なスポットです。春は桜が絶景。",
        "en": "A restaurant/cafe along the moat. A rare spot to relax by the water in the city center. Stunning cherry blossoms in spring.",
        "zh": "沿著護城河的餐廳兼咖啡廳。是市中心少數能享受水邊寧靜的景點。春天櫻花盛開時絕美。"
      },
      "icon": "🌸"
    },
    {
      "title": {
        "ja": "RAMLA (穴場駅ビル)",
        "en": "RAMLA (Hidden Mall)",
        "zh": "RAMLA (隱密商場)"
      },
      "description": {
        "ja": "JRと地下鉄の連絡通路にあるショッピングモール。スーパーや飲食店があり、混雑も少なめで便利です。",
        "en": "Shopping mall located in the connection passage between JR and Subway. Has a supermarket and restaurants, usually less crowded.",
        "zh": "位於 JR 與地鐵連通道的購物中心。有超市和餐飲店，人潮較少，非常方便。"
      },
      "icon": "🛍️"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Iidabashi';
