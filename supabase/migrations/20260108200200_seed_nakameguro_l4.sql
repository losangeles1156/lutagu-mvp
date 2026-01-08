-- Nakameguro L4 Knowledge (Traps & Hacks)
UPDATE nodes 
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "同じホームの方向罠",
        "en": "Direction Trap",
        "zh": "同月台的方向陷阱"
      },
      "description": {
        "ja": "東横線と日比谷線は同じホームで対面乗り換えできますが、行き先を間違えやすいです。「横浜方面」と「北千住方面」をよく確認して！",
        "en": "Toyoko and Hibiya lines share the same platform for cross-transfer. It's easy to hop on the wrong train. Check \"Yokohama\" vs \"Kitasenju\" signs!",
        "zh": "東橫線與日比谷線可以在同一月台對面轉乘，但很容易搭錯邊。請務必確認是往「橫濱」還是往「北千住」！"
      },
      "advice": {
        "ja": "始発で座りたいなら、日比谷線（2番線）を狙いましょう。",
        "en": "To get a seat, aim for the Hibiya Line starting here (Platform 2).",
        "zh": "如果是日比谷線始發車（2號線），有機會搶到座位。"
      },
      "icon": "😵"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "桜の季節の裏ルート",
        "en": "Cherry Blossom Secret Route",
        "zh": "櫻花季的祕密路徑"
      },
      "description": {
        "ja": "目黒川の桜並木へは「正面改札」は大混雑します。「南改札」から出ると少し遠回りですが、人混みを回避して川沿いに出られます。",
        "en": "During Sakura season, the main gate is a crush. Use the \"South Ticket Gate\". A bit of a detour, but avoids the worst crowds.",
        "zh": "前往目黑川賞櫻時，「正面改札」會非常擁擠。雖然從「南改札」出去稍微繞路，但能避開人潮走到河邊。"
      },
      "icon": "🌸"
    },
    {
      "title": {
        "ja": "蔦屋書店 (待ち合わせ＆休憩)",
        "en": "Tsutaya Books",
        "zh": "蔦屋書店 (會合＆休憩)"
      },
      "description": {
        "ja": "高架下にあるお洒落な書店＆スタバ。改札出てすぐなので、待ち合わせや時間調整に便利です。",
        "en": "Stylish bookstore & Starbucks under the tracks. Right outside the gate, perfect for meeting up or killing time.",
        "zh": "位於高架下的時髦書店＆星巴克。出改札即達，非常適合等人或消磨時間。"
      },
      "icon": "☕"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%NakaMeguro%' OR id LIKE '%Nakameguro%';
