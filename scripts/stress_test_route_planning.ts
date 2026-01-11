import { findRankedRoutes, RailwayTopology } from '../src/lib/l4/assistantEngine';
import CORE_TOPOLOGY from '../src/lib/l4/generated/coreTopology.json';
import { performance } from 'perf_hooks';

const railways = CORE_TOPOLOGY as unknown as RailwayTopology[];

// 輔助函數：查找車站 ID
function findStationIds(name: string): string[] {
  const exactIds = new Set<string>();
  const partialIds = new Set<string>();
  railways.forEach(r => {
    r.stationOrder.forEach(s => {
      if (s.title?.ja === name || s.title?.en === name) {
        exactIds.add(s.station);
      } else if (s.title?.ja?.includes(name) || s.title?.en?.includes(name)) {
        partialIds.add(s.station);
      }
    });
  });
  return exactIds.size > 0 ? Array.from(exactIds) : Array.from(partialIds);
}

// 測試案例數據集 (50 組)
const TEST_DATASET = [
  // --- 機場情境 (Airports - 使用門戶站代替) ---
  { from: '品川', to: '東京', type: 'Airport', googleDuration: 10 },
  { from: '成田空港', to: '新宿', type: 'Airport', googleDuration: 85 },
  { from: '浜松町', to: '渋谷', type: 'Airport', googleDuration: 20 },
  { from: '成田空港', to: '上野', type: 'Airport', googleDuration: 60 },
  { from: '品川', to: '横浜', type: 'Airport', googleDuration: 20 },
  
  // --- 市區核心 (Urban Core) ---
  { from: '東京', to: '新宿', type: 'Urban', googleDuration: 14 },
  { from: '銀座', to: '六本木', type: 'Urban', googleDuration: 12 },
  { from: '秋葉原', to: '渋谷', type: 'Urban', googleDuration: 30 },
  { from: '池袋', to: '品川', type: 'Urban', googleDuration: 28 },
  { from: '上野', to: '恵比寿', type: 'Urban', googleDuration: 32 },
  { from: '表参道', to: '日本橋', type: 'Urban', googleDuration: 20 },
  { from: '赤坂見附', to: '大手町', type: 'Urban', googleDuration: 10 },
  { from: '新橋', to: '新宿', type: 'Urban', googleDuration: 20 },
  { from: '目黒', to: '飯田橋', type: 'Urban', googleDuration: 25 },
  { from: '四ツ谷', to: '浅草', type: 'Urban', googleDuration: 25 },
  
  // --- 郊區/長距離 (Suburban/Long Distance) ---
  { from: '吉祥寺', to: '東京', type: 'Suburban', googleDuration: 35 },
  { from: '三鷹', to: '銀座', type: 'Suburban', googleDuration: 40 },
  { from: '立川', to: '新宿', type: 'Suburban', googleDuration: 30 },
  { from: '八王子', to: '東京', type: 'Suburban', googleDuration: 55 },
  { from: '町田', to: '渋谷', type: 'Suburban', googleDuration: 45 },
  { from: '大宮', to: '新宿', type: 'Suburban', googleDuration: 35 },
  { from: '浦和', to: '東京', type: 'Suburban', googleDuration: 30 },
  { from: '柏', to: '上野', type: 'Suburban', googleDuration: 35 },
  { from: '船橋', to: '秋葉原', type: 'Suburban', googleDuration: 30 },
  { from: '千葉', to: '東京', type: 'Suburban', googleDuration: 45 },
  { from: '川越', to: '池袋', type: 'Suburban', googleDuration: 35 },
  { from: '所沢', to: '新宿', type: 'Suburban', googleDuration: 40 },
  { from: '高尾', to: '新宿', type: 'Suburban', googleDuration: 50 },
  { from: '国分寺', to: '新宿', type: 'Suburban', googleDuration: 25 },
  { from: '府中', to: '新宿', type: 'Suburban', googleDuration: 30 },

  // --- 複雜轉乘情境 (Complex Transfers) ---
  { from: '浅草', to: '都庁前', type: 'Complex', googleDuration: 35 },
  { from: '押上', to: '中目黒', type: 'Complex', googleDuration: 45 },
  { from: '中目黒', to: '秋葉原', type: 'Complex', googleDuration: 30 },
  { from: '代々木上原', to: '東京', type: 'Complex', googleDuration: 25 },
  { from: '北千住', to: '六本木', type: 'Complex', googleDuration: 40 },
  { from: '中野', to: '豊洲', type: 'Complex', googleDuration: 45 },
  { from: '荻窪', to: '月島', type: 'Complex', googleDuration: 40 },
  { from: '練馬', to: '新橋', type: 'Complex', googleDuration: 35 },
  { from: '和光市', to: '銀座', type: 'Complex', googleDuration: 45 },
  { from: '赤羽', to: '六本木', type: 'Complex', googleDuration: 35 },

  // --- 隨機/其他 (Misc) ---
  { from: '駒込', to: '五反田', type: 'Misc', googleDuration: 35 },
  { from: '巣鴨', to: '浜松町', type: 'Misc', googleDuration: 30 },
  { from: '大井町', to: '赤羽', type: 'Misc', googleDuration: 40 },
  { from: '蒲田', to: '日暮里', type: 'Misc', googleDuration: 45 },
  { from: '大森', to: '亀戸', type: 'Misc', googleDuration: 40 },
  { from: '錦糸町', to: '恵比寿', type: 'Misc', googleDuration: 35 },
  { from: '両国', to: '原宿', type: 'Misc', googleDuration: 30 },
  { from: '水道橋', to: '舞浜', type: 'Misc', googleDuration: 45 },
  { from: '御茶ノ水', to: '舞浜', type: 'Misc', googleDuration: 40 },
  { from: '神田', to: '駒沢大学', type: 'Misc', googleDuration: 30 }
];

