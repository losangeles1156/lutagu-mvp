# PLAN: LUTAGU AI Agent 2.0 Architecture

> **Version**: 2.0 | **Date**: 2026-01-28
> **Trigger**: Persistent instability in `HybridEngine` + need for Deep Research capability
> **Reference**: [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code)

---

## Executive Summary

LUTAGU 目前使用 **同步單次 (Synchronous Single-Pass)** 架構，無法支援 Deep Research、長時間推理、或複雜多步驟任務。本計畫將 LUTAGU 轉型為符合現代 AI Agent 設計原則的 **異步循環 (Async Loop)** 架構。

### 核心改變
| Before (v1) | After (v2) |
|-------------|------------|
| `HybridEngine.processRequest()` 一次性決定 | Agent Loop 迭代思考直到完成 |
| 計畫只在 LLM 腦中 (不可見) | `TodoWrite` 工具外顯計畫 |
| 單一 Context 污染 | Subagent 隔離探索任務 |
| 靜態知識 (System Prompt) | Skills 按需注入 |

---

## Phase 0: 環境穩定化 (Prerequisite)

> 修復當前阻塞問題，才能進行重構。

- [ ] 解決 `Cannot find module '@opentelemetry.js'` 錯誤
- [ ] 清理 `.next` + `node_modules` 並重裝
- [ ] 確保 `npm run dev` 正常啟動

---

## Phase 1: 引入 Agent Loop

### Goal
從「單次調用」轉為「迭代循環」。

### Technical Changes

#### 1.1 使用 `maxSteps` 啟用多輪思考

```typescript
// app/api/agent/chat/route.ts (概念)
const result = await streamText({
  model: google('gemini-2.5-flash-preview-05-20'),
  messages,
  tools: {
    findRoute: { ... },
    getWeather: { ... },
    searchPOI: { ... },
  },
  maxSteps: 5, // ← 允許最多 5 輪 Tool Call
});
```

#### 1.2 重構 `HybridEngine` 為 Tool Provider

| Before | After |
|--------|-------|
| `HybridEngine` 是主控器 | `HybridEngine` 提供 Tools |
| LLM 呼叫一次，Engine 決定 | LLM 呼叫多次，每次 Engine 處理一個 Tool |

**新架構：**
```
User Message
    ↓
[Gemini/Claude LLM] ← System Prompt
    ↓ (Tool Calls)
[Tool #1: findRoute] → Result → LLM
    ↓ (Continue or Stop?)
[Tool #2: getWeather] → Result → LLM
    ↓
[Final Response]
```

#### Files to Modify

| File | Change |
|------|--------|
| `route.ts` | Add `maxSteps`, define tools |
| `HybridEngine.ts` | Refactor as `tools` object |
| `PreDecisionEngine.ts` | Deprecate or integrate |

---

## Phase 2: 外顯計畫 (TodoWrite)

### Goal
讓 Agent 的計畫對用戶可見，並增加約束防止模型迷路。

### Technical Changes

#### 2.1 TodoManager Class

```typescript
// lib/agent/TodoManager.ts
class TodoManager {
  items: TodoItem[] = []; // Max 20
  
  update(items: TodoItem[]) {
    // Validate: one in_progress, no duplicates
  }
}
```

#### 2.2 TodoWrite Tool

```typescript
const todoWriteTool = tool({
  description: 'Update your task list. Use for multi-step work.',
  parameters: z.object({
    items: z.array(z.object({
      content: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed']),
      activeForm: z.string(), // "Reading files..."
    })).max(20),
  }),
  execute: async ({ items }) => {
    todoManager.update(items);
    return todoManager.format(); // Human-readable
  },
});
```

---

## Phase 3: Subagent 隔離

### Goal
防止 Context 污染。讓探索性任務在隔離環境執行。

### Agent Type Registry

```typescript
const AGENT_TYPES = {
  explore: {
    description: 'Read-only. Search and analyze.',
    tools: ['getStationInfo', 'getWeather'],
    systemPrompt: 'Explore and return concise summary.',
  },
  routePlanner: {
    description: 'Calculate routes and fares.',
    tools: ['findRoute', 'estimateFare'],
    systemPrompt: 'Plan optimal route.',
  },
  localExpert: {
    description: 'Tokyo travel expert.',
    tools: ['loadSkill', 'searchPOI'],
    systemPrompt: 'Provide local insights.',
  },
};
```

### Task Tool

```typescript
const taskTool = tool({
  description: 'Spawn a focused subagent.',
  parameters: z.object({
    description: z.string().max(50),
    prompt: z.string(),
    agentType: z.enum(['explore', 'routePlanner', 'localExpert']),
  }),
  execute: async (params) => {
    const result = await runSubagent(params);
    return result.summary; // Subagent context is discarded
  },
});
```

---

## Phase 4: Skills 按需注入

### Goal
動態載入專業知識，無需重訓練模型。

### Adapt Existing Skills

我們已有 `.agent/skills/` 資料夾：
- `tokyo-expert-knowledge`
- `map-display-rules`
- `performance-profiling`

需要為後端創建 `SkillLoader` 來讀取 `SKILL.md`。

### LoadSkill Tool

```typescript
const loadSkillTool = tool({
  description: 'Load specialized knowledge on-demand.',
  parameters: z.object({
    skillName: z.string(),
  }),
  execute: async ({ skillName }) => {
    const content = await skillLoader.getContent(skillName);
    return `<skill-loaded name="${skillName}">${content}</skill-loaded>`;
  },
});
```

---

## Verification Checklist

| Phase | Verification |
|-------|--------------|
| Phase 0 | `npm run dev` 啟動成功，無錯誤 |
| Phase 1 | 發送 "從東京到成田"，Console 顯示多個 Tool Calls |
| Phase 2 | 發送 "規劃三天行程"，UI 顯示 TodoList |
| Phase 3 | 發送 "探索上野周邊"，Console 顯示 Subagent 啟動 |
| Phase 4 | Agent 主動呼叫 `loadSkill("tokyo-expert-knowledge")` |

---

## Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| Token 消耗增加 (多輪) | 設定 `maxSteps` 上限 5-10 |
| Subagent 無限遞迴 | Subagent 不提供 `Task` tool |
| 遷移破壞現有功能 | Feature Flag 逐步啟用 |

---

## Timeline Estimate

| Phase | Effort | Notes |
|-------|--------|-------|
| Phase 0 | 1 小時 | 環境修復 |
| Phase 1 | 1-2 天 | 核心重構 |
| Phase 2 | 0.5 天 | 新增 TodoManager |
| Phase 3 | 1 天 | Subagent 系統 |
| Phase 4 | 0.5-1 天 | Skills 整合 |

**Total**: 4-5 工作天

---

## References

- [learn-claude-code v0-v4](https://github.com/shareAI-lab/learn-claude-code)
- [Vercel AI SDK: Multi-Step Calls](https://ai.new/docs/multi-step-calls)
- [Agent Skills Spec](https://github.com/anthropics/agent-skills)
