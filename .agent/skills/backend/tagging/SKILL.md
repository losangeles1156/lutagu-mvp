---
name: backend-tagging
description: >
  LUTAGU L1 標籤系統與分類邏輯。
  當用戶詢問 "tagging"、"標籤"、"分類"、"3-5-8"、"位置基因"、
  "DNA" 或 "搜尋優化" 時觸發此 Skill。
tags: [backend, algorithm, tagging, search]
allowed-tools: [view_file, mcp_supabase-mcp-server_execute_sql]
---

# L1 Tagging Engine Guide

本 Skill 定義地點 (POI) 的分類與標籤生成邏輯。

## 🎯 核心原則 (Core Directives)

1.  **3-5-8 策略**:
    - 所有 AI 生成的 tag 必須嚴格區分為 `Core` (3-4字), `Intent` (5-8字), `Visual` (視覺描述)。
    - 禁止混用。

2.  **L1 vs L3**:
    - **L1** = 主業 (賣什麼)。例如：餐廳、旅館。
    - **L3** = 設施 (有什麼)。例如：WiFi、廁所。
    - 嚴禁將「有廁所」作為 L1 標籤。

3.  **單一真理**:
    - 類別 ID 必須符合 `reference/l1-taxonomy.md` 中的定義。
    - 禁止發明新的主類別 (如 `food` 應為 `dining`)。

## 🧬 資料結構 (Data Structure)

```typescript
// 節點標籤結構
interface NodeTags {
  l1_category: 'dining' | 'shopping' | ...;
  l1_subcategory: string; // e.g., 'ramen'
  
  // 3-5-8 Tags
  tags_core: string[];    // ['拉麵', '豚骨']
  tags_intent: string[];  // ['深夜拉麵推薦', '濃厚湯頭']
  tags_visual: string[];  // ['日式吧台', '紅色招牌']
}
```

## 🔗 詳細資源

- [3-5-8 策略與分類表](./reference/l1-taxonomy.md)
- [Tag Generator Logic (TBD)](./reference/tag-generator.md)
