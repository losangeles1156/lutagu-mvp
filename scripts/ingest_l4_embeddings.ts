
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const googleApiKey = process.env.GOOGLE_API_KEY;

if (!supabaseUrl || !supabaseKey || !googleApiKey) {
    console.error('Missing required environment variables (SUPABASE_URL, SERVICE_KEY, GOOGLE_API_KEY)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// We'll manually define some sample data from expertKnowledgeBase to avoid complex imports in this script
// In a real scenario, we'd import the full file, but for the MVP fix, we'll use the most critical ones.
const KNOWLEDGE_ITEMS = [
    {
        type: 'railway',
        id: 'odpt.Railway:TokyoMetro.Ginza',
        name: { 'zh-TW': '銀座線', 'ja': '銀座線', 'en': 'Ginza Line' },
        content: '銀座線是東京最古老的地鐵線，月台較窄，攜帶大行李時請多留意。尖峰時段（08:00-09:30）非常擁擠，建議避開。',
        icon: '🚇',
        category: 'tip',
        user_context: ['largeLuggage', 'general'],
        time_context: ['weekday-morning']
    },
    {
        type: 'railway',
        id: 'odpt.Railway:JR-East.Yamanote',
        name: { 'zh-TW': '山手線', 'ja': '山手線', 'en': 'Yamanote Line' },
        content: '山手線為環狀線，轉乘其他 JR 線路通常不需出站。新宿、澀谷站轉乘非常複雜，建議預留 10 分鐘以上。',
        icon: '🚃',
        category: 'tip',
        user_context: ['general'],
        time_context: []
    },
    {
        type: 'hub_station',
        id: 'odpt.Station:JR-East.Tokyo',
        name: { 'zh-TW': '東京站', 'ja': '東京駅', 'en': 'Tokyo Station' },
        content: '東京站京葉線月台距離其他月台非常遙遠（步行約 10-15 分鐘），若要轉乘迪士尼方向，請務必預留充足時間。',
        icon: '⚠️',
        category: 'warning',
        subcategory: 'transfer',
        user_context: ['general', 'stroller'],
        time_context: []
    },
    {
        type: 'accessibility',
        id: 'odpt.Station:TokyoMetro.Ginza.Ueno',
        name: { 'zh-TW': '上野站', 'ja': '上野駅', 'en': 'Ueno Station' },
        content: '上野站 3 號出口設有電梯，是攜帶大行李、推嬰兒車或輪椅使用者的最佳出入口。',
        icon: '🛗',
        category: 'accessibility',
        user_context: ['wheelchair', 'stroller', 'largeLuggage'],
        time_context: []
    },
    {
        type: 'hub_station',
        id: 'odpt.Station:JR-East.Shinjuku',
        name: { 'zh-TW': '新宿站', 'ja': '新宿駅', 'en': 'Shinjuku Station' },
        content: '新宿站共有超過 200 個出口，轉乘時請務必沿著黃色指示牌走「東西自由通路」，可節省大量時間。',
        icon: '💡',
        category: 'tip',
        subcategory: 'transfer',
        user_context: ['general'],
        time_context: []
    },
    {
        type: 'railway',
        id: 'odpt.Railway:Toei.Oedo',
        name: { 'zh-TW': '大江戶線', 'ja': '大江戸線', 'en': 'Oedo Line' },
        content: '大江戶線月台通常位於地下深處，轉乘時間較長。部分車站（如六本木站）月台深度超過 40 公尺，請優先尋找電梯。',
        icon: '⚠️',
        category: 'warning',
        user_context: ['senior', 'largeLuggage', 'stroller'],
        time_context: []
    }
];

async function generateEmbedding(text: string, retries = 3): Promise<number[]> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${googleApiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'models/text-embedding-004',
                        content: { parts: [{ text }] }
                    })
                }
            );

            if (!response.ok) {
                const error = await response.json();
                if (response.status === 429 && i < retries - 1) {
                    console.log(`Rate limited. Retrying in ${Math.pow(2, i)}s...`);
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                    continue;
                }
                throw new Error(`Google Embedding API Error: ${JSON.stringify(error)}`);
            }

            const data: any = await response.json();
            return data.embedding.values;
        } catch (err) {
            if (i === retries - 1) throw err;
            console.log(`Error on attempt ${i + 1}. Retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    throw new Error('Failed after retries');
}

async function main() {
    console.log(`Starting ingestion of ${KNOWLEDGE_ITEMS.length} items...`);

    for (const item of KNOWLEDGE_ITEMS) {
        try {
            console.log(`Processing: ${item.name['zh-TW']} (${item.id})`);

            const embedding = await generateEmbedding(item.content);

            console.log(`Upserting: ${item.id}`);

            const { error } = await supabase
                .from('l4_knowledge_embeddings')
                .upsert({
                    knowledge_type: item.type,
                    entity_id: item.id,
                    entity_name: item.name,
                    content: item.content,
                    icon: item.icon,
                    category: item.category,
                    subcategory: item.subcategory,
                    user_context: item.user_context,
                    time_context: item.time_context,
                    embedding: embedding,
                    source: 'expertKnowledgeBase'
                });

            if (error) {
                console.error(`Error upserting ${item.id}:`, error.message);
            } else {
                console.log(`Successfully ingested: ${item.id}`);
            }

            // Wait a bit to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
            console.error(`Failed to process ${item.id}:`, err);
        }
    }

    console.log('Ingestion complete!');
}

main();
