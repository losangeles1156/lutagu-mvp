-- L4 Knowledge Base Seed Data
-- Adds basic expert knowledge for common queries
-- Generated: 2026-01-04

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create L4 Knowledge embeddings table if not exists
CREATE TABLE IF NOT EXISTS public.l4_knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name JSONB DEFAULT '{}'::jsonb,
    content TEXT NOT NULL,
    icon TEXT,
    category TEXT,
    subcategory TEXT,
    time_context JSONB DEFAULT '[]'::jsonb,
    user_context JSONB DEFAULT '[]'::jsonb,
    ward_context JSONB DEFAULT '[]'::jsonb,
    embedding vector(768),
    source TEXT DEFAULT 'expertKnowledgeBase',
    confidence FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS if not already enabled
ALTER TABLE public.l4_knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'l4_knowledge_embeddings' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON public.l4_knowledge_embeddings
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'l4_knowledge_embeddings' AND policyname = 'Enable insert/update for service role only') THEN
        CREATE POLICY "Enable insert/update for service role only" ON public.l4_knowledge_embeddings
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_l4_knowledge_type ON public.l4_knowledge_embeddings(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_l4_entity_id ON public.l4_knowledge_embeddings(entity_id);
CREATE INDEX IF NOT EXISTS idx_l4_category ON public.l4_knowledge_embeddings(category);
CREATE INDEX IF NOT EXISTS idx_l4_user_context ON public.l4_knowledge_embeddings USING GIN(user_context);

-- Create HNSW index for vector similarity search (only if table is empty or index doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'l4_knowledge_embeddings' AND indexname = 'idx_l4_embedding_hnsw') THEN
        CREATE INDEX IF NOT EXISTS idx_l4_embedding_hnsw ON public.l4_knowledge_embeddings
        USING hnsw (embedding vector_cosine_ops);
    END IF;
END $$;

-- Insert common railway knowledge
INSERT INTO public.l4_knowledge_embeddings
    (knowledge_type, entity_id, entity_name, content, icon, category, user_context, time_context)
SELECT 'railway', 'odpt.Railway:TokyoMetro.Ginza',
     '{"zh-TW": "銀座線", "ja": "銀座線", "en": "Ginza Line"}',
     '銀座線是東京最古老的地鐵線，月台較窄，攜帶大行李時請多留意。尖峰時段非常擁擠，建議避開 08:00-09:30。',
     '🚇', 'tip', '["largeLuggage", "general"]', '["weekday-morning", "weekday-evening"]'
WHERE NOT EXISTS (SELECT 1 FROM public.l4_knowledge_embeddings WHERE entity_id = 'odpt.Railway:TokyoMetro.Ginza');

INSERT INTO public.l4_knowledge_embeddings
    (knowledge_type, entity_id, entity_name, content, icon, category, user_context, time_context)
SELECT 'railway', 'odpt.Railway:JR-East.Yamanote',
     '{"zh-TW": "山手線", "ja": "山手線", "en": "Yamanote Line"}',
     '山手線為環狀線，轉乘其他 JR 線路通常不需出站。尖峰時段（08:00-09:30）建議避開新宿、澀谷等大站。',
     '🚃', 'tip', '["general"]', '["weekday-morning"]'
WHERE NOT EXISTS (SELECT 1 FROM public.l4_knowledge_embeddings WHERE entity_id = 'odpt.Railway:JR-East.Yamanote');

INSERT INTO public.l4_knowledge_embeddings
    (knowledge_type, entity_id, entity_name, content, icon, category, user_context, time_context)
SELECT 'hub_station', 'odpt.Station:TokyoMetro.Ginza.Asakusa',
     '{"zh-TW": "淺草站", "ja": "浅草駅", "en": "Asakusa Station"}',
     '淺草站 1 號出口最靠近雷門。與東武線轉乘需出站，請預留 5-10 分鐘。站內寄物櫃經常在上午 10 點前客滿。',
     '📍', 'facility', '["largeLuggage", "stroller"]', '[]'
WHERE NOT EXISTS (SELECT 1 FROM public.l4_knowledge_embeddings WHERE entity_id = 'odpt.Station:TokyoMetro.Ginza.Asakusa');

INSERT INTO public.l4_knowledge_embeddings
    (knowledge_type, entity_id, entity_name, content, icon, category, user_context, time_context)
SELECT 'hub_station', 'odpt.Station:TokyoMetro.Ginza.Ueno',
     '{"zh-TW": "上野站", "ja": "上野駅", "en": "Ueno Station"}',
     '上野站 3 號出口有電梯，適合大行李與嬰兒車。轉乘日比谷線需經過一段較長的地下通道。從銀座線前往 JR 上野站，建議使用不忍口方向的電梯。',
     '🛗', 'accessibility', '["wheelchair", "stroller", "largeLuggage"]', '[]'
WHERE NOT EXISTS (SELECT 1 FROM public.l4_knowledge_embeddings WHERE entity_id = 'odpt.Station:TokyoMetro.Ginza.Ueno');

INSERT INTO public.l4_knowledge_embeddings
    (knowledge_type, entity_id, entity_name, content, icon, category, user_context, time_context)
SELECT 'hub_station', 'odpt.Station:JR-East.Yamanote.Shinjuku',
     '{"zh-TW": "新宿站", "ja": "新宿駅", "en": "Shinjuku Station"}',
     '新宿站是世界最繁忙車站，共有超過 200 個出口，請務必確認目標出口名稱。西口與東口之間可透過東西自由通路直接穿過。',
     '🚨', 'warning', '["general"]', '["weekday-morning", "weekday-evening"]'
WHERE NOT EXISTS (SELECT 1 FROM public.l4_knowledge_embeddings WHERE entity_id = 'odpt.Station:JR-East.Yamanote.Shinjuku');

INSERT INTO public.l4_knowledge_embeddings
    (knowledge_type, entity_id, entity_name, content, icon, category, user_context, time_context)
SELECT 'hub_station', 'odpt.Station:JR-East.Yamanote.Shibuya',
     '{"zh-TW": "澀谷站", "ja": "渋谷駅", "en": "Shibuya Station"}',
     '澀谷站正在進行長期整修工程（至 2027 年），動線頻繁變動且較擁擠。JR 澀谷站與副都心線轉乘距離極長（徒步約 10-15 分鐘）。',
     '⚠️', 'warning', '["general"]', '[]'
WHERE NOT EXISTS (SELECT 1 FROM public.l4_knowledge_embeddings WHERE entity_id = 'odpt.Station:JR-East.Yamanote.Shibuya');

INSERT INTO public.l4_knowledge_embeddings
    (knowledge_type, entity_id, entity_name, content, icon, category, user_context, time_context)
SELECT 'hub_station', 'odpt.Station:JR-East.Yamanote.Tokyo',
     '{"zh-TW": "東京站", "ja": "東京駅", "en": "Tokyo Station"}',
     '東京站是轉乘新幹線的主要站點，建議從中央線月台前往新房東北自由行需約 10 分鐘。京葉線（前往迪士尼）月台位於地下深處。',
     '🚉', 'tip', '["largeLuggage"]', '[]'
WHERE NOT EXISTS (SELECT 1 FROM public.l4_knowledge_embeddings WHERE entity_id = 'odpt.Station:JR-East.Yamanote.Tokyo');

INSERT INTO public.l4_knowledge_embeddings
    (knowledge_type, entity_id, entity_name, content, icon, category, user_context, time_context)
SELECT 'accessibility', 'wheelchair',
     '{"zh-TW": "輪椅使用者", "ja": "車椅子利用者", "en": "Wheelchair Users"}',
     '日本車站電梯通常位於月台中段或特定車廂位置，請留意月台上的標示。大部分主要車站都設有電梯和無障礙洗手間。',
     '♿', 'accessibility', '["wheelchair"]', '[]'
WHERE NOT EXISTS (SELECT 1 FROM public.l4_knowledge_embeddings WHERE entity_id = 'wheelchair');

INSERT INTO public.l4_knowledge_embeddings
    (knowledge_type, entity_id, entity_name, content, icon, category, user_context, time_context)
SELECT 'special_location', 'luggage_storage',
     '{"zh-TW": "行李寄放", "ja": "荷物預かり", "en": "Luggage Storage"}',
     '若站內寄物櫃滿，推薦使用 ecbo cloak 服務，可將行李寄放在附近商店或咖啡廳。預約連結: https://cloak.ecbo.io/ 大型行李（超過24吋）通常需要 ¥600-800。',
     '🎒', 'tip', '["largeLuggage"]', '[]'
WHERE NOT EXISTS (SELECT 1 FROM public.l4_knowledge_embeddings WHERE entity_id = 'luggage_storage');

INSERT INTO public.l4_knowledge_embeddings
    (knowledge_type, entity_id, entity_name, content, icon, category, user_context, time_context)
SELECT 'pass', 'tokyo_subway_ticket',
     '{"zh-TW": "東京地鐵券", "ja": "東京メトロ券", "en": "Tokyo Subway Ticket"}',
     'Tokyo Subway Ticket (24/48/72h): ¥800 / ¥1200 / ¥1500。可無限次搭乘全線東京地鐵與都營地鐵。平均一天搭乘 3 次以上即划算。',
     '🎫', 'pass', '["budget"]', '[]'
WHERE NOT EXISTS (SELECT 1 FROM public.l4_knowledge_embeddings WHERE entity_id = 'tokyo_subway_ticket');

-- Verify data was inserted
SELECT count(*) as knowledge_count FROM public.l4_knowledge_embeddings;
