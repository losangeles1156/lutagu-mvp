# LUTAGU Decision Manifest

## Core Principles
1. **Judgment Delegation**: We delegate decision-making, not just display information.
2. **Intent First**: Understand user intent before any retrieval.
3. **Context-Pruned RAG**: Node → Tags → Retrieval → Reasoning.
4. **Scenario-Driven Output**: Provide the next scenario preview, not a single-point answer.
5. **Tool-Verified Truth**: Real data must come from tools, not hallucination.

## Mandatory Decision Flow
1. Intent Understanding
2. Semantic Relay (zh → en → retrieve → zh)
3. Node & Tag Context
4. Tool Retrieval
5. Single Recommendation + Scenario Preview

## Forbidden
- Direct keyword/vector search without intent normalization
- Multiple-choice outputs for core guidance
- Responses without tool-backed data when tools are required

## Quality Metrics
- **Intent Coverage**: % of requests with explicit intent captured
- **Decision Adequacy**: % of replies aligned with intent + context tags
- **Scenario Completeness**: % of replies including preview + risk + next action
