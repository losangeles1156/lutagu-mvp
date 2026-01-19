# L1 POI Tagging System - Phase 2 & 3 設計文件

## Phase 2: Atmosphere 標籤（批次 LLM 分類）

### 2.1 Atmosphere 分類體系

```typescript
interface AtmosphereTags {
    // 核心氣氛標籤
    core: {
        energy: 'lively' | 'calm' | 'bustling' | 'quiet' | 'cozy';
        style: 'modern' | 'traditional' | 'casual' | 'formal' | 'unique';
        crowd_level: 'empty' | 'sparse' | 'moderate' | 'crowded' | 'packed';
    };

    // 適合場景
    scenes: {
        business: boolean;      // 商務洽談
        dating: boolean;        // 約會
        family: boolean;        // 家庭聚餐
        solo: boolean;          // 單獨前往
        friends: boolean;       // 朋友聚會
        tourist: boolean;       // 觀光客友善
    };

    // 環境特徵
    environment: {
        indoor: boolean;        // 室內
        outdoor: boolean;       // 室外
        rooftop: boolean;       // 頂樓
        view: boolean;          // 有景觀
        pet_friendly: boolean;  // 寵物友善
        smoking: 'allowed' | 'prohibited' | 'partial';
        noise_level: 1 | 2 | 3 | 4 | 5;  // 1=安靜, 5=吵雜
    };

    // 時段特性
    time特性: {
        breakfast: boolean;     // 早餐
        lunch: boolean;         // 午餐
        dinner: boolean;        // 晚餐
        late_night: boolean;    // 深夜
        all_day: boolean;       // 全天候
    };

    // 特殊體驗
    special: {
        reservation: boolean;   // 需預約
        takeout: boolean;       // 外帶
        delivery: boolean;      // 外送
        online_order: boolean;  // 線上點餐
        buffett: boolean;       // 吃到飽
        private_room: boolean;  // 包廂
    };

    // LLM 置信度
    confidence: number;         // 0.0 - 1.0
    model_used: string;         // 模型名稱
    classified_at: string;      // ISO timestamp
}
```

### 2.2 LLM 分類 Prompt 設計

