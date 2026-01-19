-- Ikebukuro L4 Knowledge (Traps & Hacks)
-- Updating all Ikebukuro nodes (JR and Metro)
UPDATE nodes
SET riding_knowledge = $$
{
  "traps": [
    {
      "title": {
        "ja": "東口は西武、西口は東武",
        "en": "East is Seibu, West is Tobu",
        "zh": "東口是西武，西口是東武"
      },
      "description": {
        "ja": "デパートの名前と出口の方角が逆です。「東(East)」に行きたいなら「西武(Seibu)」側、「西(West)」に行きたいなら「東武(Tobu)」側です。",
        "en": "The department store names are inverse to the exits. \"East Exit\" has \"Seibu\" (West Electric). \"West Exit\" has \"Tobu\" (East Electric). Don't trust the Kanji logic!",
        "zh": "百貨公司名稱與出口方向相反。「東口」有「西武 (Seibu)」，「西口」有「東武 (Tobu)」。千萬別被漢字騙了！"
      },
      "advice": {
        "ja": "歌を思い出しましょう：「不思議な不思議な池袋、東が西武で西東武〜♪」",
        "en": "Just memorize: East = Seibu, West = Tobu.",
        "zh": "請記住口訣：「神奇的池袋，東邊是西武，西邊是東武～♪」"
      },
      "icon": "😵‍💫"
    },
    {
      "title": {
        "ja": "北口の治安",
        "en": "North Exit Nightlife",
        "zh": "北口的治安"
      },
      "description": {
        "ja": "「北口（現在は西口（北））」周辺は繁華街で、夜は客引きも多いエリアです。静かな場所を好むなら他の出口へ。",
        "en": "The \"North Exit\" (now West Exit North) area is a bustling nightlife district. Expect touts and crowds at night.",
        "zh": "「北口（現稱西口（北））」周邊是繁華街，晚上有很多拉客的人。喜歡安靜的話請走其他出口。"
      },
      "advice": {
        "ja": "サンシャインシティに行くなら「東口」の「35番出口」が便利です。",
        "en": "For Sunshine City, use \"East Exit 35\".",
        "zh": "若要去 Sunshine City，走「東口」的「35 號出口」最方便。"
      },
      "icon": "🏮"
    }
  ],
  "hacks": [
    {
      "title": {
        "ja": "オレンジロード (地下の抜け道)",
        "en": "Orange Road (Underground Shortcut)",
        "zh": "Orange Road (地下橘色大道)"
      },
      "description": {
        "ja": "西口と東口をつなぐ地下通路。中央通路より空いており、オレンジ色のラインが目印です。",
        "en": "An underground passage connecting West and East sides. Less crowded than the central corridor. Look for the orange line.",
        "zh": "連接西口和東口的地下通道。比中央通道人少，請沿著橘色線條走。"
      },
      "icon": "🟠"
    },
    {
      "title": {
        "ja": "ISP (池袋ショッピングパーク)",
        "en": "ISP Underground Shopping",
        "zh": "ISP (池袋購物公園)"
      },
      "description": {
        "ja": "東口の地下に広がる食品街。デパ地下よりリーズナブルにお惣菜が買えます。雨の日の移動にも便利。",
        "en": "A vast underground food market at the East Exit. Great for reasonably priced deli food and staying dry.",
        "zh": "東口地下的廣大食品街。比起百貨公司地下街更平價。雨天移動也很方便。"
      },
      "icon": "🛍️"
    }
  ]
}
$$::jsonb
WHERE id LIKE '%Ikebukuro';
