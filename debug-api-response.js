// 在瀏覽器 Console 執行此腳本，檢查 API 返回的資料結構
// 這將幫助我們了解為什麼 hubDetails 沒有正確傳遞

console.log("=== LUTAGU API Debug Tool ===");

// 攔截 fetch 請求來檢查 API 回應
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch(...args);
  const url = args[0];

  // 只攔截 nodes/viewport API
  if (url.includes('/api/nodes/viewport')) {
    console.log("✓ Intercepted API call:", url);

    // Clone response to read it
    const clone = response.clone();
    const data = await clone.json();

    console.log("✓ API Response:", data);
    console.log("✓ Total nodes:", data.nodes?.length || 0);

    // 檢查前 5 個節點的結構
    if (data.nodes && data.nodes.length > 0) {
      console.log("\n=== First 5 Nodes Structure ===");
      data.nodes.slice(0, 5).forEach((node, i) => {
        console.log(`\nNode ${i + 1}:`, {
          id: node.id,
          name: node.name,
          is_hub: node.is_hub,
          parent_hub_id: node.parent_hub_id,
          hubDetails: node.hubDetails,
          member_count: node.member_count,
        });
      });
    }

    // 檢查是否有上野站
    const uenoNodes = data.nodes?.filter(n =>
      n.name?.['zh-TW']?.includes('上野') ||
      n.name?.['ja']?.includes('上野')
    );

    if (uenoNodes && uenoNodes.length > 0) {
      console.log("\n=== Found Ueno Nodes ===");
      uenoNodes.forEach(node => {
        console.log({
          id: node.id,
          name: node.name,
          is_hub: node.is_hub,
          parent_hub_id: node.parent_hub_id,
          hubDetails: node.hubDetails,
          member_count: node.member_count,
        });
      });
    } else {
      console.error("✗ No Ueno nodes found in API response!");
    }
  }

  return response;
};

console.log("✓ Fetch interceptor installed. Refresh the page to see API calls.");
console.log("✓ Or zoom/pan the map to trigger new API requests.");
