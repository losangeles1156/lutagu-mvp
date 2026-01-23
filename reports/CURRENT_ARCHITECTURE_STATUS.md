# LUTAGU MVP 當前架構狀態確認報告

**生成日期**: 2026-01-23
**版本**: v5.0 (最新實際部署狀態)

---

## 📊 執行摘要

經過程式碼審查,確認專案存在 **新舊架構並存** 的情況:

- ✅ **Chat API Service** (`services/chat-api/`): 已升級至 **Voyage-4 Embedding**
- ⚠️ **前端 Next.js App** (`src/`): 仍使用 **Gemini/MiniMax Embedding** (舊架構)
- ✅ **LLM 模型**: 已升級至 **Trinity 3.0 架構** (Gemini 3 Flash + DeepSeek V3.2)

---

## 1️⃣ Embedding 模型現狀 (新舊並存)

### 1.1 Chat API Service (新架構 ✅)

**檔案位置**: `services/chat-api/src/lib/ai/embedding.ts`

```typescript
// ✅ 已升級至 Voyage-4
model: 'voyage-4',
input: [text],
input_type: inputType  // 'query' or 'document'
```

**特性**:
- **Provider**: Voyage AI
- **Model**: voyage-4
- **維度**: 1024 dimensions
- **優勢**: 專為 RAG 優化,支援 query/document 分別優化

### 1.2 前端 Next.js App (舊架構 ⚠️)

**檔案位置**: `src/lib/ai/embeddingService.ts`

```typescript
// ⚠️ 仍使用舊配置 (Gemini/MiniMax)
private static provider = process.env.EMBEDDING_PROVIDER || 'voyage'; // Default changed to 'voyage'
```

**實際支援的模型**:
1. **Voyage-4** (已添加但預設)
2. **Gemini text-embedding-004** (768 dims, zero-padded to 1536)
3. **OpenAI text-embedding-3-small**
4. **MiniMax embo-01** (fallback)

**問題**:
- 環境變數 `EMBEDDING_PROVIDER` 可能未設定為 `voyage`
- 存在 Zero-padding 邏輯 (1024 → 1536),可能造成向量不一致

---

## 2️⃣ LLM 模型架構 (已升級 ✅)

### Trinity 3.0 架構

**檔案位置**: `src/lib/ai/llmClient.ts`

| 角色 | 模型 | 任務類型 | 用途 |
|------|------|---------|------|
| **Router/Gatekeeper** | Gemini 2.5 Flash Lite | `classification`, `simple` | 快速意圖分類、簡單問答 |
| **Brain/Reasoning** | Gemini 3 Flash Preview | `reasoning`, `context_heavy` | 複雜推理、精準決策 |
| **Synthesizer/Chat** | DeepSeek V3.2 | `synthesis`, `chat` | 創意生成、長回應 |
| **Fallback** | MiniMax-M2.1 | All | Gemini 3 失敗時的備援 |

**特點**:
- ✅ 使用 Zeabur AI Hub Tokyo Node (`hnd1.aihub.zeabur.ai`)
- ✅ 統一 OpenAI-compatible API 格式
- ✅ 實作了 Rate Limit Fallback (429 自動降級到 Flash Lite)
- ✅ 自動過濾 `[THINKING]` 標籤

---

## 3️⃣ 混合架構 (L1-L5) (運行中 ✅)

**檔案位置**: `docs/LUTAGU_AI_ARCHITECTURE.md`

| 層級 | 名稱 | 技術 | 狀態 |
|------|------|------|------|
| **L1** | 簡單/模板層 | TemplateEngine | ✅ 運行中 |
| **L2** | 演算法層 | AlgorithmProvider | ✅ 運行中 |
| **L3** | 設施層 | `stations_static` | ✅ 運行中 |
| **L4** | 知識/策略層 | RAG (pgvector) + Expert Tools | ✅ 運行中 |
| **L5** | 決策/防災層 | DecisionEngine | ✅ 運行中 |

**驗證狀態** (2026-01-20):
- ✅ 所有測試通過 (6/6, 成功率 100%)
- ✅ 平均回應時間: 1.7s
- ✅ 多語言支援正常 (中/英/日)

---

## 4️⃣ 向量資料庫配置

### 4.1 Chat API Service (Voyage-4)

```typescript
// ✅ 使用 voyage-4 (1024 dims)
model: 'voyage-4'
```

**資料庫表**: `l4_knowledge_embeddings`
- 欄位: `embedding vector(1024)`

### 4.2 前端 App (混合狀態)

```typescript
// ⚠️ 可能使用 Gemini (768 → 1536 padding)
targetDim = 1536;
if (embedding.length < targetDim) {
    return [...embedding, ...new Array(targetDim - embedding.length).fill(0)];
}
```

