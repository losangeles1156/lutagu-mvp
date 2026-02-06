# AB Token Acceptance Report - 2026-02-06T10:42:35.050Z

- Chat URL: `http://localhost:8080/agent/chat`
- Metrics URL: `http://localhost:8080/metrics`
- Locale: `zh-TW`
- Questions: 2

## Result

- Target reduction: **35% ~ 55%**
- Actual total reduction: **0.00%**
- Verdict: **FAIL**

## A/B Summary (Estimated Tokens)

| Profile | Prompt Tokens | Completion Tokens | Total Tokens | LLM Invocations | Tool-only Resolutions |
|---|---:|---:|---:|---:|---:|
| Baseline (quality+detailed) | 525 | 77 | 602 | 2 | 0 |
| Optimized (balanced+concise) | 525 | 77 | 602 | 2 | 0 |

## Reduction Breakdown

- Prompt reduction: **0.00%**
- Completion reduction: **0.00%**
- Total reduction: **0.00%**

## Per-question Response Snapshot

- [A] Q: 我現在想從上野搭車到銀座，需要多久？為什麼不推薦銀座線直達？
  - response_chars: 255
  - preview: 正在為您探索附近的在地景點與隱藏美食... 我會以此站的「氣氛」為核心，為您推薦 3 個值得造訪的地方。如果您有特定的需求（例如：想要安靜的咖啡廳、道地的居酒屋），請告訴我！Error: agent run error: error, status code: 400, sta
- [A] Q: 我現在要搭幾點的車才來得及17:00的航班？請直接給可執行建議。
  - response_chars: 141
  - preview: Error: agent run error: error, status code: 400, status: 400 Bad Request, message: openrouter_bridge is not a valid model ID 最終結論：以上為目前最佳建議

- [B] Q: 我現在想從上野搭車到銀座，需要多久？為什麼不推薦銀座線直達？
  - response_chars: 255
  - preview: 正在為您探索附近的在地景點與隱藏美食... 我會以此站的「氣氛」為核心，為您推薦 3 個值得造訪的地方。如果您有特定的需求（例如：想要安靜的咖啡廳、道地的居酒屋），請告訴我！Error: agent run error: error, status code: 400, sta
- [B] Q: 我現在要搭幾點的車才來得及17:00的航班？請直接給可執行建議。
  - response_chars: 141
  - preview: Error: agent run error: error, status code: 400, status: 400 Bad Request, message: openrouter_bridge is not a valid model ID 最終結論：以上為目前最佳建議