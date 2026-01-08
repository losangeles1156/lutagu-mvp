-- Kita-senju L4 Knowledge (Traps & Hacks)
UPDATE nodes 
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "階層の迷宮 (B2〜3F)",
        "en": "The Layered Labyrinth",
        "zh": "樓層迷宮 (B2〜3F)"
      },
      "description": {
        "ja": "千代田線は地下2階、東武線・日比谷線は地上1F〜3Fに分かれています。乗り換えにはエスカレーターを何度も乗り継ぐ必要があります。",
        "en": "Chiyoda Line is B2. Tobu/Hibiya Lines are 1F-3F. Transferring feels like playing Snakes and Ladders with escalators.",
        "zh": "千代田線在地下 2 樓，東武線/日比谷線在地上 1F-3F。轉乘需要像玩蛇梯棋一樣不斷搭乘手扶梯。"
      },
      "advice": {
        "ja": "時間に余裕を持ち、案内板の「路線カラー」を信じて進んでください。",
        "en": "Trust the line colors on the signs and allow extra time.",
        "zh": "請預留時間，並相信指示牌上的「路線顏色」前進。"
      },
      "icon": "🪜"
    },
    {
      "title": {
        "ja": "千代田線 vs 常磐線",
        "en": "Chiyoda vs. Joban Line",
        "zh": "千代田線 vs 常磐線"
      },
      "description": {
        "ja": "この駅では千代田線（地下鉄）と常磐線（JR）が直通運転しており、同じホームに来ることがあります。行き先に注意。",
        "en": "Chiyoda Subway and JR Joban Line run through tracks here. Check the train destination carefully.",
        "zh": "此站千代田線（地鐵）與常磐線（JR）直通運轉，可能會停靠同一月台。請注意列車開往哪裡。"
      },
      "icon": "⚠️"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "ルミネ & 丸井 (買い物天国)",
        "en": "Lumine & Marui",
        "zh": "Lumine & OIOI (購物天堂)"
      },
      "description": {
        "ja": "駅直結でルミネとマルイがあります。都心に出なくてもファッションやグルメはここで全て揃います。",
        "en": "Directly connected to Lumine and Marui malls. You can find all fashion and food needs here without going to Shinjuku/Shibuya.",
        "zh": "車站直結 Lumine 和 Marui。無需去市中心，這裡就能搞定所有時尚與美食需求。"
      },
      "icon": "🛍️"
    },
    {
      "title": {
        "ja": "学園都市の安い飯",
        "en": "Student City Cheap Eats",
        "zh": "學園都市的平價美食"
      },
      "description": {
        "ja": "近くに大学が多いため、安くてボリュームのある飲食店が路地裏に沢山あります。探検してみましょう。",
        "en": "Due to many universities nearby, back alleys are filled with cheap and hearty restaurants. Worth exploring.",
        "zh": "附近大學眾多，巷弄裡充滿了便宜又大碗的美食。值得探索一番。"
      },
      "icon": "🍜"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%KitaSenju' OR id LIKE '%Kita-senju';
