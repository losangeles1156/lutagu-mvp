import { NextRequest, NextResponse } from 'next/server';
import { generateWeatherAdvice, generateL1DNA, generateL4Advice } from '@/lib/ai/llmService';

/**
 * AI Service Test Endpoint
 * 
 * GET /api/ai/test - Test MiniMax connection with sample generation
 * POST /api/ai/test - Generate content based on request body
 */

export async function GET() {
    const startTime = Date.now();
    const results: Record<string, any> = {
        timestamp: new Date().toISOString(),
        tests: {}
    };

    // Test 1: Weather Advice
    try {
        const weatherAdvice = await generateWeatherAdvice({
            temp: 15,
            condition: 'Clear',
            windSpeed: 3
        }, 'zh-TW');
        results.tests.weather = {
            success: true,
            result: weatherAdvice,
            latencyMs: Date.now() - startTime
        };
    } catch (e: any) {
        results.tests.weather = { success: false, error: e.message };
    }

    // Test 2: L1 DNA
    const l1Start = Date.now();
    try {
        const l1DNA = await generateL1DNA({
            stationName: '上野駅',
            poiCounts: { dining: 45, shopping: 30, culture: 15, nature: 8 },
            nearbyHighlights: ['上野公園', 'アメ横']
        }, 'zh-TW');
        results.tests.l1DNA = {
            success: true,
            result: l1DNA,
            latencyMs: Date.now() - l1Start
        };
    } catch (e: any) {
        results.tests.l1DNA = { success: false, error: e.message };
    }

    // Test 3: L4 Advice
    const l4Start = Date.now();
    try {
        const l4Advice = await generateL4Advice({
            stationId: 'odpt.Station:TokyoMetro.Ginza.Ueno',
            userNeeds: ['wheelchair', 'large_luggage']
        }, 'zh-TW');
        results.tests.l4Advice = {
            success: true,
            result: l4Advice,
            latencyMs: Date.now() - l4Start
        };
    } catch (e: any) {
        results.tests.l4Advice = { success: false, error: e.message };
    }

    results.totalLatencyMs = Date.now() - startTime;
    results.allPassed = Object.values(results.tests).every((t: any) => t.success);

    return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { task, context, locale = 'zh-TW' } = body;

        let result: any = null;

        switch (task) {
            case 'weather':
                result = await generateWeatherAdvice(context, locale);
                break;
            case 'l1dna':
                result = await generateL1DNA(context, locale);
                break;
            case 'l4advice':
                result = await generateL4Advice(context, locale);
                break;
            default:
                return NextResponse.json({ error: 'Unknown task. Use: weather, l1dna, l4advice' }, { status: 400 });
        }

        return NextResponse.json({ result });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
