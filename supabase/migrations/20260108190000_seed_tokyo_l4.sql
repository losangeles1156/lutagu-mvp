-- Tokyo L4 Knowledge (Traps & Hacks)
UPDATE nodes
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "京葉線の罠 (夢の国への遠い道のり)",
        "en": "The Keiyo Line Trap",
        "zh": "京葉線的陷阱 (通往夢之國的遙遠路途)"
      },
      "description": {
        "ja": "京葉線（ディズニーランド方面）のホームは、他のJR線から500m以上離れており、乗り換えに15〜20分かかります。",
        "en": "The Keiyo Line platform (for Disneyland) is notoriously far (>500m) from other lines. Allow 15-20 mins for transfer.",
        "zh": "京葉線（往迪士尼方向）的月台距離其他 JR 線超過 500 公尺，轉乘請預留 15-20 分鐘。"
      },
      "advice": {
        "ja": "「八重洲南口」方面の表示を目印に進んでください。余裕を持った行動を！",
        "en": "Follow signs for \"Yaesu South Exit\" to get closer. Don't underestimate the distance.",
        "zh": "請沿著「八重洲南口」方向的指示前進。請務必預留充足時間！"
      },
      "icon": "🏃"
    },
    {
      "title": {
        "ja": "丸の内口 vs 八重洲口",
        "en": "Marunouchi vs. Yaesu",
        "zh": "丸之內口 vs 八重洲口"
      },
      "description": {
        "ja": "「丸の内」は皇居・レトロな駅舎側。「八重洲」は新幹線・大丸・バス乗り場側です。間違えると移動が大変です。",
        "en": "\"Marunouchi\" is the West side (Imperial Palace, red brick station). \"Yaesu\" is the East side (Shinkansen, Daimaru, Bus Terminal).",
        "zh": "「丸之內」位於西側（皇居、紅磚車站建築）。「八重洲」位於東側（新幹線、大丸百貨、巴士總站）。"
      },
      "advice": {
        "ja": "新幹線利用なら「八重洲」、皇居観光なら「丸の内」へ。",
        "en": "Use \"Yaesu\" for Bullet Trains (Shinkansen). Use \"Marunouchi\" for sightseeing.",
        "zh": "搭乘新幹線請走「八重洲」，觀光皇居請走「丸之內」。"
      },
      "icon": "↔️"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "北自由通路 (改札外の抜け道)",
        "en": "North Free Passage",
        "zh": "北自由通路 (改札外通道)"
      },
      "description": {
        "ja": "入場券を買わずに「丸の内側」と「八重洲側」を行き来できる改札外の通路です。北口側にあります。",
        "en": "A seamless passageway connecting Marunouchi and Yaesu sides without entering the ticket gates. Located at the North side.",
        "zh": "位於北側，無需購買月台票即可往返「丸之內側」和「八重洲側」的改札外通道。"
      },
      "icon": "🚶"
    },
    {
      "title": {
        "ja": "グランスタ東京 (駅ナカ迷宮)",
        "en": "Gransta Tokyo (Station Labyrinth)",
        "zh": "Gransta Tokyo (站內迷宮)"
      },
      "description": {
        "ja": "改札内最大級のショッピングエリア。お土産や駅弁はここで揃いますが、広すぎて迷います。銀の鈴待ち合わせ場所が目印。",
        "en": "Huge shopping area inside gates. Great for bento/souvenirs, but easy to get lost. Use 'Silver Bell' as a meeting point.",
        "zh": "改札內最大的購物區。雖然便當和伴手禮很齊全，但容易迷路。請以「銀之鈴」作為會合點。"
      },
      "icon": "🍱"
    }
  ]
}
$$::jsonb
WHERE id = 'odpt.Station:JR-East.Tokyo';
