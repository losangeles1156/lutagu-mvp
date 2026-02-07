# ADK Bridge 修復與第二輪驗證（2026-02-07）

## 修復內容
- `services/adk-agent/pkg/openrouter/adk_bridge.go`
  - `clipContent` 上限調整：`system=6000`, `user=3000`, `tool=2000`, default `4000`。
  - 當 `stream=true` 且有 tools 時，強制切換為非 streaming，避免 tool calls 在 stream 模式被丟失。
  - 取消關鍵字型工具白名單過濾（改為全部工具可用）。
  - `DefaultModel` 改為 fallback 邏輯，不覆蓋有效 `req.Model`。
  - 模型 ID 正規化：`openrouter_bridge`/空值 -> default model；`deepseek-v3.2` -> `deepseek/deepseek-v3.2`。
  - 將 `fmt.Printf` debug 輸出改為 `slog`。

- `services/adk-agent/internal/agent/general.go`
  - 移除 `fmt.Printf` debug，改用 `slog.Debug`。
  - 錯誤回傳改為友善多語訊息，不再直接回傳原始錯誤。

- `services/adk-agent/internal/agent/route.go`
- `services/adk-agent/internal/agent/status.go`
- `services/adk-agent/internal/agent/root.go`
  - 錯誤回傳改為友善多語訊息；原始錯誤寫入 `slog.Error`。

- `services/adk-agent/internal/agent/errors.go`
  - 新增 `friendlyAgentError(locale)`。

- `services/adk-agent/cmd/server/main.go`
  - OpenRouter bridge 設定 `DefaultModel`。
  - GeneralAgent 先只保留 `functiontool` 版本的 `plan_route`，避免 legacy tool 介面不相容造成 runtime fail。
  - General reasoning provider 強制使用 OpenRouter bridge（先排除 Zeabur model-id 相容問題）。

## 驗證結果（12 case）
- 報告檔：`/tmp/adk_round2_final_after_model_normalize.json`
- 指標：
  - `routeHitRate`: `41.67%`（5/12）
  - `busyRatio`: `0.00%`（0/12）
  - `structuredPresenceRate`: `41.67%`（5/12）
  - `structuredCompletenessRate`: `41.67%`（5/12）
  - `avgLatencyMs`: `6716`

## 關鍵結論
- `busy` 主要來源已從「模型 ID 錯誤 / tool runtime error」清除（由高比例降至 0）。
- ADK `structured_data` 與 `route hit` 仍未達理想值，主因是 POI 類 query 仍有一部分未進入 L2 tool-first（落到 L5 或 skill fallback）。

## 尚待下一步
- 把 `GetCurrentTime/GetTrainStatus/GetTimetable/SearchRoute` 全面改為 `functiontool` 封裝，避免 legacy tool 的 runtime 介面風險。
- 對 POI query 增加 query rewriting + route coercion，將更多案例導入 L2 tool-first 以提升 `structuredCompletenessRate`。
