/**
 * L4 Expert Knowledge Base - LEGACY DATA
 *
 * @deprecated This file contains legacy hardcoded data.
 * Please use the Single Source of Truth (SSoT) instead:
 * src/data/tokyo_transit_knowledge_base.md
 *
 * New knowledge should be added to the Markdown file, and then run:
 * `npm run sync:knowledge` (or `tsx scripts/sync_knowledge.ts`)
 *
 * The API routes and services are refactored to prioritize the SSoT
 * generated JSON (src/data/knowledge_base.json).
 */

import { StationLineDef, LocaleString } from '../constants/stationLines';

// ============================================================
// RAILWAY LINE EXPERT KNOWLEDGE (LEGACY - DO NOT ADD NEW)
// ============================================================

export const RAILWAY_EXPERT_TIPS: Record<string, Array<{
    icon: string;
    text: string;
    category: 'warning' | 'tip' | 'pass' | 'accessibility' | 'crowd';
}>> = {
    // --- Tokyo Metro Lines ---
    'odpt.Railway:TokyoMetro.Ginza': [
        { icon: '💡', text: '銀座線是日本最早的地下鐵（1927年開業），月台較窄，攜帶大行李時請多留意。', category: 'tip' },
        { icon: '💡', text: '銀座線車廂較小，尖峰時段（08:00-09:30）非常擁擠，建議避開。', category: 'crowd' },
        { icon: '🎫', text: '適合使用「東京地鐵 24/48/72 小時券」，單日搭乘 3 次以上即划算。', category: 'pass' },
        { icon: '⚠️', text: '部分車站（如表參道）與其他線路轉乘距離較遠。', category: 'warning' }
    ],
    'odpt.Railway:TokyoMetro.Marunouchi': [
        { icon: '💡', text: '丸之內線部分車站月台與車廂間隙較大，推嬰兒車請小心上下車。', category: 'tip' },
        { icon: '💡', text: '在赤坂見附站可與銀座線進行「零距離」同月台轉乘，非常方便。', category: 'tip' },
        { icon: '🎫', text: '全線適用東京地鐵券，與 JR 線無直通。', category: 'pass' }
    ],
    'odpt.Railway:TokyoMetro.Hibiya': [
        { icon: '💡', text: '日比谷線直通 JR 東日本（北千住～中目黑），是重要的跨公司轉乘線。', category: 'tip' },
        { icon: '⚠️', text: '惠比壽站轉乘山坡電梯，攜帶大行李建議使用其他出口。', category: 'warning' },
        { icon: '💡', text: '中目黑站出站即為賞櫻勝地目黑川。', category: 'tip' }
    ],
    'odpt.Railway:TokyoMetro.Tozai': [
        { icon: '💡', text: '東西線直通 JR 中央線（主要為三鷹方向），是重要的跨公司線。', category: 'tip' },
        { icon: '💡', text: '九段下站可轉乘半蔵門線，步行距離中等。', category: 'tip' },
        { icon: '🎫', text: '適用東京地鐵券，但三鷹～西船橋 JR 段需另外購票。', category: 'pass' }
    ],
    'odpt.Railway:TokyoMetro.Chiyoda': [
        { icon: '💡', text: '千代田線直通 JR 常磐線（取手方向），是前往郊區的重要線路。', category: 'tip' },
        { icon: '⚠️', text: '代代木上原站轉乘小田急線需出站，請預留時間。', category: 'warning' },
        { icon: '💡', text: '北千住站是日比谷線與 JR 常磐線的轉乘大站。', category: 'tip' }
    ],
    'odpt.Railway:TokyoMetro.Yurakucho': [
        { icon: '💡', text: '有樂町線與副都心線在大站直通運轉，注意終點站指示。', category: 'tip' },
        { icon: '💡', text: '豐洲站可轉乘百合海鷗號前往台場。', category: 'tip' },
        { icon: '🎫', text: '適用東京地鐵券。', category: 'pass' }
    ],
    'odpt.Railway:TokyoMetro.Hanzomon': [
        { icon: '💡', text: '半蔵門線直通 東急電鐵（澀谷～中央林間）與 東武伊勢崎線（久喜～日光）。', category: 'tip' },
        { icon: '⚠️', text: '澀谷站轉乘距離長，建議預留 10 分鐘以上。', category: 'warning' },
        { icon: '💡', text: '住吉站可轉乘都營新宿線。', category: 'tip' }
    ],
    'odpt.Railway:TokyoMetro.Namboku': [
        { icon: '💡', text: '南北線直通 目黑線（目黑～日吉）與 埼玉高速鐵道（赤羽岩淵～見沼）。', category: 'tip' },
        { icon: '💡', text: '赤羽岩淵站可與埼玉高速鐵道轉乘。', category: 'tip' },
        { icon: '🎫', text: '適用東京地鐵券。', category: 'pass' }
    ],
    'odpt.Railway:TokyoMetro.Fukutoshin': [
        { icon: '💡', text: '副都心線與 東急東橫線、西武有樂町線直通運轉，需特別留意終點站。', category: 'tip' },
        { icon: '⚠️', text: '月台通常位於地下深處，轉乘請預留足夠時間。', category: 'warning' },
        { icon: '💡', text: '小竹向原站是重要的分支點，須確認乘車方向。', category: 'tip' }
    ],

    // --- Toei Subway Lines ---
    'odpt.Railway:Toei.Asakusa': [
        { icon: '💡', text: '淺草線直通 京成電鐵（成田機場方向）與 北總鐵道。', category: 'tip' },
        { icon: '💡', text: '是前往成田機場的重要路線之一。', category: 'tip' },
        { icon: '🎫', text: '都營地鐵一日券可無限搭乘。', category: 'pass' }
    ],
    'odpt.Railway:Toei.Mita': [
        { icon: '💡', text: '三田線直通 東京metro南北線與 目黑線。', category: 'tip' },
        { icon: '💡', text: '白金高輪站是日比谷線的轉乘站。', category: 'tip' },
        { icon: '🎫', text: '都營地鐵一日券可無限搭乘。', category: 'pass' }
    ],
    'odpt.Railway:Toei.Shinjuku': [
        { icon: '💡', text: '新宿線是都營唯一東西向的線路。', category: 'tip' },
        { icon: '💡', text: '與京王線（新宿～高尾橋）直通運轉。', category: 'tip' },
        { icon: '🎫', text: '都營地鐵一日券可無限搭乘。', category: 'pass' }
    ],
    'odpt.Railway:Toei.Oedo': [
        { icon: '💡', text: '大江戶線是環狀線，部分路段與其他線路平行。', category: 'tip' },
        { icon: '⚠️', text: '許多車站月台很深（如都廳前站），電梯是主要動線。', category: 'warning' },
        { icon: '💡', text: '光丘站是終點站，班次間距較大。', category: 'tip' },
        { icon: '🎫', text: '都營地鐵一日券可無限搭乘。', category: 'pass' }
    ],

    // --- JR East Lines ---
    'odpt.Railway:JR-East.Yamanote': [
        { icon: '💡', text: '山手線為環狀運行，是東京最重要的環城線。', category: 'tip' },
        { icon: '💡', text: '轉乘其他 JR 線路通常不需出站，利用綠色窗口或自動改札。', category: 'tip' },
        { icon: '⚠️', text: '尖峰時段（08:00-09:30）建議避開新宿、澀谷等大站。', category: 'crowd' },
        { icon: '🎫', text: '適合使用「JR 都區內巴士地鐵一日券」或單純 Suica。', category: 'pass' }
    ],
    'odpt.Railway:JR-East.KeihinTohoku': [
        { icon: '💡', text: '京濱東北線是橫跨東京南北的重要路線，與根岸線直通。', category: 'tip' },
        { icon: '💡', text: '蒲田站是大船站方向的分支點。', category: 'tip' },
        { icon: '🎫', text: '使用 Suica 或普通車票即可。', category: 'pass' }
    ],
    'odpt.Railway:JR-East.Chuo': [
        { icon: '⚠️', text: '中央線（快速）班次密集但容易受「人身事故」影響導致延誤。', category: 'warning' },
        { icon: '💡', text: '中央・總武線（各停）在御茶之水分歧。', category: 'tip' },
        { icon: '💡', text: '前往新宿御苑建議在「新宿門」站（JR 新宿或地鐵新宿）下车。', category: 'tip' }
    ],
    'odpt.Railway:JR-East.Sobu': [
        { icon: '💡', text: '總武線是東京東西向的重要路線。', category: 'tip' },
        { icon: '💡', text: '錦糸町站可轉乘東京地鐵半蔵門線。', category: 'tip' },
        { icon: '🎫', text: '使用 Suica 或普通車票即可。', category: 'pass' }
    ],
    'odpt.Railway:JR-East.ChuoSobu': [
        { icon: '💡', text: '中央・總武線（各停）是黃色車廂，運行於東京～千葉。', category: 'tip' },
        { icon: '⚠️', text: '尖峰時段非常擁擠。', category: 'crowd' }
    ],
    'odpt.Railway:JR-East.Saikyo': [
        { icon: '💡', text: '埼京線與川越線、直通湘南新宿線。', category: 'tip' },
        { icon: '💡', text: '澀谷站月台已移至山手線旁。', category: 'tip' }
    ],
    'odpt.Railway:JR-East.ShonanShinjuku': [
        { icon: '💡', text: '湘南新宿ライン直通 東海道線（橫濱方向）與 高崎線（熊谷方向）。', category: 'tip' },
        { icon: '⚠️', text: '不是所有班次都直通，需確認終點站。', category: 'warning' }
    ],
    'odpt.Railway:JR-East.Joban': [
        { icon: '💡', text: '常磐線是前往東北方向的重要路線，部分班次與東京地鐵千代田線直通。', category: 'tip' },
        { icon: '💡', text: '取手以北需另購乘車券。', category: 'tip' }
    ],
    'odpt.Railway:JR-East.Keiyo': [
        { icon: '💡', text: '京葉線是前往迪士尼的主要路線。', category: 'tip' },
        { icon: '⚠️', text: '東京站京葉線月台位於地下深處，從山手線月台步行約 15-20 分鐘。', category: 'warning' }
    ],
    'odpt.Railway:JR-East.Tokaido': [
        { icon: '💡', text: '東海道線是前往橫濱、熱海方向的主要 JR 線。', category: 'tip' },
        { icon: '💡', text: '東京站～品川段與橫須賀線並行。', category: 'tip' }
    ],

    // --- Private Railway Lines ---
    // --- Odakyu (小田急) ---
    'odpt.Railway:Odakyu.Odawara': [
        { icon: '💡', text: '小田急線直通東京地鐵千代田線（代代木上原站）。', category: 'tip' },
        { icon: '💡', text: '「浪漫特快」是前往箱根、湘南的觀光列車。', category: 'tip' },
        { icon: '🎫', text: '前往小田原方向建議購買「小田急周遊券」。', category: 'pass' },
        { icon: '⚠️', text: '代代木上原站轉乘千代田線需出站，請預留 5-10 分鐘。', category: 'warning' }
    ],
    'odpt.Railway:Odakyu.Tama': [
        { icon: '💡', text: '多摩線直通小田急線，是前往多摩地區的重要路線。', category: 'tip' },
        { icon: '💡', text: '可轉乘京王線。', category: 'tip' },
        { icon: '🎫', text: '適用小田急一日券。', category: 'pass' }
    ],

    // --- Keio (京王) ---
    'odpt.Railway:Keio.Keio': [
        { icon: '💡', text: '京王線直通都營新宿線（新宿站）。', category: 'tip' },
        { icon: '💡', text: '「京王快車」前往高尾山方向，風景優美。', category: 'tip' },
        { icon: '🎫', text: '「京王一日券」適合前往高尾山或多摩地區。', category: 'pass' },
        { icon: '⚠️', text: '新宿站轉乘較複雜，請確認月台位置。', category: 'warning' }
    ],
    'odpt.Railway:Keio.Inokashira': [
        { icon: '💡', text: '井之頭線是前往吉祥寺、吉卜力美術館的路線。', category: 'tip' },
        { icon: '💡', text: '與京王線在明大前站直通運轉。', category: 'tip' },
        { icon: '🎫', text: '可使用京王一日券。', category: 'pass' }
    ],
    'odpt.Railway:Keio.Sagamihara': [
        { icon: '💡', text: '相模原線前往橋本、八王子方向。', category: 'tip' },
        { icon: '💡', text: '可轉乘 JR 中央線。', category: 'tip' },
        { icon: '🎫', text: '適用京王一日券。', category: 'pass' }
    ],

    // --- Seibu (西武) ---
    'odpt.Railway:Seibu.Shinjuku': [
        { icon: '💡', text: '西武新宿線直通都營大江戶線（西新宿站）。', category: 'tip' },
        { icon: '💡', text: '「紅箭號」前往秩父方向。', category: 'tip' },
        { icon: '🎫', text: '「西武一日券」適合前往秩父、西武園。', category: 'pass' },
        { icon: '⚠️', text: '新宿站西口轉乘較遠。', category: 'warning' }
    ],
    'odpt.Railway:Seibu.Ikebukuro': [
        { icon: '💡', text: '西武池袋線直通東京地鐵有樂町線（池袋站）。', category: 'tip' },
        { icon: '💡', text: '「紅箭號」前往秩父方向。', category: 'tip' },
        { icon: '🎫', text: '「西武一日券」適合前往秩父。', category: 'pass' },
        { icon: '⚠️', text: '池袋站東口轉乘距離較長。', category: 'warning' }
    ],
    'odpt.Railway:Seibu.Tamako': [
        { icon: '💡', text: '多摩湖線是西武旗下的特色觀光路線，保有獨特的行車體驗。', category: 'tip' },
        { icon: '💡', text: '可轉乘西武新宿線或池袋線。', category: 'tip' },
        { icon: '🎫', text: '適用西武一日券。', category: 'pass' }
    ],

    // --- Tokyu ( 東急) ---
    'odpt.Railway:Tokyu.Toyama': [
        { icon: '💡', text: '東橫線直通東京地鐵副都心線（澀谷站）。', category: 'tip' },
        { icon: '💡', text: '「東橫線」前往橫濱、元町中華街方向。', category: 'tip' },
        { icon: '🎫', text: '「東京自由區域券」可搭配使用。', category: 'pass' },
        { icon: '⚠️', text: '澀谷站轉乘距離長，建議預留 10 分鐘。', category: 'warning' }
    ],
    'odpt.Railway:Tokyu.DenEnToshi': [
        { icon: '💡', text: '田園都市線直通東京地鐵半蔵門線（澀谷站）。', category: 'tip' },
        { icon: '💡', text: '前往二子玉川、調布方向。', category: 'tip' },
        { icon: '🎫', text: '適用東京自由區域券。', category: 'pass' },
        { icon: '⚠️', text: '澀谷站轉乘較複雜。', category: 'warning' }
    ],
    'odpt.Railway:Tokyu.Meguro': [
        { icon: '💡', text: '目黑線直通東京地鐵南北線與都營三田線。', category: 'tip' },
        { icon: '💡', text: '前往洗足、大岡山方向。', category: 'tip' },
        { icon: '🎫', text: '適用東京自由區域券。', category: 'pass' }
    ],
    'odpt.Railway:Tokyu.Oimachi': [
        { icon: '💡', text: '大井町線直通東京地鐵有樂町線（池袋站方向）。', category: 'tip' },
        { icon: '💡', text: '前往自由が丘、大井町方向。', category: 'tip' },
        { icon: '🎫', text: '適用東京自由區域券。', category: 'pass' }
    ],
    'odpt.Railway:Tokyu.Setagaya': [
        { icon: '💡', text: '世田谷線是路面電車，前往下高井戶。', category: 'tip' },
        { icon: '💡', text: '可轉乘田園都市線。', category: 'tip' },
        { icon: '🎫', text: '適用東京自由區域券。', category: 'pass' }
    ],

    // --- Keisei (京成) ---
    'odpt.Railway:Keisei.Main': [
        { icon: '💡', text: '京成線直通都營淺草線前往成田機場。', category: 'tip' },
        { icon: '💡', text: '「Skyliner」是最快速的機場交通。', category: 'tip' },
        { icon: '💡', text: '「Access 特急」可直達淺草、押上。', category: 'tip' },
        { icon: '🎫', text: '「京成一日券」適合機場往返。', category: 'pass' },
        { icon: '⚠️', text: '上野站轉乘日比谷線需出站。', category: 'warning' }
    ],
    'odpt.Railway:Keisei.Oshiage': [
        { icon: '💡', text: '京成押上線直通都營淺草線。', category: 'tip' },
        { icon: '💡', text: '可轉乘東京地鐵半蔵門線前往晴空塔。', category: 'tip' },
        { icon: '🎫', text: '適用京成一日券。', category: 'pass' }
    ],
    'odpt.Railway:Keisei.Chihara': [
        { icon: '💡', text: '千葉線是前往千葉、成田機場的路線。', category: 'tip' },
        { icon: '💡', text: '可轉乘 JR 總武線。', category: 'tip' },
        { icon: '🎫', text: '適用京成一日券。', category: 'pass' }
    ],

    // --- Tobu (東武) ---
    'odpt.Railway:Tobu.Isesaki': [
        { icon: '💡', text: '東武伊勢崎線直通東京地鐵半蔵門線（押上站）。', category: 'tip' },
        { icon: '💡', text: '「東武日光線」前往日光、鬼怒川。', category: 'tip' },
        { icon: '🎫', text: '「東武日光周遊券」適合日光旅遊。', category: 'pass' },
        { icon: '⚠️', text: '淺草站轉乘需出站。', category: 'warning' }
    ],
    'odpt.Railway:Tobu.Skytree': [
        { icon: '💡', text: '東武晴空塔線直通半蔵門線（押上站）。', category: 'tip' },
        { icon: '💡', text: '前往晴空塔最近的路線。', category: 'tip' },
        { icon: '🎫', text: '「晴空塔周遊券」含門票與交通。', category: 'pass' }
    ],
    'odpt.Railway:Tobu.Utsunomiya': [
        { icon: '💡', text: '東武日光線前往日光、鬼怒川方向。', category: 'tip' },
        { icon: '💡', text: '「鬼怒川號」觀光列車。', category: 'tip' },
        { icon: '🎫', text: '「東武日光周遊券」含 SL 大樹體驗。', category: 'pass' }
    ],

    // --- Other Private Railways ---
    'odpt.Railway:SaitamaRailway': [
        { icon: '💡', text: '埼玉高速鐵道直通東京地鐵南北線。', category: 'tip' },
        { icon: '💡', text: '前往埼玉超大宮、羽生方向。', category: 'tip' },
        { icon: '🎫', text: '適用東京地鐵券。', category: 'pass' }
    ],
    'odpt.Railway:ShonanMonorail': [
        { icon: '💡', text: '湘南單軌電車是懸掛式單軌電車。', category: 'tip' },
        { icon: '💡', text: '前往江之島、大船方向。', category: 'tip' },
        { icon: '🎫', text: '可與 JR 鎌倉江之島周遊券搭配。', category: 'pass' }
    ],
    'odpt.Railway:EnoshimaElectric': [
        { icon: '💡', text: '江之島電鐵是著名的觀光電車。', category: 'tip' },
        { icon: '💡', text: '途經鎌倉、長谷寺、高德院。', category: 'tip' },
        { icon: '💡', text: '「江之島一日券」含鎌倉、江之島景點。', category: 'pass' }
    ],
    'odpt.Railway:YokohamaMunicipal': [
        { icon: '💡', text: '橫濱高速鐵道前往橫濱港未來線。', category: 'tip' },
        { icon: '💡', text: '途經橫濱站、元町中華街站。', category: 'tip' },
        { icon: '🎫', text: '「橫濱港未來卡」適合深度遊橫濱。', category: 'pass' }
    ],
    'odpt.Railway:TokyoMonorail': [
        { icon: '✈️', text: '東京單軌電車直通山手線（濱松町站）。', category: 'tip' },
        { icon: '💡', text: '前往羽田機場的主要方式之一。', category: 'tip' },
        { icon: '🎫', text: '「單軌電車一日券」含機場往返。', category: 'pass' }
    ]
};

