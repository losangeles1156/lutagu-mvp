/**
 * L4 Expert Knowledge Base API
 * 
 * Provides access to L4 expert knowledge including:
 * - Railway line tips
 * - Hub station tips
 * - Accessibility advice
 * - Special location tips
 * - Pass recommendations
 * - Crowd avoidance tips
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getRailwayExpertTips,
    getHubStationTips,
    getAccessibilityAdvice,
    getSpecialLocationTips,
    getPassRecommendations,
    getCrowdTips
} from '@/lib/l4/expertKnowledgeBase';
import { knowledgeService } from '@/lib/l4/knowledgeService';
import { translateKnowledgeItems, SupportedLocale } from '@/lib/ai/llmService';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    const minPriority = parseInt(searchParams.get('min_priority') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    let locale = (searchParams.get('locale') || 'zh-TW') as string;

    // Normalize locale for LLM service
    if (locale === 'zh') locale = 'zh-TW';
    if (!['zh-TW', 'en', 'ja'].includes(locale)) locale = 'zh-TW';
    
    const targetLocale = locale as SupportedLocale;

    try {
        switch (type) {
            case 'railway': {
                if (!id) {
                    return NextResponse.json({ error: 'Missing railway ID' }, { status: 400 });
                }

                // Prioritize SSoT (Markdown)
                let markdownTips = knowledgeService.getKnowledgeByRailwayId(id);
                
                // Apply filters
                if (minPriority > 0) {
                    markdownTips = markdownTips.filter(k => k.priority >= minPriority);
                }
                markdownTips = markdownTips.slice(0, limit);

                const formattedMarkdownTips = markdownTips.map(k => ({
                    id: k.id,
                    icon: k.icon,
                    content: k.content,
                    type: k.type,
                    section: k.section,
                    priority: k.priority
                }));

                // Fallback to hardcoded for now (to be deprecated)
                const hardcodedTips = getRailwayExpertTips(id);
                const hardcodedTipsFormatted = hardcodedTips.map((t, idx) => ({
                    id: `legacy-railway-${id}-${idx}`,
                    icon: t.icon,
                    content: t.text,
                    type: t.category,
                    section: '專家建議 (Expert Tips)',
                    priority: 50 // Default legacy priority
                }));

                // Merge (prioritize markdown if available)
                const combinedTips = markdownTips.length > 0 ? formattedMarkdownTips : hardcodedTipsFormatted;

                // Translate if needed
                const translatedTips = await translateKnowledgeItems(combinedTips, targetLocale);

                return NextResponse.json({
                    railway_id: id,
                    tips: translatedTips
                });
            }

            case 'station': {
                if (!id) {
                    return NextResponse.json({ error: 'Missing station ID' }, { status: 400 });
                }

                // Get markdown-based tips (SSoT)
                let markdownTips = knowledgeService.getKnowledgeByStationId(id);
                
                // Apply filters
                if (minPriority > 0) {
                    markdownTips = markdownTips.filter(k => k.priority >= minPriority);
                }
                markdownTips = markdownTips.slice(0, limit);

                const formattedMarkdownTips = markdownTips.map(k => ({
                    id: k.id,
                    icon: k.icon,
                    content: k.content,
                    type: k.type,
                    section: k.section,
                    priority: k.priority
                }));

                // Get hardcoded tips (Legacy)
                const hardcodedTips = getHubStationTips(id);
                const hardcodedAccessibility = getAccessibilityAdvice(id);

                // Merge and format
                const tips = markdownTips.length > 0 ? formattedMarkdownTips : hardcodedTips.map((t, idx) => ({
                    id: `legacy-station-${id}-${idx}`,
                    icon: t.icon,
                    content: t.text,
                    type: t.category,
                    section: '專家建議 (Expert Tips)',
                    priority: 50 // Default legacy priority
                }));

                // Translate tips
                const translatedTips = await translateKnowledgeItems(tips, targetLocale);

                // Translate accessibility advice
                let translatedAccessibility = hardcodedAccessibility;
                if (hardcodedAccessibility && targetLocale !== 'zh-TW') {
                    const accEntries = Object.entries(hardcodedAccessibility);
                    const accItems = accEntries.map(([key, value]) => ({
                        id: `acc-${key}`,
                        content: value as string,
                        section: 'Accessibility'
                    }));
                    const translatedAccItems = await translateKnowledgeItems(accItems, targetLocale);
                    translatedAccessibility = {} as any;
                    translatedAccItems.forEach((item, idx) => {
                        const originalKey = accEntries[idx][0];
                        (translatedAccessibility as any)[originalKey] = item.content;
                    });
                }
                
                return NextResponse.json({
                    station_id: id,
                    tips: translatedTips,
                    accessibility: translatedAccessibility
                });
            }

            case 'accessibility': {
                if (!id) {
                    return NextResponse.json({ error: 'Missing station ID' }, { status: 400 });
                }
                const advice = getAccessibilityAdvice(id);
                if (!advice) {
                    return NextResponse.json({
                        station_id: id,
                        advice: null,
                        message: 'No accessibility data available for this station'
                    });
                }

                // Translate advice
                let translatedAdvice = advice;
                if (targetLocale !== 'zh-TW') {
                    const accEntries = Object.entries(advice);
                    const accItems = accEntries.map(([key, value]) => ({
                        id: `acc-${key}`,
                        content: value as string,
                        section: 'Accessibility'
                    }));
                    const translatedAccItems = await translateKnowledgeItems(accItems, targetLocale);
                    translatedAdvice = {} as any;
                    translatedAccItems.forEach((item, idx) => {
                        const originalKey = accEntries[idx][0];
                        (translatedAdvice as any)[originalKey] = item.content;
                    });
                }

                return NextResponse.json({
                    station_id: id,
                    advice: translatedAdvice
                });
            }

            case 'location': {
                if (!id) {
                    return NextResponse.json({ error: 'Missing location ID' }, { status: 400 });
                }
                const tips = getSpecialLocationTips(id);
                const translatedTips = await translateKnowledgeItems(
                    tips.map((t, i) => ({ id: `loc-${id}-${i}`, content: t.text, section: 'Location' })),
                    targetLocale
                );
                const resultTips = tips.map((t, i) => ({ ...t, text: translatedTips[i].content }));
                
                return NextResponse.json({
                    location_id: id,
                    tips: resultTips,
                    count: tips.length
                });
            }

            case 'passes': {
                const passes = getPassRecommendations();
                const passItems = passes.flatMap((p, i) => [
                    { id: `pass-name-${i}`, content: p.name, section: 'Pass Name' },
                    { id: `pass-cov-${i}`, content: p.coverage, section: 'Pass Coverage' },
                    { id: `pass-use-${i}`, content: p.whenToUse, section: 'Pass Usage' }
                ]);
                const translatedPassItems = await translateKnowledgeItems(passItems, targetLocale);
                
                const resultPasses = passes.map((p, i) => {
                    const baseIdx = i * 3;
                    return {
                        ...p,
                        name: translatedPassItems[baseIdx].content,
                        coverage: translatedPassItems[baseIdx + 1].content,
                        whenToUse: translatedPassItems[baseIdx + 2].content
                    };
                });

                return NextResponse.json({
                    passes: resultPasses,
                    count: passes.length
                });
            }

            case 'crowd': {
                const period = id as 'weekday-morning' | 'weekday-evening' | 'weekend' | 'holiday' || 'weekday-morning';
                const tips = getCrowdTips(period);
                const translatedTips = await translateKnowledgeItems(
                    tips.map((t, i) => ({ id: `crowd-${period}-${i}`, content: t.advice, section: 'Crowd' })),
                    targetLocale
                );
                const resultTips = tips.map((t, i) => ({ ...t, advice: translatedTips[i].content }));

                return NextResponse.json({
                    period,
                    tips: resultTips,
                    count: tips.length
                });
            }

            default:
                return NextResponse.json({
                    error: 'Invalid type. Supported types: railway, station, accessibility, location, passes, crowd',
                    supported_types: [
                        'railway - Get expert tips for a railway line',
                        'station - Get tips and accessibility advice for a station',
                        'accessibility - Get accessibility advice for a station',
                        'location - Get tips for special locations (airports, tourist spots)',
                        'passes - Get all pass recommendations',
                        'crowd - Get crowd avoidance tips (period: weekday-morning, weekday-evening, weekend, holiday)'
                    ]
                }, { status: 400 });
        }
    } catch (error) {
        console.error('[L4 API] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
