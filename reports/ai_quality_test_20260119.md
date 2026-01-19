# LUTAGU AI 對話品質測試報告
**測試日期**: 2026-01-19  
**測試環境**: 本地開發環境 → Cloud Run  
**測試範圍**: 前端 Proxy → Cloud Run Chat API → HybridEngine

---

## 測試摘要

| 測試項目 | 狀態 | 說明 |
|---------|------|------|
| 基礎連線 | ✅ 通過 | API endpoints 正常回應 |
| 簡單問候 | ✅ 通過 | 模板回應正確 |
| 設施查詢 (寄物櫃) | ✅ 通過 | 提供具體資訊（東口已滿、南口5個可用） |
| 多語言支援 (英文) | ✅ 通過 | 英文查詢正常運作 |
| 路線規劃 | ⚠️ 部分 | 有回應但內容簡短 |
| 複雜查詢 (無障礙) | ❌ 失敗 | 回傳 fallback 錯誤訊息 |
| 即時狀態查詢 | ❌ 失敗 | 回傳 fallback 錯誤訊息 |

---

## 詳細測試結果

### ✅ 場景 1: 設施查詢 - 寄物櫃

**輸入**: "上野站有寄物櫃嗎？"  
**定位**: 上野站 (35.7138, 139.7773)  
**回應品質**: 優秀

```
有的，上野站有寄物櫃。

* **東口** 的大型寄物櫃目前**已滿**。
* **南口** 的中型寄物櫃還有 **5個** 可用。

如果您需要寄放較多物品，或者東口寄物櫃已滿，您可以考慮附近的
「Sagawa Hands-Free Center」，它位於南口2樓，營業時間為08:00至20:00，
費用為800日圓。
```

**評價**:
- ✅ 提供具體的可用數量
- ✅ 區分不同出口的狀態
- ✅ 提供替代方案 (Sagawa Center)
- ✅ 包含營業時間和價格資訊

---

### ✅ 場景 2: 多語言支援 - 英文查詢

**輸入**: "Are there coin lockers at Ueno Station?"  
**Locale**: en  
**回應品質**: 良好

```
Yes, there are coin lockers at Ueno Station.

Unfortunately, the large lockers at the East Exit are currently full. 
However, there are 5 medium-sized lockers available at the South Exit.

If you need an alternative, the Sagawa Hands-Free Center, located at 
the South Exit via the 2nd floor, is open from 08:00 to 20:00...
```

**評價**:
- ✅ 正確翻譯為英文
- ✅ 保留了所有關鍵資訊
- ✅ 語氣友善自然

---

### ⚠️ 場景 3: 路線規劃

**輸入**: "從上野到淺草最快的方式是什麼？"  
**回應品質**: 部分成功

```
為您找到從 上野 到 淺草最快的方式是什麼 的路線建議。
```

**問題**:
- ⚠️ 回應過於簡短，缺少具體路線資訊
- ⚠️ 未提供轉乘指引、時間估算或交通工具選擇
- ⚠️ 沒有展示 L4 Action Cards

**可能原因**:
- 路線規劃引擎可能未正確觸發
- ODPT API 資料可能未正確整合

---

### ❌ 場景 4: 無障礙查詢

**輸入**: "我推著嬰兒車要去上野動物園，請問搭到上野站要從哪個出口出來最方便？"  
**回應品質**: 失敗

```
系統暫時忙碌中，請稍後再試。
```

**問題**:
- ❌ 進入 HybridEngine 的最終 fallback
- ❌ 所有處理路徑都失敗（template, knowledge, poi, etc.）

**可能原因**:
1. AI 模型 API 配額耗盡或超時
2. Embedding 查詢失敗（knowledge base lookup）
3. 複雜查詢需要多個 AI 調用，其中某個環節失敗
4. 資料庫查詢超時

---

### ❌ 場景 5: 即時狀態查詢

**輸入**: "JR山手線現在有延誤嗎？"  
**回應品質**: 失敗

```
系統暫時忙碌中，請稍後再試。
```

**問題**: 同場景 4

---

## 根因分析

### 成功的查詢特徵
1. **簡單的關鍵字匹配** (寄物櫃 → locker facility)
2. **單一資料源** (L3 facility data)
3. **無需複雜推理**

### 失敗的查詢特徵
1. **需要多步推理** (無障礙路線 = 電梯位置 + 出口選擇 + 路線規劃)
2. **需要 AI 生成** (不是直接從資料庫讀取)
3. **依賴外部 API** (ODPT real-time data, AI model calls)

### 推測的技術問題
1. **AI API Rate Limiting**: MiniMax 或 Gemini API 可能達到限制
2. **Timeout Issues**: Cloud Run 內部請求超時 (預設 60秒)
3. **Knowledge Base 未就緒**: RAG embedding 查詢失敗
4. **Error Handling 過於保守**: 沒有輸出具體錯誤訊息

---

## 建議改進

### P0 - 緊急修復
1. **啟用詳細錯誤日誌**
   - 在 HybridEngine fallback 前記錄完整錯誤堆疊
   - 加入 Cloud Logging 整合

2. **檢查 AI API 配額**
   - 驗證 ZEABUR_API_KEY 是否有效
   - 確認 Gemini/MiniMax API 是否有流量限制

3. **測試 Knowledge Base**
   - 驗證 Supabase pgvector 查詢是否正常
   - 確認 embedding 資料是否已正確導入

### P1 - 功能增強
1. **Graceful Degradation**
   - 即使 AI 失敗，也應回傳基礎資訊
   - 例如："抱歉，無法提供詳細建議，但您可以查看上野站的電梯分佈圖..."

2. **路線規劃改進**
   - 整合 Google Maps / ODPT 路線 API
   - 提供備選方案（公車、計程車）

3. **快取機制**
   - 常見查詢（如"上野到淺草"）應使用快取
   - 減少 AI API 調用次數

### P2 - 體驗優化
1. **Loading State**
   - 前端顯示"正在規劃路線..."而非直接超時
   
2. **Fallback Content**
   - 提供靜態的常見問題解答 (FAQ)

---

## 測試環境配置

```bash
# 環境變數
CHAT_API_URL=https://chat-api-y6r3wpax5q-an.a.run.app

# Cloud Run 配置
CPU: 1 vCPU
Memory: 1Gi
Timeout: 60s
Concurrency: 80
Region: asia-northeast1
```

---

## 下一步行動

1. [ ] 查看 Cloud Run 日誌找出具體錯誤
2. [ ] 驗證 AI API keys 有效性
3. [ ] 測試 Knowledge Base 查詢
4. [ ] 增加錯誤日誌輸出
5. [ ] 實作 Graceful Degradation

**測試者**: Claude Code  
**測試工具**: curl, agent-browser, jq
