// 貼到瀏覽器 Console 執行此腳本
// Debug: 為什麼樞紐站標籤不顯示？

console.log("=== LUTAGU Label Debug Tool ===");

// 1. 檢查地圖 Zoom 級別
const mapContainer = document.querySelector('.leaflet-container');
const map = mapContainer?._leafletMap;
if (map) {
  console.log("✓ Current Zoom Level:", map.getZoom());
} else {
  console.error("✗ Map not found!");
}

// 2. 檢查所有 marker
const markers = document.querySelectorAll('.custom-node-icon');
console.log(`✓ Total markers visible: ${markers.length}`);

// 3. 分析每個 marker 的標籤狀態
let stats = {
  withLabel: 0,
  withoutLabel: 0,
  labels: []
};

markers.forEach((marker, index) => {
  // 檢查是否有標籤 (absolute -bottom-12 class)
  const labelEl = marker.querySelector('.absolute.-bottom-12');

  // 檢查 marker 類型
  const hasM = marker.textContent.includes('M');
  const hasJ = marker.textContent.includes('J');
  const hasT = marker.textContent.includes('T');
  const hasCrown = marker.querySelector('svg') !== null;
  const hasBadge = marker.textContent.match(/\+\d+/);

  if (labelEl) {
    stats.withLabel++;
    const labelText = labelEl.textContent.trim();
    stats.labels.push({
      index,
      label: labelText,
      type: hasM ? 'Metro' : (hasJ ? 'JR' : (hasT ? 'Toei' : 'Other')),
      hasCrown,
      badge: hasBadge ? hasBadge[0] : null
    });

    // 特別標記有 Crown 或 Badge 的站（應該是 Hub）
    if (hasCrown || hasBadge) {
      console.log(`✓ Hub with label: "${labelText}" ${hasBadge || ''}`);
    }
  } else {
    stats.withoutLabel++;

    // 重點：找出沒有標籤的 Hub（有 Crown 或 Badge 但沒標籤）
    if (hasCrown || hasBadge) {
      console.warn(`✗ Hub WITHOUT label! Badge: ${hasBadge || 'none'}, Crown: ${hasCrown}`);

      // 輸出整個 marker 的 HTML 來除錯
      console.log("Marker HTML:", marker.innerHTML.substring(0, 200) + "...");
    }
  }
});

console.log("\n=== Summary ===");
console.log(`Markers with labels: ${stats.withLabel}`);
console.log(`Markers WITHOUT labels: ${stats.withoutLabel}`);
console.log(`Label ratio: ${(stats.withLabel / markers.length * 100).toFixed(1)}%`);

console.log("\n=== Labels Found ===");
stats.labels.forEach(l => {
  console.log(`- ${l.label} (${l.type}${l.badge ? ', ' + l.badge : ''}${l.hasCrown ? ', Crown' : ''})`);
});

console.log("\n=== Recommendations ===");
if (stats.withoutLabel > stats.withLabel) {
  console.warn("⚠️ Most markers don't have labels! Check showLabel condition.");
}
if (stats.labels.filter(l => l.badge || l.hasCrown).length === 0) {
  console.error("⚠️ No Hub stations have labels! This is the main issue.");
}

// 4. 檢查特定樞紐站（如果可以找到）
console.log("\n=== Checking Specific Hubs ===");
const expectedHubs = ['上野', '秋葉原', '東京', '新宿', '澀谷', 'Ueno', 'Akihabara', 'Tokyo', 'Shinjuku', 'Shibuya'];
expectedHubs.forEach(name => {
  const found = stats.labels.find(l => l.label.includes(name));
  if (found) {
    console.log(`✓ Found: ${name}`);
  } else {
    console.error(`✗ Missing: ${name}`);
  }
});

console.log("\n=== Debug Complete ===");
console.log("請複製這些訊息並提供給開發者");
