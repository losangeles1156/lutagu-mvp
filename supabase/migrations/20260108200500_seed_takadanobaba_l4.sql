-- Takadanobaba L4 Knowledge (Traps & Hacks)
UPDATE nodes 
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "朝の学生ラッシュ",
        "en": "Morning Student Rush",
        "zh": "早晨的學生大軍"
      },
      "description": {
        "ja": "早稲田大学などの学生で、朝の通学時間帯は駅も歩道も溢れかえります。",
        "en": "In the morning, the station and sidewalks are flooded with Waseda University students.",
        "zh": "早上上學時段，車站和人行道都會擠滿早稻田大學等的學生。"
      },
      "advice": {
        "ja": "8:30〜9:00頃は混雑のピークです。",
        "en": "Peak congestion is around 8:30-9:00 AM.",
        "zh": "8:30〜9:00 左右是擁擠高峰。"
      },
      "icon": "🎒"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "BIG BOX (定番待ち合わせ)",
        "en": "BIG BOX (Meeting Spot)",
        "zh": "BIG BOX (經典會合點)"
      },
      "description": {
        "ja": "駅早稲田口を出てすぐ右にある大きなビル「BIG BOX」前は、馬場で一番わかりやすい待ち合わせ場所です。",
        "en": "Createad right outside the Waseda Exit. The \"BIG BOX\" building is the most iconic meeting spot in Baba.",
        "zh": "位於早稻田口出來右側的大樓「BIG BOX」前，是馬場最好認的會合地點。"
      },
      "advice": {
        "ja": "改札を出たら「BIG BOX」を目指せば間違いありません。",
        "en": "Just aim for the \"BIG BOX\" after exiting the gates.",
        "zh": "出改札後認準「BIG BOX」準沒錯。"
      },
      "icon": "📦"
    },
    {
      "title": {
        "ja": "東西線乗り換え (専用改札)",
        "en": "Tozai Line Transfer Gate",
        "zh": "東西線轉乘 (專用改札)"
      },
      "description": {
        "ja": "JRと東西線の乗り換えには専用の連絡改札があります。いちいち外に出る必要はありません。",
        "en": "There is a direct transfer gate between JR and Tozai Line. No need to go outside.",
        "zh": "JR 與東西線之間有專用的連絡改札。不需要特地出站。"
      },
      "icon": "🚇"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Takadanobaba%';
