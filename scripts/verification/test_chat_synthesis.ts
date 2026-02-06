import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import { hybridEngine } from '../../src/lib/l4/HybridEngine';

async function testQuality() {
    const testCases = [
        {
            query: '我現在要去羽田機場，上野還有電車可搭嗎？',
            context: {
                currentStation: 'odpt.Station:JR-East.Yamanote.Ueno',
                userLocation: { lat: 35.7137, lng: 139.7772 }
            }
        },
        {
            query: '淺草站轉乘會很麻煩嗎？',
            context: {
                currentStation: 'odpt.Station:TokyoMetro.Ginza.Asakusa',
                userLocation: { lat: 35.7118, lng: 139.7967 }
            }
        }
    ];

    console.log('=== AI Chat Synthesis Quality Test ===\n');

    for (const test of testCases) {
        console.log(`[User]: ${test.query}`);
        try {
            const response = await hybridEngine.processRequest({
                text: test.query,
                locale: 'zh-TW',
                context: test.context
            });

            if (response) {
                console.log(`[Source]: ${response.source}`);
                console.log(`[Lutagu]: ${response.content}`);
                console.log(`[Reasoning]: ${response.reasoningLog?.join(' -> ')}`);
                console.log('-----------------------------------\n');
            }
        } catch (error) {
            console.error('Test Error:', error);
        }
    }
}

testQuality();