```markdown
## POI 氣氛分類 Prompt

### 任務描述
你是一個專業的日本景點與餐廳氣氛分析師。請根據提供的 POI 資訊，分析並分類其氣氛特徵。

### 輸入格式
```json
{
  "name": "店家名稱",
  "category": "類別",
  "tags": "標籤",
  "description": "描述文字"
}
```

### 輸出格式
請以 JSON 格式輸出：
```json
{
  "energy": "lively/calm/bustling/quiet/cozy",
  "style": "modern/traditional/casual/formal/unique",
  "crowd_level": "empty/sparse/moderate/crowded/packed",
  "scenes": {
    "business": true/false,
    "dating": true/false,
    "family": true/false,
    "solo": true/false,
    "friends": true/false,
    "tourist": true/false
  },
  "environment": {
    "indoor": true/false,
    "outdoor": true/false,
    "rooftop": true/false,
    "view": true/false,
    "pet_friendly": true/false,
    "smoking": "allowed/prohibited/partial",
    "noise_level": 1-5
  },
  "time特性": {
    "breakfast": true/false,
    "lunch": true/false,
    "dinner": true/false,
    "late_night": true/false,
    "all_day": true/false
  },
  "special": {
    "reservation": true/false,
    "takeout": true/false,
    "delivery": true/false,
    "online_order": true/false,
    "buffett": true/false,
    "private_room": true/false
  },
  "confidence": 0.0-1.0,
  "reasoning": "分類理由簡述"
}
```

### 分類標準

#### Energy 能量等級
- **lively**: 有活力、氛圍熱鬧但舒適
- **calm**: 寧靜、平和、適合放鬆
- **bustling**: 繁忙、喧囂、人潮洶湧
- **quiet**: 安靜、人少、適合沉思
- **cozy**: 溫馨、舒適、有家的感覺

#### Style 風格
- **modern**: 現代時尚、簡潔設計
- **traditional**: 傳統日式、古色古香
- **casual**: 休閒輕鬆、隨意
- **formal**: 正式莊重、高檔
- **unique**: 獨特有特色、非主流

### 範例

#### 範例 1: 傳統壽司店
輸入: { "name": "寿司大", "category": "dining", "tags": "japanese_food,sushi,omakase" }
輸出:
```json
{
  "energy": "calm",
  "style": "traditional",
  "crowd_level": "moderate",
  "scenes": {
    "business": true,
    "dating": true,
    "family": false,
    "solo": true,
    "friends": false,
    "tourist": true
  },
  "environment": {
    "indoor": true,
    "outdoor": false,
    "rooftop": false,
    "view": false,
    "pet_friendly": false,
    "smoking": "prohibited",
    "noise_level": 2
  },
  "time特性": {
    "breakfast": false,
    "lunch": true,
    "dinner": true,
    "late_night": false,
    "all_day": false
  },
  "special": {
    "reservation": true,
    "takeout": false,
    "delivery": false,
    "online_order": false,
    "buffett": false,
    "private_room": false
  },
  "confidence": 0.92,
  "reasoning": "高級壽司店通常氛圍寧靜、傳統日式風格，需要預約，適合商務和約會"
}
```

#### 範例 2: 連鎖咖啡店
輸入: { "name": "Starbucks 銀座店", "category": "dining", "tags": "cafe,coffee,chain" }
輸出:
```json
{
  "energy": "lively",
  "style": "modern",
  "crowd_level": "moderate",
  "scenes": {
    "business": true,
    "dating": true,
    "family": true,
    "solo": true,
    "friends": true,
    "tourist": true
  },
  "environment": {
    "indoor": true,
    "outdoor": false,
    "rooftop": false,
    "view": false,
    "pet_friendly": false,
    "smoking": "prohibited",
    "noise_level": 3
  },
  "time特性": {
    "breakfast": true,
    "lunch": true,
    "dinner": true,
    "late_night": true,
    "all_day": true
  },
  "special": {
    "reservation": false,
    "takeout": true,
    "delivery": false,
    "online_order": true,
    "buffett": false,
    "private_room": false
  },
  "confidence": 0.88,
  "reasoning": "連鎖咖啡店氛圍活潑現代，適合各種場景，全天候營業"
}
```

### 批次處理配置

```typescript
interface BatchLLMConfig {
    batch_size: number;           // 每批 POI 數量 (建議 10-20)
    max_retries: number;          // 最大重試次數 (3)
    retry_delay_ms: number;       // 重試延遲 (1000)
    timeout_ms: number;           // 單次請求超時 (30000)
    model: string;                // 使用模型 (gpt-4o-mini)
    temperature: number;          // 溫度參數 (0.1)
    max_tokens: number;           // 最大 token (1000)
}
```

### Phase 2 資料庫遷移

```sql
-- 新增 atmosphere_tags 欄位
ALTER TABLE l1_places ADD COLUMN IF NOT EXISTS atmosphere_tags JSONB;

-- 建立氣氛標籤統計視圖
CREATE OR REPLACE VIEW v_l1_atmosphere_statistics AS
SELECT
    category,
    energy,
    style,
    COUNT(*) as count,
    AVG((atmosphere_tags->>'confidence')::float) as avg_confidence
FROM l1_places,
     LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(atmosphere_tags) = 'object'
            THEN jsonb_build_array(atmosphere_tags)
            ELSE atmosphere_tags->'core'
        END
     ) as core
WHERE atmosphere_tags IS NOT NULL
GROUP BY category, energy, style;

-- 建立批次分類追蹤表
CREATE TABLE IF NOT EXISTS l1_atmosphere_classification_log (
    id SERIAL PRIMARY KEY,
    poi_id VARCHAR(64) REFERENCES l1_places(id),
    batch_id VARCHAR(32) NOT NULL,
    model_used VARCHAR(64),
    confidence float,
    classified_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(32) DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    error_message TEXT
);

