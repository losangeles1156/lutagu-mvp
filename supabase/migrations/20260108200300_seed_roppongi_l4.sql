-- Roppongi L4 Knowledge (Traps & Hacks)
UPDATE nodes
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "大江戸線のホームは地下深く",
        "en": "Deep Oedo Line",
        "zh": "大江戶線月台深不可測"
      },
      "description": {
        "ja": "大江戸線の六本木駅は地下5階〜7階にあり、地上に出るまで5分以上かかります。日比谷線への乗り換えも遠いです。",
        "en": "The Oedo Line station is extremely deep (B5-B7). Takes 5+ mins just to reach the surface. Transfer to Hibiya Line is also a trek.",
        "zh": "大江戶線的六本木站位於地下 5 到 7 層，到地面需要 5 分鐘以上。轉乘日比谷線也很遠。"
      },
      "advice": {
        "ja": "六本木ヒルズへは日比谷線改札の方が近くて便利です。",
        "en": "For Roppongi Hills, the Hibiya Line gates are much closer/easier.",
        "zh": "去六本木之丘的話，走日比谷線改札比較近且方便。"
      },
      "icon": "⏬"
    },
    {
      "title": {
        "ja": "アマンド前は激混み",
        "en": "Almond Meeting Spot Crowds",
        "zh": "Almond 前人潮洶湧"
      },
      "description": {
        "ja": "定番の待ち合わせ場所「アマンド前」は、金曜夜などは人が多すぎて相手が見つかりません。",
        "en": "The classic meeting spot in front of \"Almond\" cafe is too crowded on Friday nights. You won't find your friend.",
        "zh": "經典會合點「Almond 咖啡廳前」，週五晚上等人多到根本找不到對方。"
      },
      "icon": "👯"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "ミッドタウン直結 (大江戸線)",
        "en": "Midtown Direct (Oedo Line)",
        "zh": "Midtown 直結 (大江戶線)"
      },
      "description": {
        "ja": "東京ミッドタウンへ行くなら、大江戸線の改札（8番出口方面）から直結通路があります。雨に濡れずに行けます。",
        "en": "Direct underground access to Tokyo Midtown from the Oedo Line gates (Exit 8). No umbrella needed.",
        "zh": "若要去東京中城 (Midtown)，大江戶線改札（往 8 號出口方向）有直結通道。下雨天也不怕。"
      },
      "icon": "🏙️"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Roppongi%';
