# L1 Tagging Taxonomy & 3-5-8 Strategy

本文件定義 LUTAGU 系統用於地點分類與檢索的核心標籤邏輯。

## 1. 「3-5-8」標籤組合策略

針對 Que2Search 論文與 GEM 多模態對齊邏輯，L1 標籤系統採用以下結構化設計以優化檢索：

### 1.1 關鍵字層 (tags_core, 3-4字)
*   **目的**: 毫秒級核心檢索 (Tri-gram Sweet Spot)
*   **規則**: 僅名詞大類，無贅字。
*   **範例**: `#拉麵`, `#露營`, `#跑鞋`

### 1.2 意圖層 (tags_intent, 5-8字)
*   **目的**: 情境對齊 (XLM-R 深度語義)
*   **規則**: [動作/形容詞] + [核心名詞]
*   **範例**: `#深夜拉麵推薦`, `#新手露營裝備`

### 1.3 視覺層 (tags_visual)
*   **目的**: 多模態視覺校準 (GrokNet)
*   **規則**: 描述肉眼可見的風格、色調、材質
*   **範例**: `#極簡風`, `#清水模建築`, `#紅色鳥居`

---

## 2. 十大主類別 (Main Categories)

| ID | 名稱 | 圖示 | 說明 |
|----|------|------|------|
| `dining` | 餐飲 | 🍽️ | 餐廳、咖啡廳、速食 |
| `shopping` | 購物 | 🛒 | 商店、百貨、超市、藥妝 |
| `business` | 商務 | 🏢 | 辦公大樓、會議中心 |
| `medical` | 醫療 | 🏥 | 醫院、診所、藥局 |
| `leisure` | 休閒 | 🎭 | 景點、娛樂、公園 |
| `finance` | 金融 | 🏦 | 銀行（ATM 屬 L3）|
| `accommodation` | 住宿 | 🏨 | 飯店、旅館 |
| `culture` | 文化 | ⛩️ | 神社、寺廟、博物館 |
| `service` | 公共服務 | 🏛️ | 市政、郵局、警察局 |
| `nature` | 自然 | 🌳 | 公園、綠地、自然景觀 |

---

## 3. 次類別細分 (Subcategories)

### 3.1 住宿 (accommodation)
*   `business_hotel`: 平價商務 (上野、新橋)
*   `luxury_hotel`: 星級飯店 (銀座、六本木)
*   `hostel`: 青年旅館 (淺草、蔵前)
*   `capsule_hotel`: 膠囊旅館 (新宿、池袋)
*   `onsen_ryokan`: 溫泉旅館 (箱根、熱海)

### 3.2 餐飲 (dining)
*   `ramen`: 拉麵店
*   `sushi`: 壽司店
*   `cafe`: 咖啡廳
*   `izakaya`: 居酒屋

---

## 4. 區域性格向量 (Zone Persona)

每個節點 (Node) 透過類別密度生成性格向量：

```typescript
interface LocationDNA {
  category_vector: {
    dining: number;       // e.g. 0.8 (新宿)
    nature: number;       // e.g. 0.1
    // ...
  };
  vibe_tags: string[];    // e.g. ['ramen_battleground', 'nightlife_hub']
}
```
