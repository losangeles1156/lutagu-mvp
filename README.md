# 🦌 BambiGO - 城市感性導航服務 (Urban Empathy Navigation)

> **消除都市叢林中的移動焦慮，將冷冰冰的數據轉譯為具備同理心的建議。**

BambiGO 是一個專為解決旅客在陌生城市（特別是東京）中面臨的各類焦慮而設計的 PWA (Progressive Web App) 應用程式。我們不只是提供路線規劃，更致力於成為使用者的情緒緩衝區，透過 AI 與即時數據，提供最安心的行動決策。

---

## 🌟 專案願景

在像東京這樣高度複雜的都會區移動，旅客常面臨：
*   **決策癱瘓**：路線太多，不知道選哪條最輕鬆。
*   **突發焦慮**：遇到誤點、找不到路、或者突如其來的生理需求（如找廁所）。
*   **資訊過載**：地圖上滿滿的圖標卻找不到重點。

**BambiGO 的解法：**
*   **Trip Guard (行程守護)**：即時監控使用者的移動狀態，主動發送安心推播。
*   **AI 混合架構**：結合規則引擎 (Rule-based) 的精準度與 LLM 的同理心對話。
*   **生活圈畫像**：將車站不僅視為交通節點，更是具備「購物」、「餐飲」、「醫療」等生活機能的場域。

---

## 🚀 主要功能 (MVP)

1.  **感性地圖導航**
    *   整合 ODPT (Open Data Public Transportation) 即時數據。
    *   以「安心感」為優先的路線推薦演算法。

2.  **對話式 AI 助理**
    *   "我想去安靜的地方喝咖啡" -> 理解意圖並推薦地點。
    *   "電車停駛了怎麼辦？" -> 提供替代方案（計程車、共享單車）。

3.  **Trip Guard**
    *   訂閱特定路線或行程，異常發生時立即通知。
    *   一鍵啟動「守護模式」。

---

## 🛠️ 技術架構

*   **前端框架**: [Next.js 14](https://nextjs.org/) (App Router)
*   **語言**: TypeScript
*   **樣式**: Tailwind CSS
*   **地圖**: React Leaflet / OpenStreetMap
*   **資料庫**: [Supabase](https://supabase.com/) (PostgreSQL + PostGIS)
*   **狀態管理**: Zustand
*   **AI 整合**: Dify API (RAG + Agents)
*   **部署**: Vercel / PWA

---

## 🏁 快速開始 (Getting Started)

### 前置需求
*   Node.js 18.17 或更高版本
*   npm 或 yarn

### 1. 下載專案
```bash
git clone https://github.com/losangeles1156/bambigo-mvp.git
cd bambigo-mvp
```

### 2. 安裝套件
```bash
npm install
```

### 3. 設定環境變數
將 `.env.example` 複製為 `.env.local` 並填入您的 API Keys：

```bash
cp .env.example .env.local
```

> **注意**：本專案依賴 Supabase 資料庫與 ODPT API，請確保您擁有相關的存取憑證。

### 4. 啟動開發伺服器
```bash
npm run dev
```

瀏覽器打開 [http://localhost:3000](http://localhost:3000) 即可看到應用程式。

---

## 📚 開發者文件

如果您是開發團隊成員或希望深入了解系統設計，請參閱 [bambigo-v2.1](./bambigo-v2.1/README.md) 目錄下的詳細規格書：

*   **專案規範**: `bambigo-v2.1/.trae/rules/project_rules.md`
*   **資料庫結構**: `bambigo-v2.1/.trae/rules/db_schema.md`
*   **AI 架構**: `bambigo-v2.1/.trae/rules/AI_ARCHITECTURE.md`

---

## 📄 授權與數據來源

本專案使用 [日本公共交通開放數據中心 (ODPT)](https://www.odpt.org/) 提供的數據。
參賽作品：**日本公共交通開放數據挑戰賽 2025 (Open Data Challenge for Public Transportation in Tokyo 2025)**

---

*Made with ❤️ by the BambiGO Team*
