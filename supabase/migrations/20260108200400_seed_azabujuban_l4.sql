-- Azabu-juban L4 Knowledge (Traps & Hacks)
UPDATE nodes
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "南北線と大江戸線の距離",
        "en": "Namboku vs Oedo Distance",
        "zh": "南北線與大江戶線的距離"
      },
      "description": {
        "ja": "同じ駅名ですが、乗り換えには改札外を通る必要があり、徒歩7〜10分かかります。意外と遠いので注意。",
        "en": "Same station name, but transfer requires walking outside the gates for 7-10 mins. It's surprisingly far.",
        "zh": "雖是同一站名，但轉乘需要出站走 7-10 分鐘。意外地遠，請注意。"
      },
      "advice": {
        "ja": "乗り換え時間は余裕を持って見ておきましょう。",
        "en": "Budget extra time for this transfer.",
        "zh": "轉乘時間請預留充裕。"
      },
      "icon": "🚶"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "商店街への最短出口",
        "en": "Best Exit for Shopping St.",
        "zh": "往商店街的最佳出口"
      },
      "description": {
        "ja": "麻布十番商店街へ行くなら「4番出口」がメインストリートの入り口に一番近いです。",
        "en": "For the Azabu-juban Shopping Street, Exit 4 lands you right at the entrance of the main street.",
        "zh": "要去麻布十番商店街的話，「4 號出口」離主要街道入口最近。"
      },
      "icon": "🛍️"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%AzabuJuban%';
