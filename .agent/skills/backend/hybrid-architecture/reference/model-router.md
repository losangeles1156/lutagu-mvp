# Model Router Strategy

本文件定義 LUTAGU 系統中不同 LLM 模型的角色分工與路由策略。
**核心原則：讓最聰明的腦做決策，讓最快的腦做分類。**

## 🧠 模型戰略地圖 (Model Strategy Map)

| Role | Model ID | Task Type | Usage |
| :--- | :--- | :--- | :--- |
| **Commander** | **MiniMax-M2.1** | `reasoning` | **系統指揮中樞**。負責複雜決策、邏輯推理、L4 建議生成、以及當其他規則失效時的最終裁決。 |
| **Synthesizer** | **Gemini 3 Flash Preview** | `synthesis` | **資訊整合者**。負責 RAG 知識合成、多語言長文本翻譯、L4 Context 處理。優勢在於長 Context Window。 |
| **Classifier** | **Gemini 2.5 Flash Lite** | `classification` | **快速分類器**。負責 Intent 分類 (Pre-Decision)、簡易標籤生成、高併發請求。優勢在於速度與成本。 |
| *Deprecated* | *Dify* | - | 🚫 **已廢棄**。僅作為早期開發的過渡工具，不應再新開 Dify 應用。 |

---

## 🛠️ Implementation Guide (llmClient.ts)

所有的 LLM 請求**必須**通過 `src/lib/ai/llmService.ts` 封裝，由 `llmClient.ts` 執行路由。

### 1. Reasoning Task (MiniMax-M2.1)
```typescript
generateLLMResponse({
  taskType: 'reasoning', // 👈 指定此參數以觸發 MiniMax
  systemPrompt: "...",
  userPrompt: "..."
});
```
*適用場景：L4 決策建議、複雜用戶意圖分析、穿搭建議推理。*

### 2. Synthesis Task (Gemini 3 Flash)
```typescript
generateLLMResponse({
  taskType: 'synthesis', // 👈 指定此參數以觸發 Gemini 3
  systemPrompt: "...",
  userPrompt: "..."
});
```
*適用場景：知識庫 RAG 合成、搜尋結果摘要、多筆資料彙整。*

### 3. Classification Task (Gemini 2.5 Flash Lite)
```typescript
generateLLMResponse({
  taskType: 'classification', // 👈 指定此參數以觸發 Gemini 2.5
  systemPrompt: "...",
  userPrompt: "..."
});
```
*適用場景：Pre-Decision Engine 意圖分類、簡單情感分析。*

---

## 🚫 Dify Deprecation Plan

Dify 曾作為 AI Agent 的原型架構，現已被 **Hybrid Engine + MiniMax** 取代。
- **現狀**：程式碼中若仍有 `DifyClient` 引用，應視為 Legacy Code。
- **行動**：新功能開發嚴禁調用 Dify API。
