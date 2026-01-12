---
name: hybrid-architecture
description: >
  LUTAGU AI 混合架構與模型路由策略。
  當用戶詢問 "Hybrid Engine"、"AI 架構"、"模型選擇"、
  "MiniMax"、"Gemini"、"Dify" 或 "決策邏輯" 時觸發此 Skill。
tags: [backend, ai, architecture, minimax, gemini]
allowed-tools: [view_file, search_web]
---

# Hybrid Architecture Guide

本 Skill 定義 AI 混合決策引擎的架構與模型路由規則。

## 🎯 核心原則 (Core Directives)

1.  **AI-First but Optimized**:
    - 嚴格遵守 **5層決策漏斗** (Template -> Algo -> Knowledge -> Fallback)。
    - 禁止所有查詢直接通往 LLM，必須先經過 L1/L2 過濾。

2.  **MiniMax as Commander**:
    - **複雜決策與推理 (Reasoning)** 必須使用 **MiniMax-M2.1**。
    - 它是系統的大腦，負責解決演算法無法處理的模糊問題。

3.  **No Dify**:
    - Dify 是已廢棄的過渡方案。
    - 所有新的 AI 功能必須直接調用 `llmService`。

## 🤖 模型路由 (Router)

請參考 `reference/model-router.md` 獲取完整設定：

| Task Type | Model | 用途 |
| :--- | :--- | :--- |
| `reasoning` | **MiniMax-M2.1** | 指揮中樞、L4 建議、邏輯推理 |
| `synthesis` | **Gemini 3 Flash** | 長文本 RAG、資訊合成 |
| `classification` | **Gemini 2.5 Flash Lite** | 快速分類、意圖判斷 |

## 🔗 詳細資源

- [決策漏斗圖解 (Decision Flow)](./reference/decision-flow.md)
- [模型路由表 (Model Router)](./reference/model-router.md)
