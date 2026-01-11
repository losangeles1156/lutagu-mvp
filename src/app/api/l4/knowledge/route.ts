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

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    const minPriority = parseInt(searchParams.get('min_priority') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

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

                return NextResponse.json({
                    railway_id: id,
                    tips: combinedTips
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

                return NextResponse.json({
                    station_id: id,
                    tips: tips,
                    accessibility: hardcodedAccessibility
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
                return NextResponse.json({
                    station_id: id,
                    advice
                });
            }

            case 'location': {
                if (!id) {
                    return NextResponse.json({ error: 'Missing location ID' }, { status: 400 });
                }
                const tips = getSpecialLocationTips(id);
                return NextResponse.json({
                    location_id: id,
                    tips,
                    count: tips.length
                });
            }

            case 'passes': {
                const passes = getPassRecommendations();
                return NextResponse.json({
                    passes,
                    count: passes.length
                });
            }

            case 'crowd': {
                const period = id as 'weekday-morning' | 'weekday-evening' | 'weekend' | 'holiday' || 'weekday-morning';
                const tips = getCrowdTips(period);
                return NextResponse.json({
                    period,
                    tips,
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
