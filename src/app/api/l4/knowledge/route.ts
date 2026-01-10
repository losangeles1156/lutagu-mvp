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
    
    try {
        switch (type) {
            case 'railway': {
                if (!id) {
                    return NextResponse.json({ error: 'Missing railway ID' }, { status: 400 });
                }
                const tips = getRailwayExpertTips(id);
                return NextResponse.json({ 
                    railway_id: id, 
                    tips,
                    count: tips.length 
                });
            }
            
            case 'station': {
                if (!id) {
                    return NextResponse.json({ error: 'Missing station ID' }, { status: 400 });
                }
                
                // Get hardcoded tips
                const hardcodedTips = getHubStationTips(id);
                const hardcodedAccessibility = getAccessibilityAdvice(id);
                
                // Get markdown-based tips
                const markdownTips = knowledgeService.getKnowledgeByStationId(id);
                
                // Merge and format
                const formattedMarkdownTips = markdownTips.map(k => ({
                    icon: k.icon,
                    text: k.content,
                    category: k.type,
                    section: k.section,
                    source: 'markdown_kb'
                }));

                return NextResponse.json({ 
                    station_id: id, 
                    tips: [...hardcodedTips, ...formattedMarkdownTips],
                    accessibility: hardcodedAccessibility,
                    markdown_knowledge: markdownTips,
                    tip_count: hardcodedTips.length + markdownTips.length,
                    has_accessibility: !!hardcodedAccessibility || markdownTips.some(k => k.type === 'accessibility')
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
