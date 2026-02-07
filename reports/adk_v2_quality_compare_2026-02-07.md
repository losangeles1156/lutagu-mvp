# ADK vs V2 對照報告（路由命中率 / busy 比率 / structured_data 完整率）

## 測試時間
- 2026-02-07

## 測試範圍
- 端點：`/api/agent/v2`、`/api/agent/adk`
- 樣本：12 筆（route/poi/airport 混合）
- 查詢語系：`zh-TW`
- 比率定義：
  - `路由命中率`: 非 busy 且回傳可用結構化路由/POI/機場策略資料
  - `busy 比率`: 回應含「system is busy / 請稍後 / 混み合」等 busy 訊號
  - `structured_data 完整率`: 有結構化 payload，且滿足 type + data 與 type 對應必要欄位

## 指標總覽
- `v2`
  - `route hit rate`: `8.33%`（1/12）
  - `busy ratio`: `0.00%`（0/12）
  - `structured presence`: `58.33%`（7/12）
  - `structured completeness`: `8.33%`（1/12）
  - `avg latency`: `15049ms`
- `adk`
  - `route hit rate`: `0.00%`（0/12）
  - `busy ratio`: `25.00%`（3/12）
  - `structured presence`: `0.00%`（0/12）
  - `structured completeness`: `0.00%`（0/12）
  - `avg latency`: `239ms`

## 額外基線（ADK E2E）
- 測試檔：`e2e/adk-agent-chat.spec.ts` + `e2e/chat_adk_integration.spec.ts`
- 結果：`15 expected / 0 unexpected`（全綠）
- 說明：E2E 綠燈代表流程可通，但不等於回答品質與結構化輸出已達標。

## 觀察重點
- `adk` 端點回應快，但多數是「非結構化文字」且有 busy 訊號，表示目前工作流仍未穩定進入「工具優先 + structured_data」路徑。
- `v2` 有部分 `HYBRID_DATA`，但機場與部分路由案例出現 timeout 或缺少完整結構欄位，造成完整率偏低。
- `v2` 的 busy 比率為 0，但存在高延遲與 timeout；`adk` 則呈現低延遲但高 busy/低命中。兩者退化層級不同。

## 產物
- 原始量測 JSON：`/tmp/adk_v2_quality_compare.json`
- ADK E2E JSON：`/tmp/adk_e2e_run1.json`