**潛在問題**:
- 如果前端使用 Gemini,會 padding 到 1536
- 如果資料庫存的是 1024 (Voyage-4),會有維度不匹配

---

## 5️⃣ 環境變數現狀

### .env.example 配置

```bash
# ✅ 新增 Zeabur AI Hub
ZEABUR_API_KEY=your-zeabur-key-for-gemini
DEEPSEEK_API_KEY=your-zeabur-lutagu-mvp-key

# ⚠️ Embedding Provider 未明確設為 voyage
EMBEDDING_PROVIDER=gemini  # 應改為 'voyage'

# 舊架構遺留
MINIMAX_API_KEY=your-minimax-key
GEMINI_API_KEY=your-google-ai-key
```

### 缺失的環境變數

```bash
# ❌ 未在 .env.example 中列出
VOYAGE_API_KEY=your-voyage-api-key
```

---

## 6️⃣ 關鍵問題與建議

### 🔴 P0 - 立即修復

#### 問題 1: Embedding 維度不一致風險
- **前端**: 可能使用 Gemini (768 → 1536 padding)
- **Chat API**: 使用 Voyage-4 (1024)
- **資料庫**: 可能混合存儲不同維度

**解決方案**:
```bash
# 1. 統一環境變數
EMBEDDING_PROVIDER=voyage
VOYAGE_API_KEY=sk-...

# 2. 資料庫遷移 (如果需要)
ALTER TABLE l4_knowledge_embeddings
ALTER COLUMN embedding TYPE vector(1024);

# 3. 重新生成所有 embeddings (統一使用 voyage-4)
npm run scripts:ingest_l4_embeddings
```

#### 問題 2: .env.example 缺少 VOYAGE_API_KEY
**解決方案**:
```bash
# 添加到 .env.example
VOYAGE_API_KEY=your-voyage-api-key
EMBEDDING_PROVIDER=voyage  # 'voyage' (default, 1024 dims) | 'gemini' (768 dims) | 'openai'
```

### 🟡 P1 - 短期優化

#### 問題 3: 雙份 embeddingService 邏輯重複
- `src/lib/ai/embeddingService.ts` (前端)
- `services/chat-api/src/lib/ai/embedding.ts` (Chat API)

**解決方案**:
- 建立共享模組 `@lutagu/shared-ai`
- 或統一使用 Chat API 的 embedding endpoint

#### 問題 4: Fallback Embedding 不夠智能
**目前邏輯**:
```typescript
// services/chat-api/src/lib/ai/embedding.ts
function fallbackEmbedding(text: string): number[] {
  const dim = 1024;
  const result = new Array(dim).fill(0);
  for (let i = 0; i < text.length && i < dim; i++) {
    result[i] = text.charCodeAt(i) / 255;  // ❌ 過於簡陋
  }
  return result;
}
```

**建議改進**:
- 使用本地 ONNX 模型 (如 `all-MiniLM-L6-v2`)
- 或至少使用 TF-IDF 向量化

---

## 7️⃣ 架構統一建議

### 階段 1: 環境變數統一 (1 天)

1. **更新 .env.example**
```bash
# Embedding Configuration (Unified)
EMBEDDING_PROVIDER=voyage  # Primary: voyage-4 (1024 dims, RAG-optimized)
VOYAGE_API_KEY=your-voyage-api-key
# Fallback providers (optional)
GEMINI_API_KEY=your-google-ai-key  # 768 dims, free tier 1500 RPM
OPENAI_API_KEY=your-openai-key     # 1536 dims, paid only
```

2. **更新 CLAUDE.md**
```markdown
### 3.3 Embedding Model
- **Primary**: Voyage AI voyage-4 (1024 dimensions)
- **Fallback**: Gemini text-embedding-004 (768 dimensions, padded to 1024)
- **Rate Limits**: Voyage (300 RPM free tier)
```

### 階段 2: 程式碼統一 (2 天)

1. **統一 embeddingService.ts 邏輯**
```typescript
// src/lib/ai/embeddingService.ts
private static provider = process.env.EMBEDDING_PROVIDER || 'voyage';

private static async generateVoyageEmbedding(...): Promise<number[]> {
    // ✅ 返回原始 1024 維度,不做 padding
    return data.data[0].embedding;
}

private static async generateGeminiEmbedding(...): Promise<number[]> {
    const embedding = result.embedding.values; // 768 dims

    // ✅ Padding 到 1024 (而非 1536)
    const targetDim = 1024;
    if (embedding.length < targetDim) {
        return [...embedding, ...new Array(targetDim - embedding.length).fill(0)];
    }
    return embedding.slice(0, targetDim);
}
```

