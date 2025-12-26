import { L1_DNA_Data } from '@/lib/types/stationStandard';

export const STATIC_L1_DATA: Record<string, L1_DNA_Data> = {
    // Ueno Station
    'odpt:Station:TokyoMetro.Ueno': {
        categories: {
            culture: {
                id: 'culture',
                count: 3,
                label: { ja: '文化・芸術', en: 'Culture', zh: '文化藝術' },
                subcategories: {},
                representative_spots: [
                    { name: { ja: '東京国立博物館', en: 'Tokyo National Museum', zh: '東京國立博物館' }, osm_id: 'tnm' },
                    { name: { ja: '国立西洋美術館', en: 'National Museum of Western Art', zh: '國立西洋美術館' }, osm_id: 'nmwa' },
                    { name: { ja: '国立科學博物館', en: 'National Museum of Nature and Science', zh: '國立科學博物館' }, osm_id: 'kahaku' }
                ]
            },
            nature: {
                id: 'nature',
                count: 2,
                label: { ja: '自然・公園', en: 'Nature', zh: '自然公園' },
                subcategories: {},
                representative_spots: [
                    { name: { ja: '上野恩賜公園', en: 'Ueno Park', zh: '上野恩賜公園' }, osm_id: 'ueno_park' },
                    { name: { ja: '不忍池', en: 'Shinobazu Pond', zh: '不忍池' }, osm_id: 'shinobazu' }
                ]
            },
            shopping: {
                id: 'shopping',
                count: 2,
                label: { ja: '買い物', en: 'Shopping', zh: '購物' },
                subcategories: {},
                representative_spots: [
                    { name: { ja: 'アメ横商店街', en: 'Ameyoko Shopping Street', zh: '阿美橫町商店街' }, osm_id: 'ameayoko' },
                    { name: { ja: '多慶屋', en: 'Takeya', zh: '多慶屋' }, osm_id: 'takeya' }
                ]
            },
            dining: {
                id: 'dining',
                count: 2,
                label: { ja: '食事', en: 'Dining', zh: '美食' },
                subcategories: {},
                representative_spots: [
                    { name: { ja: '伊豆栄 梅川亭', en: 'Izuei Umekawatei', zh: '伊豆榮 梅川亭' }, osm_id: 'izuei' },
                    { name: { ja: 'うさぎや', en: 'Usagiya', zh: '兔屋' }, osm_id: 'usagiya' }
                ]
            },
            leisure: {
                id: 'leisure',
                count: 1,
                label: { ja: 'レジャー', en: 'Leisure', zh: '休閒' },
                subcategories: {},
                representative_spots: [
                    { name: { ja: '上野動物園', en: 'Ueno Zoo', zh: '上野動物園' }, osm_id: 'zoo' }
                ]
            }
        },
        vibe_tags: [
            { id: 'art_hub', label: { en: 'Art Hub', ja: '芸術の街', zh: '藝術中心' }, score: 5 },
            { id: 'park_life', label: { en: 'Park Life', ja: '公園散策', zh: '公園生活' }, score: 4 }
        ],
        last_updated: '2024-05-01T00:00:00Z'
    },

    // Tokyo Station
    'odpt:Station:TokyoMetro.Tokyo': {
        categories: {
            culture: {
                id: 'culture',
                count: 2,
                label: { ja: '歴史・文化', en: 'History & Culture', zh: '歷史文化' },
                subcategories: {},
                representative_spots: [
                    { name: { ja: '皇居', en: 'Imperial Palace', zh: '皇居' }, osm_id: 'imperial_palace' },
                    { name: { ja: '赤レンガ駅舎', en: 'Red Brick Station Building', zh: '紅磚站舍' }, osm_id: 'station_bldg' }
                ]
            },
            shopping: {
                id: 'shopping',
                count: 2,
                label: { ja: '買い物', en: 'Shopping', zh: '購物' },
                subcategories: {},
                representative_spots: [
                    { name: { ja: 'KITTE丸の内', en: 'KITTE Marunouchi', zh: 'KITTE丸之內' }, osm_id: 'kitte' },
                    { name: { ja: '八重洲地下街', en: 'Yaesu Shopping Mall', zh: '八重洲地下街' }, osm_id: 'yaesu_chikagai' }
                ]
            },
            dining: {
                id: 'dining',
                count: 1,
                label: { ja: '食事', en: 'Dining', zh: '美食' },
                subcategories: {},
                representative_spots: [
                    { name: { ja: '東京ラーメンストリート', en: 'Tokyo Ramen Street', zh: '東京拉麵街' }, osm_id: 'ramen_street' }
                ]
            }
        },
        vibe_tags: [
            { id: 'historic', label: { en: 'Historic', ja: '歴史的', zh: '歷史悠久' }, score: 5 },
            { id: 'business', label: { en: 'Business Center', ja: 'ビジネス中心', zh: '商業中心' }, score: 5 }
        ],
        last_updated: '2024-05-01T00:00:00Z'
    },

    // Akihabara
    'odpt:Station:JR-East.Akihabara': {
        categories: {
            shopping: {
                id: 'shopping',
                count: 2,
                label: { ja: '電気・ホビー', en: 'Electric & Hobby', zh: '電器與動漫' },
                subcategories: {},
                representative_spots: [
                    { name: { ja: 'ヨドバシAkiba', en: 'Yodobashi Camera Akiba', zh: '友都八喜 Akiba' }, osm_id: 'yodobashi' },
                    { name: { ja: '秋葉原ラジオ会館', en: 'Radio Kaikan', zh: '無線電會館' }, osm_id: 'radio_kaikan' }
                ]
            },
            culture: {
                id: 'culture',
                count: 1,
                label: { ja: 'サブカルチャー', en: 'Subculture', zh: '次文化' },
                subcategories: {},
                representative_spots: [
                    { name: { ja: '神田明神', en: 'Kanda Myoujin Shrine', zh: '神田明神' }, osm_id: 'kanda_myoujin' }
                ]
            }
        },
        vibe_tags: [
            { id: 'otaku', label: { en: 'Otaku Culture', ja: 'オタク文化', zh: '御宅文化' }, score: 5 },
            { id: 'electric', label: { en: 'Electric Town', ja: '電気街', zh: '電器街' }, score: 5 }
        ],
        last_updated: '2024-05-01T00:00:00Z'
    },

    // Asakusa
    'odpt:Station:TokyoMetro.Ginza.Asakusa': {
        categories: {
            culture: {
                id: 'culture',
                count: 2,
                label: { ja: '名所・旧跡', en: 'Sightseeing', zh: '名勝古蹟' },
                subcategories: {},
                representative_spots: [
                    { name: { ja: '浅草寺・雷門', en: 'Senso-ji Temple / Kaminarimon', zh: '淺草寺・雷門' }, osm_id: 'sensoji' },
                    { name: { ja: '東京スカイツリー', en: 'Tokyo Skytree', zh: '東京晴空塔' }, osm_id: 'skytree' }
                ]
            },
            dining: {
                id: 'dining',
                count: 1,
                label: { ja: '食事', en: 'Dining', zh: '美食' },
                subcategories: {},
                representative_spots: [
                    { name: { ja: '仲見世通り', en: 'Nakamise Shopping Street', zh: '仲見世商店街' }, osm_id: 'nakamise' }
                ]
            }
        },
        vibe_tags: [
            { id: 'traditional', label: { en: 'Traditional', ja: '伝統的', zh: '傳統' }, score: 5 },
            { id: 'tourist', label: { en: 'Tourist Hotspot', ja: '観光地', zh: '觀光熱點' }, score: 5 }
        ],
        last_updated: '2024-05-01T00:00:00Z'
    }
};
