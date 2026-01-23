#!/usr/bin/env node
/**
 * 測試 API 修復是否生效
 * 驗證 hub_details 現在是否包含 parent_hub_id = null 的節點
 */

// 使用 Node.js 內建 fetch (v18+)

async function testApiFix() {
  console.log('=== 測試 API 修復 ===\n');

  // 使用上野附近的座標
  const testParams = {
    min_lat: 35.70,
    max_lat: 35.72,
    min_lon: 139.76,
    max_lon: 139.78,
    zoom: 14
  };

  const url = `http://localhost:3000/api/nodes/viewport?${new URLSearchParams(testParams)}`;

  console.log('📡 呼叫 API...');
  console.log(`座標範圍: 上野周邊 (zoom=${testParams.zoom})\n`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log(`✓ 成功取得資料\n`);
    console.log(`總節點數: ${data.nodes?.length || 0}`);
    console.log(`hub_details 項目數: ${Object.keys(data.hub_details || {}).length}\n`);

    // 分析 hub_details
    if (data.hub_details && Object.keys(data.hub_details).length > 0) {
      console.log('✅ hub_details 有資料！\n');
      console.log('詳細內容：');

      Object.entries(data.hub_details).forEach(([hubId, details]) => {
        // 找出對應的節點
        const node = data.nodes.find(n => n.id === hubId);
        const name = node?.name?.ja || node?.name?.en || 'Unknown';

        console.log(`\n  ${name} (${hubId})`);
        console.log(`    member_count: ${details.member_count}`);
        console.log(`    transfer_type: ${details.transfer_type}`);
        console.log(`    node.is_hub: ${node?.is_hub}`);
        console.log(`    node.parent_hub_id: ${node?.parent_hub_id || 'null ✅'}`);
      });

      // 檢查是否有上野站
      const uenoHubs = Object.entries(data.hub_details).filter(([hubId, details]) => {
        const node = data.nodes.find(n => n.id === hubId);
        const name = JSON.stringify(node?.name || {});
        return name.includes('上野') || name.includes('Ueno');
      });

      if (uenoHubs.length > 0) {
        console.log('\n\n🎉 成功！找到上野站的 hub_details：');
        uenoHubs.forEach(([hubId, details]) => {
          const node = data.nodes.find(n => n.id === hubId);
          console.log(`  - ${node?.name?.ja || node?.name?.en}`);
        });
      } else {
        console.log('\n\n⚠️ 在 hub_details 中沒找到上野站');
      }

    } else {
      console.log('❌ hub_details 仍然是空的');
      console.log('\n可能原因：');
      console.log('1. API 修改尚未生效（需要重啟）');
      console.log('2. 這個範圍內沒有 parent_hub_id = null 的節點');
      console.log('3. 節點過濾邏輯有問題');
    }

    // 顯示範圍內所有 parent_hub_id = null 的節點
    const potentialHubs = data.nodes?.filter(n => n.parent_hub_id === null) || [];
    console.log(`\n\n範圍內 parent_hub_id = null 的節點共 ${potentialHubs.length} 個：`);
    potentialHubs.slice(0, 10).forEach(node => {
      const name = node.name?.ja || node.name?.en || 'Unknown';
      console.log(`  - ${name} (is_hub: ${node.is_hub})`);
    });

  } catch (error) {
    console.error('❌ API 呼叫失敗:', error.message);
  }
}

testApiFix().catch(console.error);
