// 快速診斷腳本 - 在瀏覽器 Console 執行
// 這將立即告訴我們問題所在

console.log("=== LUTAGU 快速診斷工具 ===\n");

// 1. 檢查地圖上的所有 marker
const markers = document.querySelectorAll('.custom-node-icon');
console.log(`✓ 地圖上共有 ${markers.length} 個 marker\n`);

// 2. 分析有無標籤
let withLabel = 0;
let withoutLabel = 0;
let hubsWithLabel = 0;
let hubsWithoutLabel = 0;

markers.forEach(marker => {
  const hasLabel = marker.querySelector('.absolute.-bottom-12, [class*="bottom-12"]');
  const hasBadge = marker.textContent.match(/\+\d+/);
  const hasCrown = marker.innerHTML.includes('crown') || marker.innerHTML.includes('Crown');
  const isHub = hasBadge || hasCrown || marker.textContent.includes('M');

  if (hasLabel) {
    withLabel++;
    if (isHub) hubsWithLabel++;
  } else {
    withoutLabel++;
    if (isHub) hubsWithoutLabel++;
  }
});

console.log("標籤統計：");
console.log(`  有標籤：${withLabel} 個`);
console.log(`  無標籤：${withoutLabel} 個`);
console.log(`\n樞紐站統計：`);
console.log(`  有標籤的樞紐：${hubsWithLabel} 個`);
console.log(`  無標籤的樞紐：${hubsWithoutLabel} 個 ⚠️\n`);

// 3. 檢查 React 狀態（如果可訪問）
try {
  // 嘗試從 window 獲取狀態（開發模式）
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log("✓ React DevTools 已安裝\n");
    console.log("請手動檢查以下內容：");
    console.log("1. 使用 React DevTools 選擇一個藍色 M marker（NodeMarker 元件）");
    console.log("2. 查看 props.hubDetails 是否存在");
    console.log("3. 查看 props.node.is_hub 的值");
    console.log("4. 查看 props.node.parent_hub_id 的值\n");
  }
} catch (e) {
  console.log("⚠️ 無法訪問 React 狀態\n");
}

// 4. 檢查最近的 API 請求（如果可訪問）
console.log("=== 請手動檢查 Network 面板 ===");
console.log("1. 開啟 Network 面板（F12 > Network）");
console.log("2. 過濾：viewport");
console.log("3. 點擊最新的 /api/nodes/viewport 請求");
console.log("4. 查看 Response 中的 hub_details 欄位");
console.log("5. 確認是否包含上野站（Ueno）的 key\n");

// 5. 最終診斷
console.log("=== 診斷結果 ===\n");

if (hubsWithoutLabel > hubsWithLabel) {
  console.error("❌ 問題確認：大多數樞紐站沒有標籤");
  console.log("\n可能原因：");
  console.log("1. 資料庫 is_hub 欄位未正確設定（最可能）");
  console.log("2. API 未生成 hub_details");
  console.log("3. 前端 hubDetails 未正確傳遞\n");

  console.log("建議行動：");
  console.log("1. 檢查 Network > viewport API > Response > hub_details");
  console.log("2. 如果 hub_details 為空或很少，問題在後端（資料庫/API）");
  console.log("3. 如果 hub_details 有資料，問題在前端（props 傳遞）\n");
} else if (hubsWithLabel > 0) {
  console.log("✓ 部分樞紐站有標籤");
  console.log("⚠️ 可能是特定站點的資料問題\n");
} else {
  console.error("❌ 沒有任何樞紐站有標籤");
  console.log("這是嚴重的系統性問題\n");
}

console.log("診斷完成！");
console.log("請將上述資訊提供給開發者");