CREATE INDEX idx_atmosphere_log_batch ON l1_atmosphere_classification_log(batch_id);
CREATE INDEX idx_atmosphere_log_status ON l1_atmosphere_classification_log(status);
```

---

## Phase 3: 相似 POI 預計算

### 3.1 相似度計算模型

```typescript
interface SimilarityWeights {
    category_weight: number;      // 類別權重 (0.3)
    location_weight: number;      // 位置權重 (0.25)
    atmosphere_weight: number;    // 氣氛權重 (0.25)
    price_weight: number;         // 價格權重 (0.1)
    popularity_weight: number;    // 人氣權重 (0.1)
}

interface PrecomputedSimilarity {
    poi_id: string;
    similar_poi_id: string;
    similarity_score: number;     // 0.0 - 1.0
    similarity_breakdown: {
        category_score: number;
        location_score: number;
        atmosphere_score: number;
        price_score: number;
        popularity_score: number;
    };
    common_tags: string[];
    recommendation_reason: string;
    computed_at: string;
    expires_at: string;           // 過期時間 (7天後)
}
```

### 3.2 相似度計算演算法

```typescript
class POISimilarityCalculator {

    /**
     * 計算兩 POI 間的類別相似度
     */
    calculateCategorySimilarity(poi1: POI, poi2: POI): number {
        // 同類別 = 1.0
        if (poi1.category === poi2.category) return 1.0;

        // 同父類別 = 0.7
        if (this.getParentCategory(poi1.category) ===
            this.getParentCategory(poi2.category)) return 0.7;

        // 跨類別但相關 = 0.4
        const relatedCategories = this.getRelatedCategories(poi1.category);
        if (relatedCategories.includes(poi2.category)) return 0.4;

        return 0.0;
    }

    /**
     * 計算兩 POI 間的氣氛相似度
     */
    calculateAtmosphereSimilarity(poi1: POI, poi2: POI): number {
        if (!poi1.atmosphere_tags || !poi2.atmosphere_tags) {
            return 0.5;  // 無氣氛資料時使用中間值
        }

        const a1 = poi1.atmosphere_tags;
        const a2 = poi2.atmosphere_tags;

        // Energy 相似度
        const energySim = a1.core.energy === a2.core.energy ? 1.0 : 0.5;

        // Style 相似度
        const styleSim = a1.core.style === a2.core.style ? 1.0 : 0.6;

        // 場景重疊度
        const scenes1 = this.getTrueScenes(a1.scenes);
        const scenes2 = this.getTrueScenes(a2.scenes);
        const sceneOverlap = this.jaccardSimilarity(scenes1, scenes2);

        // 環境重疊度
        const env1 = this.getEnvironmentVector(a1.environment);
        const env2 = this.getEnvironmentVector(a2.environment);
        const envSim = 1 - this.euclideanDistance(env1, env2) / Math.sqrt(env1.length);

        return (energySim * 0.3 + styleSim * 0.3 + sceneOverlap * 0.2 + envSim * 0.2);
    }

    /**
     * 計算兩 POI 間的位置相似度
     */
    calculateLocationSimilarity(poi1: POI, poi2: POI): number {
        // 同一車站 = 1.0
        if (poi1.station_id === poi2.station_id) return 1.0;

        // 同一行政區 = 0.8
        if (poi1.location_tags?.ward === poi2.location_tags?.ward) {
            return 0.8;
        }

        // 計算直線距離 (km)
        const distance = this.calculateDistance(
            poi1.coordinates,
            poi2.coordinates
        );

        // 距離衰減：1km 以內 = 0.6, 2km = 0.4, 5km = 0.2
        if (distance <= 1) return 0.6;
        if (distance <= 2) return 0.4;
        if (distance <= 5) return 0.2;
        return 0.1;
    }

