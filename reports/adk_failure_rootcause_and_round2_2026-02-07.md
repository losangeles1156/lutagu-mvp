# ADK 異常根因徹查與第二輪驗證（2026-02-07）

## 根因結論
1. ADK Proxy 請求格式不兼容
- 現象：部分測試/客戶端送 `{text, locale}`，`/api/agent/adk` 未轉為 `messages`，上游拿到空對話，回覆退化。
- 影響：正常對話與路由流程無法啟動，structured_data 缺失。

2. 路由意圖辨識覆蓋不足
- 現象：`NodeResolver` 對中文語句（例如「怎麼走」、「從 X 出發」）命中率不足，`IsRouteQuery=false`。
- 影響：不進入 L2 tool-first，無法輸出路由 structured JSON。

3. L1 模板過早攔截
- 現象：即使是路由題，也可能先被 L1 template 回答。
- 影響：回覆雖然有文字，但無工具路由結果與 structured_data。

4. `pathfinder` 可用性判斷位置錯誤
- 現象：`runRouteToolFirst` 一開始就檢查 `pathfinder`，導致機場策略（本可不依賴 graph）被直接阻斷。
- 影響：機場題常退化到一般文字回答或 busy 模板。

## 已修復項目
- `src/app/api/agent/adk/route.ts`
  - 支援 `{text, locale}` 自動轉 `messages`。
- `services/adk-agent/internal/layer/node_resolver.go`
  - 新增站點別名（`都庁前`、`西新宿`）。
  - 擴充 route regex（含「怎麼走」「從 X 出發」）。
  - 當檢出 >=2 個站且有路由語意時，自動視為 route query。
- `services/adk-agent/internal/orchestrator/layered_engine.go`
  - 路由題跳過 L1，優先進 L2 tool-first。
  - `runRouteToolFirst` 改為先做機場策略，再檢查 `pathfinder`。
  - 加入 endpoint 清洗，避免「東京站怎麼去」污染站名解析。
  - ADK structured JSON 對齊 `type + data`（並保留扁平欄位相容）。

## 第二輪測試（修復後）
- 測試環境：本地 ADK（`8092`）+ Next（`3011`）+ 12 組 route/poi/airport case
- 輸出檔：`/tmp/adk_round2_after_fix.json`

### ADK 指標（修復後）
- `route 命中率`: `41.67%`（5/12）
- `busy 比率`: `0.00%`（0/12）
- `structured_data 出現率`: `41.67%`（5/12）
- `structured_data 完整率`: `41.67%`（5/12）
- `平均延遲`: `736ms`

### 與修復前對照（同口徑 ADK）
- 修復前（本地 round2 前）：`routeHit 16.67%` / `busy 0%` / `structured完整 16.67%`
- 修復後：`routeHit 41.67%` / `busy 0%` / `structured完整 41.67%`

## 尚未完全解決
1. POI 題仍有顯著比例未輸出 structured_data
- 目前主要發生在未被判定為 route query、或由 L3/L5 回答的案例。

2. v2 端點延遲/timeout 高
- 非本次 ADK 修復範圍，但會影響整體 A/B 對照。

## 下一步建議
1. 在 ADK 加入 query rewriting（POI -> 候選站展開）前置層，未命中 route regex 也可進 L2。
2. 對所有 POI 題強制嘗試 `runRouteToolFirst`（若含「去/到/路線」語義）。
3. 增加 ADK 回歸測試：至少 20 筆固定 route/poi/airport，門檻 `structured完整率 >= 70%`。