// ============================================================
// HUB STATION EXPERT KNOWLEDGE
// ============================================================

export const HUB_STATION_TIPS: Record<string, Array<{
    icon: string;
    text: string;
    category: 'transfer' | 'facility' | 'warning' | 'pass' | 'crowd' | 'accessibility' | 'tourist' | 'shopping';
}>> = {
    // --- Major Transfer Hubs ---
    'odpt:Station:JR-East.Ueno': [
        { icon: '💡', text: '上野站是東北、秋田、山形新幹品的發車站。', category: 'transfer' },
        { icon: '💡', text: '轉乘日比谷線需經過較長的地下通道，約 5-7 分鐘。', category: 'transfer' },
        { icon: '💡', text: '「不忍口」方向有電梯通往地面，適合大行李。', category: 'accessibility' },
        { icon: '🦽', text: '無障礙動線：建議使用 3 號出口的大型電梯。', category: 'accessibility' },
        { icon: '📦', text: '置物櫃：淺草文化觀光中心有更大空間的行李寄放。', category: 'facility' }
    ],
    'odpt:Station:JR-East.Akihabara': [
        { icon: '💡', text: '秋葉原站是電器街中心，JR 與日比谷線轉乘距離近。', category: 'transfer' },
        { icon: '💡', text: '轉乘筑波快線需出站步行約 5 分鐘。', category: 'transfer' },
        { icon: '⚠️', text: '周末電器特賣時段人潮眾多。', category: 'crowd' }
    ],
    'odpt:Station:JR-East.Shinjuku': [
        { icon: '⚠️', text: '新宿站是世界最繁忙車站，共有超過 200 個出口，請務必確認目標出口名稱。', category: 'warning' },
        { icon: '💡', text: '「西口」與「東口」之間可透過「東西自由通路」直接穿過，無需購買月台票。', category: 'transfer' },
        { icon: '💡', text: '轉乘京王線或小田急線有專用的轉乘剪票口，不需先出站。', category: 'transfer' },
        { icon: '🛗', text: '無障礙動線：「南口」動線較新，電梯設施完善。', category: 'accessibility' },
        { icon: '🦽', text: '建議避開地下街人潮，從路面層移動更順暢。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Shibuya': [
        { icon: '⚠️', text: '澀谷站正在進行開發工程至 2027 年左右，動線可能有所變動。', category: 'warning' },
        { icon: '💡', text: 'JR 澀谷站與副都心線轉乘距離較長，建議預留緩衝時間。', category: 'transfer' },
        { icon: '💡', text: '埼京線月台已移至山手線旁，轉乘更加方便。', category: 'transfer' },
        { icon: '🛗', text: '建議使用「澀谷 Scramble Square」內的電梯連通地下與地上層。', category: 'accessibility' },
        { icon: '🦽', text: '動線複雜，電梯通常位於角落，請預留找路時間。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Ikebukuro': [
        { icon: '💡', text: '池袋站動線複雜，主要分為東口（西武百貨）與西口（東武百貨），容易搞混。', category: 'warning' },
        { icon: '💡', text: '轉乘有樂町線或副都心線需步行一段距離。', category: 'transfer' },
        { icon: '🛗', text: '主要出口都有電梯，但位置較隱蔽。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Tokyo': [
        { icon: '💡', text: '東京站是轉乘東海道、東北、山形等 JR 新幹線的主要站點之一。', category: 'transfer' },
        { icon: '💡', text: '建議從「中央線」月台前往新幹線需約 10 分鐘。', category: 'transfer' },
        { icon: '💡', text: '京葉線（前往迪士尼）月台位於地下深處，距離山手線月台步行約 15-20 分鐘。', category: 'transfer' },
        { icon: '💡', text: '站內「GranSta」商場有豐富的鐵路便當與伴手禮。', category: 'facility' },
        { icon: '🦽', text: '丸之內側出口有大型電梯，新幹線閘門內也設有無障礙設施。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Shimbashi': [
        { icon: '💡', text: '濱松町站（步行約 5 分鐘）是前往東京鐵塔的最近站。', category: 'facility' },
        { icon: '💡', text: '轉乘百合海鷗號需出站步行較遠。', category: 'transfer' },
        { icon: '🛗', text: '主要月台電梯設施完善。', category: 'accessibility' },
        { icon: '📦', text: '濱松町站置物櫃數量有限，大件行李建議使用東京站。', category: 'facility' }
    ],
    'odpt:Station:JR-East.Hamamatsucho': [
        { icon: '✈️', text: '可轉乘東京單軌電車前往羽田機場。', category: 'transfer' },
        { icon: '💡', text: '與芝公園、竹芝碼頭步行可達。', category: 'facility' },
        { icon: '🛗', text: '車站電梯連通單軌電車站。', category: 'accessibility' },
        { icon: '💡', text: '單軌電車直通山手線，適合前往東京站方向。', category: 'transfer' }
    ],
    'odpt:Station:JR-East.Kanda': [
        { icon: '💡', text: '神田站是中央線、山手線與京浜東北線的轉乘站。', category: 'transfer' },
        { icon: '💡', text: '站內構造簡單，轉乘距離短。', category: 'facility' },
        { icon: '🛗', text: '各線月台電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Yokohama': [
        { icon: '🗾', text: '橫濱站是神奈川縣最大的交通樞紐。', category: 'facility' },
        { icon: '💡', text: '可轉乘橫濱高速鐵道みなとみらい線。', category: 'transfer' },
        { icon: '🛗', text: '站內電梯設施完善。', category: 'accessibility' },
        { icon: '⚠️', text: '出口眾多，請確認目標出口名稱。', category: 'warning' }
    ],
    'odpt:Station:JR-East.Kawasaki': [
        { icon: '💡', text: '川崎站是前往東京與橫濱的重要轉乘站。', category: 'transfer' },
        { icon: '💡', text: '可轉乘京急電鐵前往羽田機場。', category: 'transfer' },
        { icon: '🛗', text: '主要出口有電梯設施。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Shinagawa': [
        { icon: '💡', text: '品川站是東海道新幹線的主要停靠站之一。', category: 'transfer' },
        { icon: '💡', text: '可轉乘京急電鐵前往羽田機場。', category: 'transfer' },
        { icon: '🛗', text: '各月台電梯設施完善。', category: 'accessibility' },
        { icon: '🦽', text: '無障礙動線良好。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Meguro': [
        { icon: '💡', text: '目黑站可轉乘東京地鐵南北線與都營三田線。', category: 'transfer' },
        { icon: '💡', text: '站內構造簡單，轉乘方便。', category: 'facility' },
        { icon: '🛗', text: '各出口電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Nakano': [
        { icon: '💡', text: '中野站是中央線的重要轉乘站，可轉乘東京地鐵東西線。', category: 'transfer' },
        { icon: '💡', text: '南口有大型購物中心。', category: 'facility' },
        { icon: '🛗', text: '電梯連通各月台。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Asagaya': [
        { icon: '💡', text: '阿佐谷站是中央線的重要站點。', category: 'facility' },
        { icon: '💡', text: '可轉乘JR 總武線（各停）。', category: 'transfer' },
        { icon: '🛗', text: '主要出口有電梯。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Kichijoji': [
        { icon: '🗾', text: '吉祥寺站是前往三鷹之森吉卜力美術館的最近站。', category: 'tourist' },
        { icon: '💡', text: '可轉乘京王井之頭線。', category: 'transfer' },
        { icon: '💡', text: '站前有著名的吉祥寺商業街。', category: 'shopping' },
        { icon: '🛗', text: '電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Musashino': [
        { icon: '💡', text: '武藏野站可轉乘JR 武藏野線。', category: 'transfer' },
        { icon: '💡', text: '站內構造簡單。', category: 'facility' },
        { icon: '🛗', text: '主要出口有電梯。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Tabata': [
        { icon: '💡', text: '田端站是山手線與京浜東北線的轉乘站。', category: 'transfer' },
        { icon: '💡', text: '站內構造簡單。', category: 'facility' },
        { icon: '🛗', text: '電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Komagome': [
        { icon: '🌸', text: '駒込站可前往染井吉野櫻紀念公園。', category: 'tourist' },
        { icon: '💡', text: '可轉乘東京地鐵南北線。', category: 'transfer' },
        { icon: '🛗', text: '電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Sugamo': [
        { icon: '💡', text: '巢鴨站是著名的「老人的原宿」。', category: 'shopping' },
        { icon: '💡', text: '可轉乘JR 山手線。', category: 'transfer' },
        { icon: '🛗', text: '電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Itabashi': [
        { icon: '💡', text: '板橋站是JR 琦京線的重要站點。', category: 'transfer' },
        { icon: '💡', text: '可轉乘都營三田線。', category: 'transfer' },
        { icon: '🛗', text: '電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Otsuka': [
        { icon: '💡', text: '大塚站可轉乘東京地鐵有樂町線。', category: 'transfer' },
        { icon: '💡', text: '站前有大塚步行街。', category: 'facility' },
        { icon: '🛗', text: '電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Takadanobaba': [
        { icon: '🎓', text: '高田馬場站可前往早稻田大學。', category: 'tourist' },
        { icon: '💡', text: '可轉乘東京地鐵東西線與西武新宿線。', category: 'transfer' },
        { icon: '🛗', text: '電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Meidaimae': [
        { icon: '💡', text: '明大前站可轉乘京王線與井之頭線。', category: 'transfer' },
        { icon: '💡', text: '站前有商店街。', category: 'shopping' },
        { icon: '🛗', text: '電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Sakurajosui': [
        { icon: '🌸', text: '櫻上水站名稱優美，春季有櫻花。', category: 'tourist' },
        { icon: '💡', text: '可轉乘京王線。', category: 'transfer' },
        { icon: '🛗', text: '電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Chiba': [
        { icon: '🗾', text: '千葉站是千葉縣的交通樞紐。', category: 'facility' },
        { icon: '💡', text: '可轉乘JR 總武線與京成電鐵。', category: 'transfer' },
        { icon: '🛗', text: '電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Arai': [
        { icon: '💡', text: '新木場站可轉乘東京地鐵有樂町線。', category: 'transfer' },
        { icon: '💡', text: '站內有木材主題設施。', category: 'facility' },
        { icon: '🛗', text: '電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Kinshicho': [
        { icon: '💡', text: '龜戶站可轉乘東京地鐵半蔵門線。', category: 'transfer' },
        { icon: '💡', text: '站前有龜戶天神。', category: 'tourist' },
        { icon: '🛗', text: '電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Ogikubo': [
        { icon: '🍜', text: '荻窪站可轉乘東京地鐵丸之內線與JR 中央線。', category: 'transfer' },
        { icon: '💡', text: '站前有著名拉麵街。', category: 'shopping' },
        { icon: '🛗', text: '電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Asakusabashi': [
        { icon: '💡', text: '淺草橋站可轉乘都營淺草線與JR 總武線。', category: 'transfer' },
        { icon: '💡', text: '鄰近淺草橋道具街。', category: 'shopping' },
        { icon: '🛗', text: '電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:JR-East.Hatchobori': [
        { icon: '💡', text: '八丁堀站可轉乘東京地鐵日比谷線與都營淺草線。', category: 'transfer' },
        { icon: '💡', text: '站內構造簡單。', category: 'facility' },
        { icon: '🛗', text: '電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:TokyoMetro.Ginza.Asakusa': [
        { icon: '💡', text: '淺草站 1 號出口最靠近雷門。', category: 'facility' },
        { icon: '💡', text: '淺草站與東武線轉乘需出站，請預留 5-10 分鐘。', category: 'transfer' },
        { icon: '🛗', text: '1 號出口設有電梯，適合大行李與嬰兒車。', category: 'accessibility' },
        { icon: '📦', text: '置物櫃指南：若站內置物櫃滿，可前往「淺草文化觀光中心」。', category: 'facility' }
    ],
    'odpt:Station:TokyoMetro.Ginza.Ueno': [
        { icon: '🛗', text: '3 號出口有大型無障礙電梯，適合大行李與嬰兒車。', category: 'accessibility' },
        { icon: '💡', text: '轉乘日比谷線需經過一段較長的地下通道。', category: 'transfer' },
        { icon: '🦽', text: '從銀座線前往 JR 上野站，建議使用「不忍口」方向的電梯最為順暢。', category: 'accessibility' }
    ],
    'odpt:Station:TokyoMetro.Hibiya.Roppongi': [
        { icon: '💡', text: '六本木站日比谷線月台非常深，建議使用電梯。', category: 'accessibility' },
        { icon: '💡', text: '出站即為六本木繁華區。', category: 'facility' },
        { icon: '🛗', text: '電梯是主要動線，電扶梯較少。', category: 'accessibility' }
    ],
    'odpt:Station:TokyoMetro.Hibiya.Kamiyacho': [
        { icon: '💡', text: '神谷町站鄰近東京塔，步行約 5 分鐘。', category: 'facility' },
        { icon: '🛗', text: '月台較深，電梯設施完善。', category: 'accessibility' }
    ],
    'odpt:Station:TokyoMetro.Marunouchi.Otemachi': [
        { icon: '💡', text: '大手町站可轉乘 Metro 丸之內線、東西線、千代田線、南北線、半蔵門線（三線）。', category: 'transfer' },
        { icon: '💡', text: '東京車站丸之內北口步行約 5 分鐘。', category: 'transfer' },
        { icon: '🛗', text: '各線月台電梯連通。', category: 'accessibility' }
    ],
    'odpt:Station:TokyoMetro.Tozai.Iidabashi': [
        { icon: '💡', text: '飯田橋站可轉乘 JR 總武線（各停）與有樂町線。', category: 'transfer' },
        { icon: '💡', text: '站內構造複雜，請預留找路時間。', category: 'warning' },
        { icon: '🛗', text: '電梯分散在不同區域。', category: 'accessibility' }
    ],
    'odpt:Station:Toei.Oedo.Shinjuku': [
        { icon: '💡', text: '都廳前站是都營大江戶線的重要樞紐。', category: 'transfer' },
        { icon: '💡', text: '可步行至 JR 新宿站西口（約 10 分鐘）。', category: 'transfer' },
        { icon: '🛗', text: '月台非常深，電梯是主要動線。', category: 'accessibility' },
        { icon: '🦽', text: '建議預留至少 5 分鐘等電梯時間。', category: 'accessibility' }
    ],
    'odpt:Station:Toei.Oedo.Roppongi': [
        { icon: '💡', text: '六本木站可與日比谷線轉乘。', category: 'transfer' },
        { icon: '🛗', text: '大江戶線月台非常深。', category: 'accessibility' }
    ],
    'odpt:Station:TokyoMetro.Hanzomon.Oshiage': [
        { icon: '💡', text: '押上站是半蔵門線終點，可轉乘都營淺草線與東武晴空塔線。', category: 'transfer' },
        { icon: '💡', text: '步行可達東京晴空塔。', category: 'facility' },
        { icon: '🛗', text: '各出口電梯設施完善。', category: 'accessibility' }
    ]
};

// ============================================================
// ACCESSIBILITY ADVICE BY DEMAND TYPE
// ============================================================

export const ACCESSIBILITY_GUIDE: Record<string, {
    wheelchair: string;
    stroller: string;
    largeLuggage: string;
    vision: string;
    senior: string;
}> = {
    // --- JR East Stations ---
    'odpt:Station:JR-East.Ueno': {
        wheelchair: '🛗 3 號出口大型電梯直達地面，JR 閘門內也設有電梯。',
        stroller: '🛗 3 號出口電梯空間寬敞，推車進出方便。',
        largeLuggage: '🛗 3 號出口電梯直達不忍口方向。',
        vision: '💡 站內有完善的點字導覽與語音指引。',
        senior: '💡 建議使用 3 號出口，距離較短且有電梯。'
    },
    'odpt:Station:JR-East.Yamanote.Ueno': {
        wheelchair: '🛗 3 號出口大型電梯直達地面，JR 閘門內也設有電梯。',
        stroller: '🛗 3 號出口電梯空間寬敞，推車進出方便。',
        largeLuggage: '🛗 3 號出口電梯直達不忍口方向。',
        vision: '💡 站內有完善的點字導覽與語音指引。',
        senior: '💡 建議使用 3 號出口，距離較短且有電梯。'
    },
    'odpt:Station:JR-East.Shinjuku': {
        wheelchair: '🛗 南口動線較新，電梯設施完善。',
        stroller: '🛗 避開地下街人潮，建議從路面層移動。',
        largeLuggage: '🛗 JR 新宿站南口與新南口之間有完善的電梯系統。',
        vision: '💡 主要出口有點字地圖。',
        senior: '💡 建議使用南口或西口，動線較簡單。'
    },
    'odpt:Station:JR-East.Yamanote.Shinjuku': {
        wheelchair: '🛗 南口動線較新，電梯設施完善。',
        stroller: '🛗 避開地下街人潮，建議從路面層移動。',
        largeLuggage: '🛗 JR 新宿站南口與新南口之間有完善的電梯系統。',
        vision: '💡 主要出口有點字地圖。',
        senior: '💡 建議使用南口或西口，動線較簡單。'
    },
    'odpt:Station:JR-East.Shibuya': {
        wheelchair: '🛗 建議使用「澀谷 Scramble Square」內的電梯連通地下與地上層。',
        stroller: '🛗 動線複雜，電梯通常位於角落，請預留找路時間。',
        largeLuggage: '🛗 建議利用「Shibuya Stream」出口方向的電梯，人潮較少。',
        vision: '💡 站內正在更新無障礙設施中。',
        senior: '⚠️ 動線複雜且施工中，建議預留充裕時間。'
    },
    'odpt:Station:JR-East.Yamanote.Shibuya': {
        wheelchair: '🛗 建議使用「澀谷 Scramble Square」內的電梯連通地下與地上層。',
        stroller: '🛗 動線複雜，電梯通常位於角落，請預留找路時間。',
        largeLuggage: '🛗 建議利用「Shibuya Stream」出口方向的電梯，人潮較少。',
        vision: '💡 站內正在更新無障礙設施中。',
        senior: '⚠️ 動線複雜且施工中，建議預留充裕時間。'
    },
    'odpt:Station:JR-East.Tokyo': {
        wheelchair: '🛗 丸之內側出口有大型電梯，新幹線閘門內也設有無障礙設施。',
        stroller: '🛗 建議從丸之內北口進入，電梯較充裕。',
        largeLuggage: '🛗 丸之內口電梯直達地面。京葉線月台較遠，建議預留 20 分鐘。',
        vision: '💡 站內點字與語音指引完善。',
        senior: '💡 建議使用丸之內口，動線較簡單。'
    },
    'odpt:Station:JR-East.Ikebukuro': {
        wheelchair: '🛗 東口與西口都有電梯，但位置較隱蔽。',
        stroller: '🛗 建議使用大型電梯，避開狹窄通道。',
        largeLuggage: '🛗 東口電梯設施較完善。',
        vision: '💡 主要出口有點字指引。',
        senior: '💡 建議使用動線較簡單的出口。'
    },
    'odpt:Station:JR-East.Akihabara': {
        wheelchair: '🛗 電器街口有電梯，適合輪椅使用者。',
        stroller: '🛗 主要出口電梯設施完善。',
        largeLuggage: '🛗 電器街口電梯空間充裕。',
        vision: '💡 站內點字指引完善。',
        senior: '💡 建議使用電器街口出口。'
    },
    'odpt:Station:JR-East.Shimbashi': {
        wheelchair: '🛗 主要月台電梯設施完善。',
        stroller: '🛗 電梯空間寬敞。',
        largeLuggage: '🛗 電梯直達地面。',
        vision: '💡 站內有點字指引。',
        senior: '💡 建議使用主要出口。'
    },
    'odpt:Station:JR-East.Hamamatsucho': {
        wheelchair: '🛗 車站電梯連通單軌電車站。',
        stroller: '🛗 電梯空間充足。',
        largeLuggage: '🛗 電梯直達單軌電車站。',
        vision: '💡 站內語音指引完善。',
        senior: '💡 建議使用主要電梯。'
    },
    'odpt:Station:JR-East.Kanda': {
        wheelchair: '🛗 各線月台電梯設施完善。',
        stroller: '🛗 電梯空間寬敞。',
        largeLuggage: '🛗 電梯直達地面。',
        vision: '💡 站內點字指引完善。',
        senior: '💡 站內構造簡單，動線順暢。'
    },
    'odpt:Station:JR-East.Yokohama': {
        wheelchair: '🛗 站內電梯設施完善。',
        stroller: '🛗 電梯空間充足。',
        largeLuggage: '🛗 電梯直達各月台。',
        vision: '💡 主要出口有點字地圖。',
        senior: '💡 建議使用主要出口。'
    },
    'odpt:Station:JR-East.Kawasaki': {
        wheelchair: '🛗 主要出口有電梯設施。',
        stroller: '🛗 電梯空間適中。',
        largeLuggage: '🛗 電梯直達地面。',
        vision: '💡 站內指引完善。',
        senior: '💡 建議使用主要出口。'
    },
    'odpt:Station:JR-East.Shinagawa': {
        wheelchair: '🛗 各月台電梯設施完善。',
        stroller: '🛗 電梯空間寬敞。',
        largeLuggage: '🛗 電梯直達地面。',
        vision: '💡 站內點字指引完善。',
        senior: '💡 無障礙動線良好。'
    },
    'odpt:Station:JR-East.Meguro': {
        wheelchair: '🛗 各出口電梯設施完善。',
        stroller: '🛗 電梯空間適中。',
        largeLuggage: '🛗 電梯直達地面。',
        vision: '💡 站內指引完善。',
        senior: '💡 站內構造簡單。'
    },
    'odpt:Station:JR-East.Nakano': {
        wheelchair: '🛗 電梯連通各月台。',
        stroller: '🛗 電梯空間充足。',
        largeLuggage: '🛗 電梯直達月台。',
        vision: '💡 站內指引完善。',
        senior: '💡 建議使用南口。'
    },
    // --- Metro Stations ---
    'odpt:Station:TokyoMetro.Ginza.Asakusa': {
        wheelchair: '🛗 1 號出口設有電梯，適合輪椅使用者。',
        stroller: '🛗 1 號出口電梯方便推車。',
        largeLuggage: '🛗 1 號出口電梯。',
        vision: '💡 主要出口有點字指引。',
        senior: '💡 建議使用 1 號出口。'
    },
    'odpt:Station:TokyoMetro.Ginza.Ueno': {
        wheelchair: '🛗 3 號出口大型電梯。',
        stroller: '🛗 3 號出口電梯空間寬敞。',
        largeLuggage: '🛗 3 號出口電梯直達地面。',
        vision: '💡 站內指引完善。',
        senior: '💡 建議使用 3 號出口。'
    },
    'odpt:Station:TokyoMetro.Hibiya.Roppongi': {
        wheelchair: '🛗 月台非常深，電梯是唯一選擇。',
        stroller: '🛗 必須使用電梯，請預留等候時間。',
        largeLuggage: '🛗 電梯空間有限，大件行李建議走其他出口。',
        vision: '💡 電梯內有語音播報。',
        senior: '💡 月台很深，建議使用電梯。'
    },
    'odpt:Station:TokyoMetro.Hibiya.Kamiyacho': {
        wheelchair: '🛗 月台較深，電梯設施完善。',
        stroller: '🛗 電梯空間適中。',
        largeLuggage: '🛗 電梯直達地面。',
        vision: '💡 站內指引完善。',
        senior: '💡 建議使用電梯。'
    },
    'odpt:Station:TokyoMetro.Marunouchi.Otemachi': {
        wheelchair: '🛗 各線月台電梯連通。',
        stroller: '🛗 電梯空間寬敞。',
        largeLuggage: '🛗 電梯直達地面。',
        vision: '💡 站內點字指引完善。',
        senior: '💡 站內構造簡單。'
    },
    'odpt:Station:TokyoMetro.Tozai.Iidabashi': {
        wheelchair: '🛗 電梯分散在不同區域。',
        stroller: '🛗 電梯空間適中。',
        largeLuggage: '🛗 電梯直達月台。',
        vision: '💡 站內指引完善。',
        senior: '💡 構造複雜，請預留找路時間。'
    },
    'odpt:Station:TokyoMetro.Hanzomon.Oshiage': {
        wheelchair: '🛗 各出口電梯設施完善。',
        stroller: '🛗 電梯空間寬敞。',
        largeLuggage: '🛗 電梯直達地面。',
        vision: '💡 站內點字指引完善。',
        senior: '💡 建議使用主要出口。'
    },
    // --- Toei Stations ---
    'odpt:Station:Toei.Oedo.Shinjuku': {
        wheelchair: '🛗 月台非常深，電梯是唯一選擇。',
        stroller: '🛗 必須使用電梯。',
        largeLuggage: '🛗 電梯空間充裕。',
        vision: '💡 電梯有語音指引。',
        senior: '💡 建議預留至少 5 分鐘等電梯時間。'
    },
    'odpt:Station:Toei.Oedo.Roppongi': {
        wheelchair: '🛗 大江戶線月台非常深，電梯是唯一選擇。',
        stroller: '🛗 必須使用電梯。',
        largeLuggage: '🛗 電梯空間適中。',
        vision: '💡 電梯有語音指引。',
        senior: '💡 月台很深，建議預留時間。'
    }
};

// ============================================================
// SPECIAL LOCATION TIPS
// ============================================================

export const SPECIAL_LOCATION_TIPS: Record<string, Array<{
    icon: string;
    text: string;
    category: 'airport' | 'tourist' | 'shopping' | 'transfer';
}>> = {
    'Narita-Airport': [
        { icon: '✈️', text: '帶嬰兒車最輕鬆的方式是搭乘「Skyliner」（上野/日暮里直達）或「成田特快 N\'EX」（新宿/東京直達），全車對號座且行李空間大。', category: 'airport' },
        { icon: '💡', text: '若目的地是淺草，搭乘「京成 Access 特急」可直達，不需轉乘但人潮較多。', category: 'airport' },
        { icon: '💡', text: '機場快線的行李架空間有限，大件行李建議放置於車門附近。', category: 'airport' }
    ],
    'Haneda-Airport': [
        { icon: '✈️', text: '東京單軌電車（濱松町站）與京急電鐵（品川/泉岳寺站）是主要選擇。', category: 'airport' },
        { icon: '💡', text: '單軌電車可直通山手線，適合前往東京站方向。', category: 'airport' },
        { icon: '💡', text: '京急可直通都營淺草線，適合前往淺草、日本橋方向。', category: 'airport' }
    ],
    'Tokyo-Disneyland': [
        { icon: '🎢', text: '最佳路線：東京站 → 京葉線（快速）→ 舞浜站。', category: 'tourist' },
        { icon: '💡', text: '京葉線月台在東京站地下深處，請預留 15-20 分鐘步行時間。', category: 'tourist' },
        { icon: '🛗', text: '舞浜站有電梯與電扶梯，出站後步行即達園區。', category: 'tourist' }
    ],
    'Tokyo-Skytree': [
        { icon: '🗼', text: '最近站：押上站（半蔵門線、都營淺草線、東武晴空塔線）。', category: 'tourist' },
        { icon: '💡', text: '也可從淺草站步行（約 15 分鐘）或搭乘東武晴空塔線。', category: 'tourist' },
        { icon: '🛗', text: '押上站各出口電梯設施完善。', category: 'tourist' }
    ],
    'Shibuya-Scramble': [
        { icon: '🌃', text: '澀谷十字路口是世界上最大的人潮交匯點之一。', category: 'tourist' },
        { icon: '💡', text: '最佳觀賞地點：澀谷 Scramble Square 頂樓或星巴克二樓。', category: 'tourist' },
        { icon: '⚠️', text: '施工期間動線複雜，請預留找路時間。', category: 'tourist' }
    ]
};

// ============================================================
// TICKET PASS RECOMMENDATIONS
// ============================================================

export const PASS_RECOMMENDATIONS: Array<{
    id: string;
    name: string;
    nameJa: string;
    price: string;
    coverage: string;
    whenToUse: string;
    icon: string;
    lastUpdated?: string;
}> = [
        {
            id: 'tokyo-subway-ticket',
            name: 'Tokyo Subway Ticket (24/48/72h)',
            nameJa: '東京地下鉄道券',
            price: '約 ¥800 / ¥1200 / ¥1500',
            coverage: '無限搭乘全線東京地鐵 (Metro) 與都營地鐵',
            whenToUse: '平均一天搭乘 3 次以上即划算，不含 JR 線路。適合以地鐵為主要交通工具的遊客。',
            icon: '🚇',
            lastUpdated: '2024-12'
        },
        {
            id: 'tokunai-pass',
            name: 'JR Tokunai Pass (1 Day)',
            nameJa: 'JR 都区内一日券',
            price: '約 ¥760',
            coverage: '無限搭乘東京 23 區內的 JR 普通與快速列車',
            whenToUse: '適合整天都在山手線、中央線或京濱東北線周邊活動的旅客。可搭配地鐵券使用。',
            icon: '🚃',
            lastUpdated: '2024-12'
        },
        {
            id: 'pasmo-pass',
            name: 'Pasmo/Suica IC Card',
            nameJa: 'PASMO/Suica IC 卡',
            price: '押金 ¥500 + 充值',
            coverage: '可搭乘 JR、地鐵、私鐵、巴士等幾乎所有交通工具',
            whenToUse: '最通用的選擇，適合所有類型的旅客。建議至少充值 ¥1,000。',
            icon: '💳',
            lastUpdated: '2024-12'
        },
        {
            id: 'greater-tokyo-pass',
            name: 'Greater Tokyo Pass (3 Days)',
            nameJa: 'Greater Tokyo Pass',
            price: '約 ¥7,200',
            coverage: '涵蓋 13 家私鐵公司與都營巴士，但不含 JR',
            whenToUse: '適合前往鎌倉、秩父、 川越等郊區且不搭乘 JR 的深度旅遊。',
            icon: '🗾',
            lastUpdated: '2024-12'
        },
        {
            id: 'narita-express',
            name: 'Narita Express (N\'EX)',
            nameJa: '成田エクスプレス',
            price: '約 ¥3,020（新宿/東京單程）',
            coverage: '新宿～東京～成田機場 直達',
            whenToUse: '攜帶大行李或想舒適直達機場的最佳選擇。全車對號座，行李空間大。',
            icon: '🚄',
            lastUpdated: '2024-12'
        },
        {
            id: 'skyliner',
            name: 'Skyliner',
            nameJa: 'スカイライナー',
            price: '約 ¥2,400（日暮里單程）',
            coverage: '日暮里/上野～成田機場 直達',
            whenToUse: '最快速的機場交通（36 分鐘），適合時間有限的旅客。',
            icon: '🚀',
            lastUpdated: '2024-12'
        }
    ];

// ============================================================
// CROWD AVOIDANCE TIPS
// ============================================================

export const CROWD_TIPS: Record<string, Array<{
    time: string;
    level: 'low' | 'medium' | 'high' | 'extreme';
    advice: string;
}>> = {
    'weekday-morning': [
        { time: '06:00-07:00', level: 'low', advice: '空車時段，適合需要座位或無障礙的旅客。' },
        { time: '07:00-09:00', level: 'high', advice: '尖峰時段，避開新宿、澀谷、池袋等大站。' },
        { time: '09:00-10:00', level: 'medium', advice: '逐漸緩和，但仍較擁擠。' }
    ],
    'weekday-evening': [
        { time: '17:00-19:00', level: 'high', advice: '下班尖峰，與早晨類似。' },
        { time: '19:00-21:00', level: 'medium', advice: '逐漸緩和。' },
        { time: '21:00-23:00', level: 'low', advice: '較為空閒的時段。' }
    ],
    'weekend': [
        { time: '10:00-12:00', level: 'medium', advice: '旅遊人潮開始增加。' },
        { time: '12:00-15:00', level: 'high', advice: '淺草、原宿、表參道等景點站較擁擠。' },
        { time: '15:00-18:00', level: 'medium', advice: '逐漸緩和。' },
        { time: '18:00-21:00', level: 'low', advice: '晚間較為空閒。' }
    ],
    'holiday': [
        { time: '全天', level: 'high', advice: '假日人潮較平日多，淺草、上野、池袋等站特別擁擠。' },
        { time: '提早出發', level: 'low', advice: '建議早上 9 點前出發，避開人潮。' }
    ]
};

// ============================================================
// EXPORT FUNCTIONS
// ============================================================

/**
 * Get expert tips for a specific railway line
 */
export function getRailwayExpertTips(railwayId: string): Array<{ icon: string; text: string; category: string }> {
    return RAILWAY_EXPERT_TIPS[railwayId] || [];
}

/**
 * Get expert tips for a specific hub station
 */
export function getHubStationTips(stationId: string): Array<{ icon: string; text: string; category: string }> {
    // Try exact match first
    if (HUB_STATION_TIPS[stationId]) {
        return HUB_STATION_TIPS[stationId];
    }

    // Try normalized ID
    const normalizedId = stationId.replace(/^odpt\.Station:/, 'odpt:Station:');
    if (HUB_STATION_TIPS[normalizedId]) {
        return HUB_STATION_TIPS[normalizedId];
    }

    // Try without line prefix (e.g., odpt:Station:JR-East.Shinjuku from odpt.Station:JR-East.Yamanote.Shinjuku)
    const match = stationId.match(/[.:](JR-East|Toei|TokyoMetro)[.:]([A-Za-z]+)[.:](.+)$/);
    if (match) {
        const candidates = [
            `odpt:Station:${match[1]}.${match[3]}`,
            `odpt:Station:${match[1]}.${match[2]}`
        ];
        for (const candidate of candidates) {
            if (HUB_STATION_TIPS[candidate]) {
                return HUB_STATION_TIPS[candidate];
            }
        }
    }

    return [];
}

/**
 * Get accessibility advice for a specific station
 */
export function getAccessibilityAdvice(stationId: string): {
    wheelchair?: string;
    stroller?: string;
    largeLuggage?: string;
    vision?: string;
    senior?: string;
} | undefined {
    // Try exact match first
    if (ACCESSIBILITY_GUIDE[stationId]) {
        return ACCESSIBILITY_GUIDE[stationId];
    }

    // Try normalized ID
    const normalizedId = stationId.replace(/^odpt\.Station:/, 'odpt:Station:');
    if (ACCESSIBILITY_GUIDE[normalizedId]) {
        return ACCESSIBILITY_GUIDE[normalizedId];
    }

    return undefined;
}

/**
 * Get special location tips
 */
export function getSpecialLocationTips(locationId: string): Array<{ icon: string; text: string; category: string }> {
    return SPECIAL_LOCATION_TIPS[locationId] || [];
}

/**
 * Get pass recommendations
 */
export function getPassRecommendations(): typeof PASS_RECOMMENDATIONS {
    return PASS_RECOMMENDATIONS;
}

/**
 * Get crowd tips for a time period
 */
export function getCrowdTips(period: 'weekday-morning' | 'weekday-evening' | 'weekend' | 'holiday'): Array<{ time: string; level: string; advice: string }> {
    return CROWD_TIPS[period] || [];
}