    /**
     * 計算整體相似度
     */
    calculateOverallSimilarity(poi1: POI, poi2: POI): PrecomputedSimilarity {
        const weights: SimilarityWeights = {
            category_weight: 0.3,
            location_weight: 0.25,
            atmosphere_weight: 0.25,
            price_weight: 0.1,
            popularity_weight: 0.1
        };

        const categoryScore = this.calculateCategorySimilarity(poi1, poi2);
        const locationScore = this.calculateLocationSimilarity(poi1, poi2);
        const atmosphereScore = this.calculateAtmosphereSimilarity(poi1, poi2);
        const priceScore = this.calculatePriceSimilarity(poi1, poi2);
        const popularityScore = this.calculatePopularitySimilarity(poi1, poi2);

        const overall =
            categoryScore * weights.category_weight +
            locationScore * weights.location_weight +
            atmosphereScore * weights.atmosphere_weight +
            priceScore * weights.price_weight +
            popularityScore * weights.popularity_weight;

        // 找出共同標籤
        const commonTags = this.findCommonTags(poi1, poi2);

        // 生成推薦理由
        const reason = this.generateRecommendationReason(poi1, poi2, {
            categoryScore,
            locationScore,
            atmosphereScore
        });

        return {
            poi_id: poi1.id,
            similar_poi_id: poi2.id,
            similarity_score: overall,
            similarity_breakdown: {
                category_score: categoryScore,
                location_score: locationScore,
                atmosphere_score: atmosphereScore,
                price_score: priceScore,
                popularity_score: popularityScore
            },
            common_tags: commonTags,
            recommendation_reason: reason,
            computed_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
    }
}
```

### 3.3 預計算批次任務設計

```typescript
interface PrecomputeBatchConfig {
    batch_size: number;           // 每批 POI 數量 (100)
    max_similar_per_poi: number;  // 每 POI 最多保留相似數 (20)
    min_similarity_threshold: number;  // 最小相似度閾值 (0.4)
    similarity_workers: number;   // 並行 worker 數 (4)
    priority_pois: string[];      // 高優先級 POI ID 清單
}

class SimilarityPrecomputationJob {

    async run(config: PrecomputeBatchConfig): Promise<JobResult> {
        const startTime = Date.now();
        let processed = 0;
        let inserted = 0;
        let errors = 0;

        // 1. 獲取需要計算的 POI 清單
        const pois = await this.getPOIsForComputation();

        // 2. 按優先級排序
        const sortedPOIs = this.sortByPriority(pois, config.priority_pois);

        // 3. 分批處理
        const batches = this.createBatches(sortedPOIs, config.batch_size);

        for (const batch of batches) {
            const results = await Promise.all(
                batch.map(poi => this.computeSimilarities(poi, pois, config))
            );

            // 4. 過濾並排序結果
            const filteredResults = results
                .flat()
                .filter(r => r.similarity_score >= config.min_similarity_threshold)
                .sort((a, b) => b.similarity_score - a.similarity_score)
                .slice(0, config.max_similar_per_poi);

            // 5. 批量寫入資料庫
            await this.batchInsert(filteredResults);

            processed += batch.length;
            inserted += filteredResults.length;

            console.log(`Processed ${processed} POIs, Inserted ${inserted} similarities`);
        }

        return {
            processed,
            inserted,
            errors,
            duration_ms: Date.now() - startTime
        };
    }