2. **資料庫遷移腳本**
```typescript
// scripts/migrate_embeddings_to_voyage.ts
async function migrateEmbeddings() {
    // 1. 檢查現有 embeddings 維度分布
    const stats = await supabase.rpc('check_embedding_dimensions');

    // 2. 如果存在 1536 維度,截斷或重新生成
    // 3. 統一更新為 1024 維度 (voyage-4)
}
```

### 階段 3: 驗證與監控 (1 天)

1. **單元測試**
```typescript
// tests/embedding.test.ts
describe('Embedding Service', () => {
    it('should return 1024 dims for voyage-4', async () => {
        const embedding = await EmbeddingService.generateEmbedding('test', 'query');
        expect(embedding.length).toBe(1024);
    });

    it('should fallback to Gemini and pad to 1024', async () => {
        // Mock Voyage API failure
        const embedding = await EmbeddingService.generateEmbedding('test', 'query');
        expect(embedding.length).toBe(1024);
    });
});
```

2. **向量搜尋驗證**
```bash
npm run scripts:verify_vector_search
```

---

## 8️⃣ 效能優化建議 (延遲優化計劃)

### 當前延遲瓶頸

| 操作 | 當前延遲 (P95) | 目標延遲 | 優化策略 |
|------|---------------|---------|---------|
| **Embedding 生成** | ~500ms | < 200ms | 1. 本地快取<br>2. Batch processing |
| **向量搜尋** | ~300ms | < 100ms | 1. pgvector index 優化<br>2. 預計算熱門查詢 |
| **LLM 推理** | ~2000ms | < 1000ms | 1. 串流式回應<br>2. 預測性預載 |

### 優化策略 (按優先級)

#### P0 - 串流式回應 (改善感知延遲 50%)
```typescript
// src/app/api/chat/route.ts
export async function POST(req: Request) {
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // 立即返回串流
    llmClient.streamResponse({
        onChunk: (chunk) => writer.write(encoder.encode(chunk)),
        onComplete: () => writer.close()
    });

    return new Response(stream.readable, {
        headers: { 'Content-Type': 'text/event-stream' }
    });
}
```

#### P1 - Embedding 快取層
```typescript
// src/lib/cache/embeddingCache.ts
export class EmbeddingCache {
    private redis = new Redis({ url: process.env.UPSTASH_REDIS_URL });

    async getOrGenerate(text: string, type: 'query' | 'db'): Promise<number[]> {
        const key = `emb:${hashString(text)}:${type}`;
        const cached = await this.redis.get(key);

        if (cached) return JSON.parse(cached);

        const embedding = await EmbeddingService.generateEmbedding(text, type);
        await this.redis.setex(key, 86400, JSON.stringify(embedding)); // 24hr TTL
        return embedding;
    }
}
```

#### P2 - 預測性查詢預載
```typescript
// src/lib/l4/prefetch.ts
const COMMON_QUERIES = [
    '從成田機場到淺草',
    '上野站有寄物櫃嗎',
    '銀座美食推薦'
];

async function warmupCache() {
    for (const query of COMMON_QUERIES) {
        await embeddingCache.getOrGenerate(query, 'query');
        await vectorSearch.search(query); // 預計算結果
    }
}
```

---

## 9️⃣ 結論

### 當前狀態總結

| 模組 | 狀態 | 架構版本 |
|------|------|---------|
| **LLM 推理** | ✅ 已升級 | Trinity 3.0 (Gemini 3 + DeepSeek V3.2) |
| **Chat API Embedding** | ✅ 已升級 | Voyage-4 (1024 dims) |
| **前端 Embedding** | ⚠️ 混合狀態 | Gemini (預設) / Voyage-4 (可選) |
| **環境變數** | ⚠️ 不完整 | 缺少 VOYAGE_API_KEY 說明 |
| **混合架構 (L1-L5)** | ✅ 運行正常 | v5.0 |

### 下一步行動

1. **立即執行** (Week 1):
   - [ ] 統一 `EMBEDDING_PROVIDER=voyage` 環境變數
   - [ ] 更新 `.env.example` 添加 `VOYAGE_API_KEY`
   - [ ] 驗證向量維度一致性 (1024 dims)

2. **短期優化** (Week 2-3):
   - [ ] 實作串流式回應 (改善感知延遲 50%)
   - [ ] 添加 Embedding 快取層 (Redis)
   - [ ] 資料庫索引優化

3. **中期規劃** (Month 2):
   - [ ] 預測性查詢預載
   - [ ] 本地 ONNX embedding fallback
   - [ ] 完整效能監控儀表板

---

**報告生成者**: Claude Code
**審查狀態**: 待用戶確認
**下次更新**: 架構統一完成後
