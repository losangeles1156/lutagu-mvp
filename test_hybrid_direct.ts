// @ts-nocheck
import { hybridEngine } from './src/lib/l4/HybridEngine';
import dotenv from 'dotenv';
import path from 'path';

// Load env 
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Mock Date Helper
function mockDate(hour: number) {
    const OriginalDate = Date;
    global.Date = class extends Date {
        constructor() {
            super();
            this.setHours(hour);
        }
        static now() {
            const d = new OriginalDate();
            d.setHours(hour);
            return d.getTime();
        }

        // Proxy other methods to make sure libs don't break
    } as any;
}

async function runTest(name: string, input: any, hour = 14, minute = 0, day = 12) {
    console.log(`\n\n--- Test: ${name} [Time: ${hour}:${minute.toString().padStart(2, '0')}, Day: ${day}] ---`);

    // Mock time if needed (simple mock)
    const _Date = Date;
    global.Date = class extends Date {
        constructor(val: any) {
            super();
            if (val) return new _Date(val);
            // Dynamic day
            const d = new _Date(`2026-01-${day}T00:00:00`);
            d.setHours(hour);
            d.setMinutes(minute);
            return d;
        }

        static now() {
            const d = new _Date(`2026-01-${day}T00:00:00`);
            d.setHours(hour);
            d.setMinutes(minute);
            return d.getTime();
        }

        toLocaleString(locale: any, options: any) {
            const d = new _Date(`2026-01-${day}T00:00:00`);
            d.setHours(hour);
            d.setMinutes(minute);
            return d.toLocaleString(locale, { ...options, timeZone: undefined });
        }
    } as any;

    // We actually need to patch toLocaleTimeString because HybridEngine uses it.
    // Let's just patch HybridEngine.ts logic? No, too invasive.
    // Let's trust my User Prompt logic relies on hours check mostly.

    try {
        // Reload HybridEngine or just call it.
        // Since Date is used inside buildUserPrompt which is called per request, mocking Date here works.

        const result = await hybridEngine.processRequest({
            text: input.text,
            locale: input.locale || 'zh-TW',
            context: input.context
        });

        console.log(`[${result?.source}] Confidence: ${result?.confidence}`);
        console.log('Result:', result?.content);

        return result;

    } catch (e) {
        console.error('Error:', e);
    } finally {
        global.Date = _Date;
    }
}

async function main() {
    console.log('🧪 Starting HybridEngine Direct Verification...');

    // 1. Vague Query
    await runTest('Vague Query (Shinjuku)', {
        text: '去新宿',
        context: { userId: 'test-user' }
    });

    // 2. Stroller Context
    await runTest('Stroller Context (Shibuya)', {
        text: '從澀谷去新宿',
        context: {
            userId: 'test-user',
            preferences: { categories: ['wheelchair'] } // Triggers stroller/accessibility
        }
    });

    // 3. Late Night
    await runTest('Late Night (Last Train)', {
        text: '還有車去新宿嗎？',
        context: { userId: 'test-user' }
    }, 23); // 23:00

    // 4. Rush Hour (Morning) - Use Weekday (13th Jan 2026 is Tuesday)
    await runTest('Rush Hour (Morning 8:30 Weekday)', {
        text: '我想去淺草',
        context: { userId: 'test-user', preferences: { categories: ['wheelchair'] } }
    }, 8, 30, 13); // Day 13 is Tuesday

    // 6. Holiday Rush Check (Should NOT trigger Rush)
    // 2026-01-12 is Monday but it is a Holiday (Coming of Age Day)
    // If getJSTTime works, then isHoliday=true, so isRushHour=false
    await runTest('Holiday Morning (8:30 - No Rush)', {
        text: '我想去淺草',
        context: { userId: 'test-user', preferences: { categories: ['wheelchair'] } }
    }, 8, 30);

    // 5. Geo-fencing (Far from station)
    // Needs StrategyContext mock
    await runTest('Geo-fence: Far (1.5km)', {
        text: '這站在哪？',
        context: {
            userId: 'test-user',
            userLocation: { lat: 35.6800, lng: 139.7600 }, // Assume Tokyo
            strategyContext: {
                nodeId: 'Station:Tokyo',
                nodeName: '東京站',
                nodeLocation: { lat: 35.6900, lng: 139.7700 } // Approx 1.2km away
            }
        }
    });

    // 7. Pilot Skill: Fare Rules (Toddler)
    await runTest('Skill: Fare Rules (Toddler)', {
        text: '我帶一個5歲小孩搭地鐵要買票嗎？',
        context: { userId: 'test-user' }
    });

    // 8. Pilot Skill: Fare Rules (Transfer)
    await runTest('Skill: Fare Rules (Transfer)', {
        text: '我在東銀座，轉搭都營地下鐵有優惠嗎？',
        context: { userId: 'test-user', strategyContext: { nodeName: '東京Metro銀座站' } }
    });

    // 9. Pilot Skill: Medical (Fever)
    await runTest('Skill: Medical (Fever)', {
        text: '我發燒了，頭很痛，我想去東大醫院看病',
        context: { userId: 'test-user', userLocation: { lat: 35.6812, lng: 139.7671 } }
    });

    // 10. Pilot Skill: Medical (Emergency)
    await runTest('Skill: Medical (Emergency)', {
        text: '小孩突然呼吸困難，臉色發白！',
        context: { userId: 'test-user' }
    });
}


main();
