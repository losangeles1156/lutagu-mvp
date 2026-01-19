/**
 * Phase 2: Atmosphere Tag Generation Script
 *
 * Purpose: Generate atmosphere_tags for L1 POI records using batch LLM classification
 * Uses fetch API for OpenAI calls to avoid additional dependencies
 *
 * Usage:
 *   npx tsx scripts/generate-atmosphere-tags.ts \
 *     --batch-size 20 \
 *     --model gpt-4o-mini \
 *     --max-retries 3 \
 *     --concurrency 3
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration
interface Config {
    batchSize: number;
    model: string;
    maxRetries: number;
    retryDelay: number;
    timeout: number;
    concurrency: number;
    minConfidence: number;
}

const config: Config = {
    batchSize: parseInt(process.argv.find(a => a.startsWith('--batch-size'))?.split('=')[1] || '20'),
    model: process.argv.find(a => a.startsWith('--model'))?.split('=')[1] || 'gpt-4o-mini',
    maxRetries: parseInt(process.argv.find(a => a.startsWith('--max-retries'))?.split('=')[1] || '3'),
    retryDelay: parseInt(process.argv.find(a => a.startsWith('--retry-delay'))?.split('=')[1] || '1000'),
    timeout: parseInt(process.argv.find(a => a.startsWith('--timeout'))?.split('=')[1] || '30000'),
    concurrency: parseInt(process.argv.find(a => a.startsWith('--concurrency'))?.split('=')[1] || '3'),
    minConfidence: parseFloat(process.argv.find(a => a.startsWith('--min-confidence'))?.split('=')[1] || '0.5'),
};

// LLM Prompt
const ATMOSPHERE_SYSTEM_PROMPT = `你是一個專業的日本景點與餐廳氣氛分析師。請根據提供的 POI 資訊，分析並分類其氣氛特徵。

分類標準：

## Energy 能量等級
- lively: 有活力、氛圍熱鬧但舒適
- calm: 寧靜、平和、適合放鬆
- bustling: 繁忙、喧囂、人潮洶湧
- quiet: 安靜、人少、適合沉思
- cozy: 溫馨、舒適、有家的感覺

## Style 風格
- modern: 現代時尚、簡潔設計
- traditional: 傳統日式、古色古香
- casual: 休閒輕鬆、隨意
- formal: 正式莊重、高檔
- unique: 獨特有特色、非主流

## Crowd Level
- empty: 幾乎沒有人
- sparse: 人很少
- moderate: 適中的人流量
- crowded: 比較擁擠
- packed: 非常擁擠

## Smoking
- allowed: 可以吸煙
- prohibited: 禁止吸煙
- partial: 部分區域可以

請嚴格以 JSON 格式輸出，確保所有欄位都有值。`;

interface POIInput {
    id: string;
    name: string;
    category: string;
    tags: Record<string, unknown>;
    location: string | null;
}

interface AtmosphereOutput {
    core: {
        energy: 'lively' | 'calm' | 'bustling' | 'quiet' | 'cozy';
        style: 'modern' | 'traditional' | 'casual' | 'formal' | 'unique';
        crowd_level: 'empty' | 'sparse' | 'moderate' | 'crowded' | 'packed';
    };
    scenes: {
        business: boolean;
        dating: boolean;
        family: boolean;
        solo: boolean;
        friends: boolean;
        tourist: boolean;
    };
    environment: {
        indoor: boolean;
        outdoor: boolean;
        rooftop: boolean;
        view: boolean;
        pet_friendly: boolean;
        smoking: 'allowed' | 'prohibited' | 'partial';
        noise_level: number;
    };
    time特性: {
        breakfast: boolean;
        lunch: boolean;
        dinner: boolean;
        late_night: boolean;
        all_day: boolean;
    };
    special: {
        reservation: boolean;
        takeout: boolean;
        delivery: boolean;
        online_order: boolean;
        buffett: boolean;
        private_room: boolean;
    };
    confidence: number;
    reasoning: string;
}

async function callOpenAI(poi: POIInput, attempt: number = 0): Promise<AtmosphereOutput | null> {
    const userPrompt = `請分析以下 POI 的氣氛：

## 輸入資訊
- 名稱: ${poi.name}
- 類別: ${poi.category}
- 標籤: ${JSON.stringify(poi.tags)}
- 位置: ${poi.location || '未知'}

請輸出 JSON 格式的氣氛分類結果。`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(config.timeout),
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: 'system', content: ATMOSPHERE_SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.1,
                max_tokens: 1000,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('Empty response from LLM');
        }

        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        const result = JSON.parse(jsonMatch[0]) as AtmosphereOutput;

        // Validate required fields
        if (!result.core?.energy || !result.core?.style || !result.core?.crowd_level) {
            throw new Error('Missing required fields in response');
        }

        return result;

    } catch (error) {
        if (attempt < config.maxRetries) {
            console.log(`Retry ${attempt + 1}/${config.maxRetries} for ${poi.name}`);
            await new Promise(resolve => setTimeout(resolve, config.retryDelay * (attempt + 1)));
            return callOpenAI(poi, attempt + 1);
        }
        console.error(`Failed to classify ${poi.name} after ${config.maxRetries} attempts:`, error);
        return null;
    }
}

// Simple semaphore for concurrency control
class Semaphore {
    private count: number;
    private queue: (() => void)[];

    constructor(count: number) {
        this.count = count;
        this.queue = [];
    }

    async acquire(): Promise<void> {
        if (this.count > 0) {
            this.count--;
            return;
        }
        return new Promise(resolve => this.queue.push(resolve));
    }

    release(): void {
        this.count++;
        if (this.queue.length > 0) {
            this.count--;
            const next = this.queue.shift();
            if (next) next();
        }
    }
}

async function getUnclassifiedPOIs(limit: number): Promise<POIInput[]> {
    const { data, error } = await supabase
        .from('l1_places')
        .select('id, name, category, tags, location')
        .is('atmosphere_tags', null)
        .not('category', 'is', null)
        .limit(limit);

    if (error) {
        console.error('Error fetching POIs:', error);
        return [];
    }

    return data || [];
}

async function logClassification(
    poiId: string,
    batchId: string,
    status: string,
    errorMessage?: string
): Promise<void> {
    try {
        await supabase.from('l1_atmosphere_classification_log').insert({
            poi_id: poiId,
            batch_id: batchId,
            model_used: config.model,
            confidence: 0,
            status,
            retry_count: 0,
            error_message: errorMessage
        });
    } catch (e) {
        // Ignore log errors
    }
}

async function updatePOIAtmosphere(poiId: string, atmosphere: AtmosphereOutput): Promise<void> {
    await supabase
        .from('l1_places')
        .update({
            atmosphere_tags: {
                ...atmosphere,
                confidence: atmosphere.confidence,
                model_used: config.model,
                classified_at: new Date().toISOString()
            }
        })
        .eq('id', poiId);
}

async function main() {
    const batchId = `batch_${Date.now()}`;
    console.log('=== Phase 2: Atmosphere Tag Generation ===');
    console.log(`Batch ID: ${batchId}`);
    console.log(`Config:`, config);
    console.log('');

    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    let iterations = 0;
    const maxIterations = 500;

    const semaphore = new Semaphore(config.concurrency);

    while (iterations < maxIterations) {
        const pois = await getUnclassifiedPOIs(config.batchSize);

        if (pois.length === 0) {
            console.log('No more unclassified POIs found.');
            break;
        }

        console.log(`\nIteration ${iterations + 1}: Processing ${pois.length} POIs...`);

        // Process with semaphore for concurrency control
        const promises = pois.map(async (poi) => {
            await semaphore.acquire();
            try {
                const result = await callOpenAI(poi);

                if (result && result.confidence >= config.minConfidence) {
                    await updatePOIAtmosphere(poi.id, result);
                    await logClassification(poi.id, batchId, 'success');
                    return { success: true, poi };
                } else {
                    await logClassification(poi.id, batchId, 'failed',
                        result ? `Low confidence: ${result.confidence}` : 'LLM classification failed');
                    return { success: false, poi };
                }
            } finally {
                semaphore.release();
            }
        });

        const results = await Promise.all(promises);

        const iterationSuccess = results.filter(r => r.success).length;
        const iterationFailed = results.filter(r => !r.success).length;

        totalProcessed += pois.length;
        totalSuccess += iterationSuccess;
        totalFailed += iterationFailed;

        console.log(`  Success: ${iterationSuccess}, Failed: ${iterationFailed}`);

        iterations++;

        // Rate limiting - wait between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n=== Summary ===');
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Success: ${totalSuccess} (${totalProcessed > 0 ? (totalSuccess / totalProcessed * 100).toFixed(1) : 0}%)`);
    console.log(`Failed: ${totalFailed} (${totalProcessed > 0 ? (totalFailed / totalProcessed * 100).toFixed(1) : 0}%)`);
    console.log(`Iterations: ${iterations}`);
    console.log(`Batch ID: ${batchId}`);
}

main().catch(console.error);
