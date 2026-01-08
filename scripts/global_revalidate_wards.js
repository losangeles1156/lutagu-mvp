const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// 定義東京 23 區的大致地理邊界 (簡化版，用於快速修正)
const WARD_BOUNDS = {
  'ward:chiyoda': { lon: [139.73, 139.78], lat: [35.66, 35.70] },
  'ward:chuo': { lon: [139.75, 139.80], lat: [35.64, 35.69] },
  'ward:minato': { lon: [139.70, 139.77], lat: [35.61, 35.68] },
  'ward:shinjuku': { lon: [139.67, 139.74], lat: [35.67, 35.72] },
  'ward:bunkyo': { lon: [139.71, 139.77], lat: [35.70, 35.74] },
  'ward:taito': { lon: [139.76, 139.81], lat: [35.69, 35.74] },
  'ward:sumida': { lon: [139.79, 139.84], lat: [35.68, 35.74] },
  'ward:koto': { lon: [139.77, 139.86], lat: [35.60, 35.70] },
  'ward:shinagawa': { lon: [139.69, 139.77], lat: [35.58, 35.64] },
  'ward:meguro': { lon: [139.65, 139.72], lat: [35.60, 35.65] },
  'ward:ota': { lon: [139.64, 139.80], lat: [35.50, 35.61] },
  'ward:setagaya': { lon: [139.58, 139.69], lat: [35.59, 35.68] },
  'ward:shibuya': { lon: [139.66, 139.73], lat: [35.63, 35.69] },
  'ward:nakano': { lon: [139.64, 139.69], lat: [35.68, 35.74] },
  'ward:suginami': { lon: [139.58, 139.67], lat: [35.66, 35.73] },
  'ward:toshima': { lon: [139.67, 139.75], lat: [35.71, 35.75] },
  'ward:kita': { lon: [139.70, 139.77], lat: [35.74, 35.80] },
  'ward:arakawa': { lon: [139.76, 139.81], lat: [35.72, 35.75] },
  'ward:itabashi': { lon: [139.63, 139.72], lat: [35.73, 35.80] },
  'ward:nerima': { lon: [139.56, 139.68], lat: [35.71, 35.78] },
  'ward:adachi': { lon: [139.75, 139.86], lat: [35.74, 35.82] },
  'ward:katsushika': { lon: [139.82, 139.89], lat: [35.72, 35.79] },
  'ward:edogawa': { lon: [139.83, 139.90], lat: [35.63, 35.74] }
};

async function globalRevalidateWards() {
  console.log('--- 開始全球地理校準 ---');

  // 1. 獲取所有活躍節點
  const { data: nodes, error } = await supabase
    .from('nodes')
    .select('id, name->>ja, coordinates, ward_id');

  if (error) {
    console.error('獲取節點失敗:', error);
    return;
  }

  console.log(`正在掃描 ${nodes.length} 個節點...`);

  let updateCount = 0;
  let deactivateCount = 0;

  for (const node of nodes) {
    const coords = node.coordinates?.coordinates;
    if (!coords) continue;

    const [lon, lat] = coords;
    let correctWardId = null;

    // 如果是核心 Hub，強制使用正確的行政區歸屬，不進行地理判定
    const HUB_FORCED_WARDS = {
      'Ikebukuro': 'ward:toshima',
      'Shibuya': 'ward:shibuya',
      'Shinjuku': 'ward:shinjuku',
      'Ueno': 'ward:taito',
      'Akihabara': 'ward:chiyoda',
      'Tokyo': 'ward:chiyoda',
      'Shinagawa': 'ward:shinagawa'
    };

    for (const [namePart, wardId] of Object.entries(HUB_FORCED_WARDS)) {
      if (node.id.includes(namePart)) {
        correctWardId = wardId;
        break;
      }
    }

    if (!correctWardId) {
      // 檢查屬於哪個區
      for (const [wardId, bounds] of Object.entries(WARD_BOUNDS)) {
        if (lon >= bounds.lon[0] && lon <= bounds.lon[1] &&
            lat >= bounds.lat[0] && lat <= bounds.lat[1]) {
          correctWardId = wardId;
          break;
        }
      }
    }

    // 如果不在 23 區內且不是機場，則標記為非活躍
    if (!correctWardId && node.ward_id !== 'ward:airport' && node.ward_id !== 'airport') {
      // 檢查是否真的在東京以外 (例如埼玉)
      if (lat > 35.82 || lat < 35.50 || lon < 139.50 || lon > 139.95) {
        await supabase.from('nodes').update({ is_active: false }).eq('id', node.id);
        deactivateCount++;
        continue;
      }
    }

    // 如果計算出的正確區與當前區不符，則更新
    if (correctWardId && correctWardId !== node.ward_id) {
      console.log(`[校正] ${node.ja}: ${node.ward_id} -> ${correctWardId}`);
      await supabase.from('nodes').update({ ward_id: correctWardId }).eq('id', node.id);
      updateCount++;
    }
  }

  console.log(`\n校準完成！`);
  console.log(`更新歸屬: ${updateCount} 個節點`);
  console.log(`停用外區: ${deactivateCount} 個節點`);
}

globalRevalidateWards();