    private async computeSimilarities(
        poi: POI,
        allPOIs: POI[],
        config: PrecomputeBatchConfig
    ): Promise<PrecomputedSimilarity[]> {
        // 排除自身
        const candidates = allPOIs.filter(p => p.id !== poi.id);

        // 並行計算相似度
        const similarities = await Promise.all(
            candidates.map(candidate =>
                this.calculator.calculateOverallSimilarity(poi, candidate)
            )
        );

        return similarities;
    }
}
```

### 3.4 資料庫結構

```sql
-- 相似 POI 預計算表
CREATE TABLE IF NOT EXISTS l1_poi_similarities (
    id BIGSERIAL PRIMARY KEY,
    poi_id VARCHAR(64) NOT NULL,
    similar_poi_id VARCHAR(64) NOT NULL,
    similarity_score DECIMAL(4,3) NOT NULL,
    similarity_breakdown JSONB NOT NULL,
    common_tags TEXT[],
    recommendation_reason TEXT,
    computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,

    UNIQUE(poi_id, similar_poi_id)
);

-- 建立索引
CREATE INDEX idx_similar_poi_id ON l1_poi_similarities(poi_id);
CREATE INDEX idx_similar_similar_poi_id ON l1_poi_similarities(similar_poi_id);
CREATE INDEX idx_similarity_score ON l1_poi_similarities(similarity_score DESC);
CREATE INDEX idx_expires_at ON l1_poi_similarities(expires_at);

-- 相似度統計視圖
CREATE OR REPLACE VIEW v_l1_similarity_statistics AS
SELECT
    poi_id,
    COUNT(*) as similar_count,
    AVG(similarity_score) as avg_similarity,
    MAX(similarity_score) as max_similarity,
    MIN(similarity_score) as min_similarity
FROM l1_poi_similarities
WHERE expires_at > NOW()
GROUP BY poi_id;

-- 預計算任務追蹤表
CREATE TABLE IF NOT EXISTS l1_similarity_job_log (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(32) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(32) DEFAULT 'running',
    pois_processed INT DEFAULT 0,
    similarities_inserted INT DEFAULT 0,
    error_message TEXT
);

CREATE INDEX idx_job_log_status ON l1_similarity_job_log(status);
CREATE INDEX idx_job_log_started ON l1_similarity_job_log(started_at DESC);
```

### 3.5 增量更新策略

```typescript
class SimilarityUpdater {

    /**
     * 當 POI 標籤更新時，觸發相似度重新計算
     */
    async onPOITagsUpdated(poiId: string): Promise<void> {
        // 1. 標記現有相似度為過期
        await this.markAsExpired(poiId);

        // 2. 重新計算該 POI 的相似度
        const newSimilarities = await this.recomputeForPOI(poiId);

        // 3. 更新相關 POI 的相似度（因為它們的相似清單可能需要更新）
        const relatedPOIs = await this.getRelatedPOIs(poiId);
        for (const relatedId of relatedPOIs) {
            await this.markAsExpired(relatedId);
        }

        // 4. 批次插入新相似度
        await this.batchInsert(newSimilarities);
    }

    /**
     * 定期清理過期相似度
     */
    async cleanupExpired(): Promise<number> {
        const { count } = await supabase
            .from('l1_poi_similarities')
            .delete()
            .lt('expires_at', new Date());

        return count;
    }
}
```

---

## Phase 2 & 3 執行計劃

### Step 1: 資料庫遷移
```bash
psql -f supabase/migrations/20260107_l1_atmosphere_similarity.sql
```

### Step 2: 執行 Phase 2 - Atmosphere 分類
```bash
npx tsx scripts/generate-atmosphere-tags.ts \
  --batch-size 20 \
  --model gpt-4o-mini \
  --max-retries 3
```

### Step 3: 執行 Phase 3 - 相似度預計算
```bash
npx tsx scripts/precompute-similarities.ts \
  --batch-size 100 \
  --min-similarity 0.4 \
  --max-per-poi 20
```

### Step 4: 驗證結果
```sql
-- 檢查氣氛標籤覆蓋率
SELECT
    COUNT(*) as total,
    COUNT(atmosphere_tags) as with_atmosphere,
    ROUND(COUNT(atmosphere_tags)::numeric / COUNT(*) * 100, 1) as coverage_pct
FROM l1_places;

-- 檢查相似度計算結果
SELECT * FROM v_l1_similarity_statistics LIMIT 10;

-- 檢查相似推薦範例
SELECT
    p1.name as poi_name,
    p2.name as similar_name,
    similarity_score,
    recommendation_reason
FROM l1_poi_similarities s
JOIN l1_places p1 ON s.poi_id = p1.id
JOIN l1_places p2 ON s.similar_poi_id = p2.id
WHERE s.similarity_score > 0.7
ORDER BY s.similarity_score DESC
LIMIT 20;
```

---

## 預期效果

| 指標 | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| 推理延遲 | 25-40x 改善 | +10-15% 改善 | +5-10% 改善 |
| 標籤覆蓋率 | 100% | 95%+ | 100% 相似推薦 |
| 查詢效能 | <10ms | <10ms | <5ms |
| API 成本 | -80% | -90% | -95% |
