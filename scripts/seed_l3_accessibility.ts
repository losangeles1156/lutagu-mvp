import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// L3 無障礙設施數據 - 主要樞紐站電梯、電扶梯、廁所位置資訊
const L3_ACCESSIBILITY_DATA = [
  // ========== 新宿區 (Shinjuku Ward) ==========
  {
    station_id: 'odpt:Station:JR-East.Shinjuku',
    type: 'elevator',
    name_i18n: { 'zh-TW': 'JR新宿站西口電梯', 'ja': '新宿駅西口エレベーター', 'en': 'JR Shinjuku West Exit Elevator' },
    attributes: { location: 'West Exit', floors: 'B1F-2F', accessible: true }
  },
  {
    station_id: 'odpt:Station:JR-East.Shinjuku',
    type: 'elevator',
    name_i18n: { 'zh-TW': 'JR新宿站東口電梯', 'ja': '新宿駅東口エレベーター', 'en': 'JR Shinjuku East Exit Elevator' },
    attributes: { location: 'East Exit', floors: 'B1F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:JR-East.Shinjuku',
    type: 'escalator',
    name_i18n: { 'zh-TW': 'JR新宿站南口電扶梯', 'ja': '新宿駅南口エスカレーター', 'en': 'JR Shinjuku South Exit Escalator' },
    attributes: { location: 'South Exit', direction: 'up_only', length: 'medium' }
  },
  {
    station_id: 'odpt:Station:JR-East.Shinjuku',
    type: 'toilet',
    name_i18n: { 'zh-TW': 'JR新宿站西口多功能廁所', 'ja': '新宿駅西口多目的トイレ', 'en': 'JR Shinjuku West Exit Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'West Entrance' }
  },

  // ========== 港區 (Minato Ward) ==========
  {
    station_id: 'odpt:Station:JR-East.Hamamatsucho',
    type: 'elevator',
    name_i18n: { 'zh-TW': 'JR濱松町站北口電梯', 'ja': '浜松町駅北口エレベーター', 'en': 'JR Hamamatsucho North Exit Elevator' },
    attributes: { location: 'North Exit', floors: '1F-2F', accessible: true }
  },
  {
    station_id: 'odpt:Station:JR-East.Hamamatsucho',
    type: 'escalator',
    name_i18n: { 'zh-TW': 'JR濱松町站連絡通道電扶梯', 'ja': '浜松町駅連絡通路エスカレーター', 'en': 'JR Hamamatsucho Connecting Corridor Escalator' },
    attributes: { location: 'Connector', direction: 'bidirectional', length: 'long' }
  },
  {
    station_id: 'odpt:Station:JR-East.Hamamatsucho',
    type: 'toilet',
    name_i18n: { 'zh-TW': 'JR濱松町站站內無障礙廁所', 'ja': '浜松町駅構内多目的トイレ', 'en': 'JR Hamamatsucho Station Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'Inside Station' }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Roppongi',
    type: 'elevator',
    name_i18n: { 'zh-TW': '六本木站1號出口電梯', 'ja': '六本木駅1番出口エレベーター', 'en': 'Roppongi Exit 1 Elevator' },
    attributes: { location: 'Exit 1', floors: 'B1F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Roppongi',
    type: 'escalator',
    name_i18n: { 'zh-TW': '六本木站大江戶線連絡電扶梯', 'ja': '六本木駅大江戸線連絡エスカレーター', 'en': 'Roppongi Oedo Line Connector Escalator' },
    attributes: { location: 'Oedo Line Connector', direction: 'bidirectional', length: 'very_long' }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Roppongi',
    type: 'toilet',
    name_i18n: { 'zh-TW': '六本木站付費區內無障礙廁所', 'ja': '六本木駅課金エリア多目的トイレ', 'en': 'Roppongi Paid Area Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'Paid Area' }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Shimbashi',
    type: 'elevator',
    name_i18n: { 'zh-TW': '新橋站烏森口電梯', 'ja': '新橋駅烏森口エレベーター', 'en': 'Shimbashi Karasumori Exit Elevator' },
    attributes: { location: 'Karasumori Exit', floors: 'B1F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Shimbashi',
    type: 'toilet',
    name_i18n: { 'zh-TW': '新橋站烏森口多功能廁所', 'ja': '新橋駅烏森口多目的トイレ', 'en': 'Shimbashi Karasumori Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'Karasumori Exit' }
  },

  // ========== 涉谷區 (Shibuya Ward) ==========
  {
    station_id: 'odpt:Station:JR-East.Shibuya',
    type: 'elevator',
    name_i18n: { 'zh-TW': 'JR澀谷站南口電梯', 'ja': '渋谷駅南口エレベーター', 'en': 'JR Shibuya South Exit Elevator' },
    attributes: { location: 'South Exit', floors: 'B2F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:JR-East.Shibuya',
    type: 'elevator',
    name_i18n: { 'zh-TW': 'JR澀谷站 Hikarie 電梯', 'ja': '渋谷駅渋谷ヒカリエエレベーター', 'en': 'JR Shibuya Hikarie Elevator' },
    attributes: { location: 'Hikarie', floors: 'B3F-3F', accessible: true }
  },
  {
    station_id: 'odpt:Station:JR-East.Shibuya',
    type: 'escalator',
    name_i18n: { 'zh-TW': 'JR澀谷站南口電扶梯', 'ja': '渋谷駅南口エスカレーター', 'en': 'JR Shibuya South Exit Escalator' },
    attributes: { location: 'South Exit', direction: 'up_only', length: 'long' }
  },
  {
    station_id: 'odpt:Station:JR-East.Shibuya',
    type: 'toilet',
    name_i18n: { 'zh-TW': 'JR澀谷站南口多功能廁所', 'ja': '渋谷駅南口多目的トイレ', 'en': 'JR Shibuya South Exit Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'South Exit' }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Shibuya',
    type: 'elevator',
    name_i18n: { 'zh-TW': '東京Metro澀谷站電梯', 'ja': '東京メトロ渋谷駅エレベーター', 'en': 'Tokyo Metro Shibuya Elevator' },
    attributes: { location: 'Main Concourse', floors: 'B2F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Omotesando',
    type: 'elevator',
    name_i18n: { 'zh-TW': '表參道站A2出口電梯', 'ja': '表参道駅A2出口エレベーター', 'en': 'Omotesando Exit A2 Elevator' },
    attributes: { location: 'Exit A2', floors: 'B1F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Omotesando',
    type: 'escalator',
    name_i18n: { 'zh-TW': '表參道站B1電扶梯', 'ja': '表参道駅B1エスカレーター', 'en': 'Omotesando B1 Escalator' },
    attributes: { location: 'B1 Concourse', direction: 'bidirectional', length: 'medium' }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Omotesando',
    type: 'toilet',
    name_i18n: { 'zh-TW': '表參道站站內無障礙廁所', 'ja': '表参道駅構内多目的トイレ', 'en': 'Omotesando Station Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'Inside Station' }
  },

  // ========== 千代田區 (Chiyoda Ward) ==========
  {
    station_id: 'odpt:Station:JR-East.Tokyo',
    type: 'elevator',
    name_i18n: { 'zh-TW': '東京站丸之內北口電梯', 'ja': '東京駅丸の内北口エレベーター', 'en': 'Tokyo Marunouchi North Exit Elevator' },
    attributes: { location: 'Marunouchi North Exit', floors: 'B1F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:JR-East.Tokyo',
    type: 'elevator',
    name_i18n: { 'zh-TW': '東京站日本橋口電梯', 'ja': '東京駅日本橋口エレベーター', 'en': 'Tokyo Nihombashi Exit Elevator' },
    attributes: { location: 'Nihombashi Exit', floors: 'B1F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:JR-East.Tokyo',
    type: 'escalator',
    name_i18n: { 'zh-TW': '東京站丸之內地下連絡電扶梯', 'ja': '東京駅丸の内地下連絡エスカレーター', 'en': 'Tokyo Marunouchi Underground Connector Escalator' },
    attributes: { location: 'Underground Connector', direction: 'bidirectional', length: 'very_long' }
  },
  {
    station_id: 'odpt:Station:JR-East.Tokyo',
    type: 'toilet',
    name_i18n: { 'zh-TW': '東京站丸之內北口多功能廁所', 'ja': '東京駅丸の内北口多目的トイレ', 'en': 'Tokyo Marunouchi North Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'Marunouchi North' }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Hibiya',
    type: 'elevator',
    name_i18n: { 'zh-TW': '日比谷站A5出口電梯', 'ja': '日比谷駅A5出口エレベーター', 'en': 'Hibiya Exit A5 Elevator' },
    attributes: { location: 'Exit A5', floors: 'B2F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Hibiya',
    type: 'escalator',
    name_i18n: { 'zh-TW': '日比谷站A5出口電扶梯', 'ja': '日比谷駅A5出口エスカレーター', 'en': 'Hibiya Exit A5 Escalator' },
    attributes: { location: 'Exit A5', direction: 'up_only', length: 'medium' }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Hibiya',
    type: 'toilet',
    name_i18n: { 'zh-TW': '日比谷站站內多功能廁所', 'ja': '日比谷駅構内多目的トイレ', 'en': 'Hibiya Station Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'Inside Station' }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Kasumigaseki',
    type: 'elevator',
    name_i18n: { 'zh-TW': '霞關站A1出口電梯', 'ja': '霞ヶ関駅A1出口エレベーター', 'en': 'Kasumigaseki Exit A1 Elevator' },
    attributes: { location: 'Exit A1', floors: 'B1F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Kasumigaseki',
    type: 'toilet',
    name_i18n: { 'zh-TW': '霞關站站內無障礙廁所', 'ja': '霞ヶ関駅構内多目的トイレ', 'en': 'Kasumigaseki Station Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'Inside Station' }
  },

  // ========== 中央區 (Chuo Ward) ==========
  {
    station_id: 'odpt:Station:Toei.Nihombashi',
    type: 'elevator',
    name_i18n: { 'zh-TW': '日本橋站B1出口電梯', 'ja': '日本橋駅B1出口エレベーター', 'en': 'Nihombashi Exit B1 Elevator' },
    attributes: { location: 'Exit B1', floors: 'B1F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:Toei.Nihombashi',
    type: 'escalator',
    name_i18n: { 'zh-TW': '日本橋站連絡通道電扶梯', 'ja': '日本橋駅連絡通路エスカレーター', 'en': 'Nihombashi Connector Escalator' },
    attributes: { location: 'Connector', direction: 'bidirectional', length: 'medium' }
  },
  {
    station_id: 'odpt:Station:Toei.Nihombashi',
    type: 'toilet',
    name_i18n: { 'zh-TW': '日本橋站多功能廁所', 'ja': '日本橋駅多目的トイレ', 'en': 'Nihombashi Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'Station Hall' }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Ginza',
    type: 'elevator',
    name_i18n: { 'zh-TW': '銀座站A3出口電梯', 'ja': '銀座駅A3出口エレベーター', 'en': 'Ginza Exit A3 Elevator' },
    attributes: { location: 'Exit A3', floors: 'B1F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Ginza',
    type: 'escalator',
    name_i18n: { 'zh-TW': '銀座站A3出口電扶梯', 'ja': '銀座駅A3出口エスカレーター', 'en': 'Ginza Exit A3 Escalator' },
    attributes: { location: 'Exit A3', direction: 'up_only', length: 'medium' }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Ginza',
    type: 'toilet',
    name_i18n: { 'zh-TW': '銀座站站內無障礙廁所', 'ja': '銀座駅構内多目的トイレ', 'en': 'Ginza Station Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'Inside Station' }
  },

  // ========== 台東區 (Taito Ward) ==========
  {
    station_id: 'odpt:Station:JR-East.Ueno',
    type: 'elevator',
    name_i18n: { 'zh-TW': 'JR上野站不忍口電梯', 'ja': '上野駅不忍口エレベーター', 'en': 'JR Ueno Shinobazu Exit Elevator' },
    attributes: { location: 'Shinobazu Exit', floors: 'B1F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:JR-East.Ueno',
    type: 'elevator',
    name_i18n: { 'zh-TW': 'JR上野站正面口電梯', 'ja': '上野駅正面口エレベーター', 'en': 'JR Ueno Main Exit Elevator' },
    attributes: { location: 'Main Exit', floors: 'B1F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:JR-East.Ueno',
    type: 'escalator',
    name_i18n: { 'zh-TW': 'JR上野站不忍口電扶梯', 'ja': '上野駅不忍口エスカレーター', 'en': 'JR Ueno Shinobazu Exit Escalator' },
    attributes: { location: 'Shinobazu Exit', direction: 'up_only', length: 'medium' }
  },
  {
    station_id: 'odpt:Station:JR-East.Ueno',
    type: 'toilet',
    name_i18n: { 'zh-TW': 'JR上野站不忍口多功能廁所', 'ja': '上野駅不忍口多目的トイレ', 'en': 'JR Ueno Shinobazu Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'Shinobazu Exit' }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Ginza.Asakusa',
    type: 'elevator',
    name_i18n: { 'zh-TW': '淺草站1號出口電梯', 'ja': '浅草駅1番出口エレベーター', 'en': 'Asakusa Exit 1 Elevator' },
    attributes: { location: 'Exit 1', floors: 'B1F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Ginza.Asakusa',
    type: 'escalator',
    name_i18n: { 'zh-TW': '淺草站連絡電扶梯', 'ja': '浅草駅連絡エスカレーター', 'en': 'Asakusa Connector Escalator' },
    attributes: { location: 'Connector', direction: 'bidirectional', length: 'long' }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Ginza.Asakusa',
    type: 'toilet',
    name_i18n: { 'zh-TW': '淺草站站內多功能廁所', 'ja': '浅草駅構内多目的トイレ', 'en': 'Asakusa Station Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'Inside Station' }
  },
  {
    station_id: 'odpt:Station:JR-East.Akihabara',
    type: 'elevator',
    name_i18n: { 'zh-TW': '秋葉原站電氣街口電梯', 'ja': '秋葉原駅電気街口エレベーター', 'en': 'Akihabara Electric Town Exit Elevator' },
    attributes: { location: 'Electric Town Exit', floors: 'B1F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:JR-East.Akihabara',
    type: 'escalator',
    name_i18n: { 'zh-TW': '秋葉原站電氣街口電扶梯', 'ja': '秋葉原駅電気街口エスカレーター', 'en': 'Akihabara Electric Town Exit Escalator' },
    attributes: { location: 'Electric Town Exit', direction: 'up_only', length: 'medium' }
  },
  {
    station_id: 'odpt:Station:JR-East.Akihabara',
    type: 'toilet',
    name_i18n: { 'zh-TW': '秋葉原站多功能廁所', 'ja': '秋葉原駅多目的トイレ', 'en': 'Akihabara Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'Station Hall' }
  },

  // ========== 文京區 (Bunkyo Ward) ==========
  {
    station_id: 'odpt:Station:TokyoMetro.Ochanomizu',
    type: 'elevator',
    name_i18n: { 'zh-TW': '御茶之水站1號出口電梯', 'ja': '御茶ノ水駅1番出口エレベーター', 'en': 'Ochanomizu Exit 1 Elevator' },
    attributes: { location: 'Exit 1', floors: 'B1F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:TokyoMetro.Ochanomizu',
    type: 'toilet',
    name_i18n: { 'zh-TW': '御茶之水站站內無障礙廁所', 'ja': '御茶ノ水駅構内多目的トイレ', 'en': 'Ochanomizu Station Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'Inside Station' }
  },

  // ========== 墨田區 (Sumida Ward) ==========
  {
    station_id: 'odpt:Station:Toei.Asakusa.Oshiage',
    type: 'elevator',
    name_i18n: { 'zh-TW': '押上站A1出口電梯', 'ja': '押上駅A1出口エレベーター', 'en': 'Oshiage Exit A1 Elevator' },
    attributes: { location: 'Exit A1', floors: 'B2F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:Toei.Asakusa.Oshiage',
    type: 'escalator',
    name_i18n: { 'zh-TW': '押上站連絡電扶梯', 'ja': '押上駅連絡エスカレーター', 'en': 'Oshiage Connector Escalator' },
    attributes: { location: 'Connector', direction: 'bidirectional', length: 'very_long' }
  },
  {
    station_id: 'odpt:Station:Toei.Asakusa.Oshiage',
    type: 'toilet',
    name_i18n: { 'zh-TW': '押上站多功能廁所', 'ja': '押上駅多目的トイレ', 'en': 'Oshiage Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'Station Hall' }
  },

  // ========== 豊島區 (Toshima Ward) ==========
  {
    station_id: 'odpt:Station:JR-East.Ikebukuro',
    type: 'elevator',
    name_i18n: { 'zh-TW': 'JR池袋站東口電梯', 'ja': '池袋駅東口エレベーター', 'en': 'JR Ikebukuro East Exit Elevator' },
    attributes: { location: 'East Exit', floors: 'B1F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:JR-East.Ikebukuro',
    type: 'elevator',
    name_i18n: { 'zh-TW': 'JR池袋站西口電梯', 'ja': '池袋駅西口エレベーター', 'en': 'JR Ikebukuro West Exit Elevator' },
    attributes: { location: 'West Exit', floors: 'B1F-1F', accessible: true }
  },
  {
    station_id: 'odpt:Station:JR-East.Ikebukuro',
    type: 'escalator',
    name_i18n: { 'zh-TW': 'JR池袋站東口電扶梯', 'ja': '池袋駅東口エスカレーター', 'en': 'JR Ikebukuro East Exit Escalator' },
    attributes: { location: 'East Exit', direction: 'up_only', length: 'medium' }
  },
  {
    station_id: 'odpt:Station:JR-East.Ikebukuro',
    type: 'toilet',
    name_i18n: { 'zh-TW': 'JR池袋站東口多功能廁所', 'ja': '池袋駅東口多目的トイレ', 'en': 'JR Ikebukuro East Multi-purpose Toilet' },
    attributes: { accessible: true, ostomate: true, baby_friendly: true, location: 'East Exit' }
  },
];

async function seedL3Accessibility() {
  console.log('🌱 Seeding L3 Accessibility Facilities...');

  let successCount = 0;
  let errorCount = 0;

  for (const facility of L3_ACCESSIBILITY_DATA) {
    const { error } = await supabase
      .from('l3_facilities')
      .upsert({
        station_id: facility.station_id,
        type: facility.type,
        name_i18n: facility.name_i18n,
        attributes: facility.attributes,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'station_id, type, name_i18n',
        ignoreDuplicates: true
      });

    if (error) {
      console.error(`❌ Error seeding ${facility.station_id} (${facility.type}):`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`✅ Seeding complete: ${successCount} facilities seeded, ${errorCount} errors`);
  console.log(`📊 Total L3 accessibility facilities: ${L3_ACCESSIBILITY_DATA.length}`);
}

seedL3Accessibility().catch(console.error);
