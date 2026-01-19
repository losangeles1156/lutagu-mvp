/**
 * L3 Facilities Batch Translation Script
 *
 * Translates existing L3 facility data in Supabase to Traditional Chinese
 * using Mistral API.
 *
 * Target types: toilet, locker, elevator, escalator
 * Sources: Tokyo Metro, Toei, JR East
 */

import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// Type definitions
interface L3Facility {
    id: string;
    station_id: string;
    type: string;
    name_i18n: { ja?: string; en?: string; zh?: string } | null;
    location_i18n: { ja?: string; en?: string; zh?: string } | null;
    attributes: Record<string, any> | null;
}

// Translation mapping for common facility terms
const FACILITY_TRANSLATIONS: Record<string, string> = {
    'elevator': '電梯',
    'escalator': '手扶梯',
    'toilet': '洗手間',
    'locker': '置物櫃',
    'barrier_free_entrance': '無障礙出入口',
    'waiting_room': '候車室',
    'ticket_gate': '剪票口',
};

// Common Japanese -> Chinese translations
const COMMON_TERMS: Record<string, string> = {
    '改札': '剪票口',
    'ホーム': '月台',
    '階': '樓',
    '出口': '出口',
    'エレベーター': '電梯',
    'エスカレーター': '手扶梯',
    'トイレ': '洗手間',
    'コインロッカー': '置物櫃',
    '多機能トイレ': '多功能洗手間',
    '車いす': '輪椅',
    'ベビーカー': '嬰兒車',
    '授乳室': '哺乳室',
    '北': '北',
    '南': '南',
    '東': '東',
    '西': '西',
    '中央': '中央',
};

async function translateWithMistral(text: string, context: string = ''): Promise<string> {
    if (!text || text.trim() === '') return '';

    const prompt = `Translate the following Japanese text to Traditional Chinese (繁體中文).
Context: This is a ${context} description for a train station facility.
Keep it concise and natural for Taiwanese readers.
If the text contains proper nouns (station names, brand names), keep them in Japanese.

Japanese: ${text}

Respond with ONLY the Traditional Chinese translation, nothing else.`;

    try {
        await new Promise(r => setTimeout(r, 500)); // Rate limit

        const result = await mistral.chat.complete({
            model: 'mistral-small-latest',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            maxTokens: 200
        });

        const content = result.choices?.[0]?.message?.content as string;
        return content?.trim() || text;
    } catch (e) {
        console.error('Translation error:', e);
        return text; // Return original if translation fails
    }
}

function quickTranslate(text: string): string {
    if (!text) return '';

    let result = text;
    for (const [ja, zh] of Object.entries(COMMON_TERMS)) {
        result = result.replace(new RegExp(ja, 'g'), zh);
    }
    return result;
}

async function translateFacility(facility: L3Facility): Promise<Partial<L3Facility>> {
    const updates: Partial<L3Facility> = { id: facility.id };

    // Translate name
    const nameJa = facility.name_i18n?.ja || '';
    if (nameJa && !facility.name_i18n?.zh) {
        // First try quick translation, then LLM if needed
        let nameZh = quickTranslate(nameJa);
        if (nameZh === nameJa) {
            nameZh = await translateWithMistral(nameJa, 'facility name');
        }
        updates.name_i18n = {
            ...facility.name_i18n,
            zh: nameZh
        };
    }

    // Translate location from attributes
    const locationJa = facility.attributes?.location_description || '';
    if (locationJa) {
        let locationZh = quickTranslate(locationJa);
        if (locationZh === locationJa) {
            locationZh = await translateWithMistral(locationJa, 'location');
        }
        updates.location_i18n = {
            ja: locationJa,
            zh: locationZh,
            en: facility.location_i18n?.en || locationJa
        };
    }

    return updates;
}

async function main() {
    console.log('🌐 L3 Facilities Batch Translation');
    console.log('===================================');

    // Target facility types
    const targetTypes = ['toilet', 'locker', 'elevator', 'escalator', 'barrier_free_entrance'];

    // Fetch facilities needing translation
    const { data: facilities, error } = await supabase
        .from('l3_facilities')
        .select('*')
        .in('type', targetTypes)
        .limit(500); // Process in batches

    if (error) {
        console.error('Database error:', error.message);
        return;
    }

    if (!facilities || facilities.length === 0) {
        console.log('No facilities found to translate.');
        return;
    }

    console.log(`Found ${facilities.length} facilities to process.`);

    let successCount = 0;
    let skipCount = 0;

    for (const facility of facilities) {
        // Skip if already has zh translation
        if (facility.name_i18n?.zh) {
            skipCount++;
            continue;
        }

        console.log(`Processing: ${facility.id} (${facility.type})`);

        try {
            const updates = await translateFacility(facility as L3Facility);

            if (updates.name_i18n || updates.location_i18n) {
                const { error: updateError } = await supabase
                    .from('l3_facilities')
                    .update({
                        name_i18n: updates.name_i18n,
                        location_i18n: updates.location_i18n,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', facility.id);

                if (updateError) {
                    console.error(`Update error for ${facility.id}:`, updateError.message);
                } else {
                    successCount++;
                    console.log(`✅ Translated: ${facility.name_i18n?.ja} -> ${updates.name_i18n?.zh}`);
                }
            }
        } catch (e) {
            console.error(`Error processing ${facility.id}:`, e);
        }

        // Rate limit delay
        await new Promise(r => setTimeout(r, 300));
    }

    console.log('\\n===================================');
    console.log(`Translation Complete!`);
    console.log(`✅ Translated: ${successCount}`);
    console.log(`⏭️  Skipped (already has zh): ${skipCount}`);
    console.log(`📊 Total processed: ${facilities.length}`);
}

main().catch(console.error);