async function runStressTest() {
  console.log('=== BambiGO 路線規劃演算法壓力測試與可靠性驗證 ===');
  console.log(`總測試案例數: ${TEST_DATASET.length}`);
  
  const results: any[] = [];
  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

  for (const tc of TEST_DATASET) {
    const fromIds = findStationIds(tc.from);
    const toIds = findStationIds(tc.to);

    if (fromIds.length === 0 || toIds.length === 0) {
      console.log(`⚠️ 找不到車站: ${tc.from} 或 ${tc.to}`);
      continue;
    }

    const startTime = performance.now();
    const routes = findRankedRoutes({
      originStationId: fromIds[0],
      destinationStationId: toIds,
      railways,
      locale: 'zh-TW'
    });
    const endTime = performance.now();

    const executionTime = endTime - startTime;
    const bestRoute = routes[0];
    const duration = bestRoute?.duration ?? 0;

    results.push({
      ...tc,
      executionTime,
      found: routes.length > 0,
      duration: duration,
      transfers: bestRoute?.transfers || 0,
      label: bestRoute?.label || 'N/A',
      accuracy: tc.googleDuration ? (1 - Math.abs(duration - tc.googleDuration) / tc.googleDuration) : null
    });
  }

  const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
  const avgTime = results.reduce((acc, r) => acc + r.executionTime, 0) / results.length;
  const maxTime = Math.max(...results.map(r => r.executionTime));
  const avgAccuracy = results.filter(r => r.accuracy !== null).reduce((acc, r) => acc + r.accuracy, 0) / results.filter(r => r.accuracy !== null).length;
  
  console.log('\n--- 統計數據 ---');
  console.log(`平均響應時間: ${avgTime.toFixed(2)} ms`);
  console.log(`最大響應時間: ${maxTime.toFixed(2)} ms`);
  console.log(`平均時間準確率: ${(avgAccuracy * 100).toFixed(2)}%`);
  console.log(`記憶體增量: ${(endMemory - startMemory).toFixed(2)} MB`);
  console.log(`成功率: ${(results.filter(r => r.found).length / results.length * 100).toFixed(2)}%`);

  console.log('\n--- 異常案例分析 (準確率 < 85%) ---');
  results.filter(r => r.accuracy !== null && r.accuracy < 0.85).forEach(r => {
    console.log(`[${r.type}] ${r.from} -> ${r.to}: BambiGO ${r.duration}分 vs Google ${r.googleDuration}分 (準確率: ${(r.accuracy * 100).toFixed(2)}%)`);
  });

  // 輸出 JSON 供後續分析
  const fs = require('fs');
  fs.writeFileSync('test_results.json', JSON.stringify({
    stats: { avgTime, maxTime, memoryDelta: endMemory - startMemory, successRate: results.filter(r => r.found).length / results.length },
    results
  }, null, 2));
}

runStressTest().catch(console.error);
