-- Akihabara L4 Knowledge (Traps & Hacks)
UPDATE nodes 
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "電気街口 vs 昭和通り口",
        "en": "Electric Town vs. Showa-dori",
        "zh": "電氣街口 vs 昭和通口"
      },
      "description": {
        "ja": "「電気街口」はアニメ・ゲーム・メイドカフェ方面。「昭和通り口」はオフィス街です。反対側行くと雰囲気が全く違います。",
        "en": "\"Electric Town Exit\" leads to anime/games/maid cafes. \"Showa-dori Exit\" leads to office buildings. They are worlds apart.",
        "zh": "「電氣街口」通往動漫、遊戲、女僕咖啡廳。「昭和通口」則是辦公商圈。走錯邊氣氛完全不同。"
      },
      "advice": {
        "ja": "オタク文化を楽しむなら迷わず「電気街口」へ！",
        "en": "For otaku culture, head straight for the \"Electric Town Exit\"!",
        "zh": "想體驗御宅文化，請毫不猶豫地走「電氣街口」！"
      },
      "icon": "⚡"
    },
    {
      "title": {
        "ja": "つくばエクスプレスの深さ",
        "en": "Deep Tsukuba Express",
        "zh": "筑波快線的深度"
      },
      "description": {
        "ja": "つくばエクスプレスの秋葉原駅は地下深くにあります。JRからの乗り換えは時間がかかるので注意。",
        "en": "The Tsukuba Express station is located deep underground. Allow extra time for transferring from JR lines.",
        "zh": "筑波快線的秋葉原站位於地底深處。從 JR 轉乘需要花費較多時間，請注意。"
      },
      "icon": "⏬"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "アトレ1改札 (デパート直結)",
        "en": "Atre 1 Gate (Direct Access)",
        "zh": "Atre 1 改札 (百貨直結)"
      },
      "description": {
        "ja": "電気街口の改札から直結する「アトレ秋葉原1」。雨に濡れずにショッピングやコラボイベントを楽しめます。",
        "en": "Directly connected to the Electric Town gate. Shop for anime collabs at Atre 1 without stepping into the rain.",
        "zh": "與電氣街口改札直結的「Atre 秋葉原 1」。無需淋雨即可享受購物或聯名活動。"
      },
      "icon": "🏬"
    },
    {
      "title": {
        "ja": "東西自由通路",
        "en": "East-West Passage",
        "zh": "東西自由通路"
      },
      "description": {
        "ja": "駅の北側にある、電気街側と昭和通り側をつなぐ通路。改札に入らずに反対側へ抜けられます。",
        "en": "A passage on the north side connecting Electric Town and Showa-dori sides. Cross without entering the ticket gates.",
        "zh": "位於車站北側，連接電氣街側與昭和通側的通道。無需進改札即可穿過到對面。"
      },
      "icon": "🚶"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Akihabara';
