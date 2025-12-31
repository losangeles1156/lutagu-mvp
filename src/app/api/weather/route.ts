import { NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/security/audit';

export async function GET(request: Request) {
    try {
        const response = await fetch('https://www.data.jma.go.jp/developer/xml/feed/extra.xml', {
            next: { revalidate: 300 } // Cache for 5 minutes
        });

        if (!response.ok) {
            throw new Error('Failed to fetch JMA RSS');
        }

        const xml = await response.text();

        // Simple Regex Parser for Entry tags
        const entries: any[] = [];
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let match;

        while ((match = entryRegex.exec(xml)) !== null) {
            const content = match[1];
            const title = content.match(/<title>(.*?)<\/title>/)?.[1] || '';
            const summary = content.match(/<content type="text">([\s\S]*?)<\/content>/)?.[1] ||
                content.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || '';
            const updated = content.match(/<updated>(.*?)<\/updated>/)?.[1] || '';

            // 0. Normalize full-width characters to half-width for consistent matching
            const normalize = (s: string) => s.replace(/[！-～]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0xfee0));
            const normTitle = normalize(title);
            const normSummary = normalize(summary);

            // [Phase 1] Pre-filter: Only alerts mentioning relevant Prefectures
            const isTokyo = normTitle.includes('東京') || normSummary.includes('東京');
            const isKanagawa = normTitle.includes('神奈川') || normSummary.includes('神奈川');
            const isChiba = normTitle.includes('千葉') || normSummary.includes('千葉');

            if (!isTokyo && !isKanagawa && !isChiba) {
                continue;
            }

            // [Phase 2] Strict Region Filter: 
            const text = (normTitle + normSummary).replace(/\s/g, '');

            // 1. Exclude islands completely if no target region is mentioned
            const isIslandMentioned = text.includes('伊豆諸島') || text.includes('小笠原諸島');
            
            // 2. Core Target Regions
            const isTargetRegion = 
                text.includes('東京地方') || 
                text.includes('23区') ||
                text.includes('多摩') ||
                text.includes('神奈川県') || 
                text.includes('千葉県');

            // Logic:
            // - If it's an island-only alert, skip.
            // - If it's not in our target regions, skip.
            if (isIslandMentioned && !isTargetRegion) {
                continue;
            }
            if (!isTargetRegion) {
                continue;
            }

            // Extra safety: even if islands are mentioned alongside target regions, 
            // we should double check if the target region itself has a warning.
            // (JMA sometimes lists all regions in one report)
            const hasWarningInTarget = text.match(/(東京地方|23区|多摩|神奈川県|千葉県).*?では.*?(警報|注意|特別警報)/);
            const isEarthquake = normTitle.includes('震度') || normTitle.includes('地震') || normSummary.includes('震度');
            
            if (!hasWarningInTarget && !isEarthquake) {
                continue;
            }

            // [Phase 3] Special warnings always pass (earthquake, special警報)
            const isSpecialWarning = title.includes('特別警報') || title.includes('震度');

            // Determine severity
            let severity: 'info' | 'warning' | 'critical' = 'info';
            if (isSpecialWarning || title.includes('重大')) {
                severity = 'critical';
            } else if (title.includes('警報') || title.includes('注意報')) {
                severity = 'warning';
            }

            entries.push({
                title,
                summary: summary.replace(/&lt;br \/&gt;/g, '\n').trim(),
                updated,
                severity
            });
        }

        // Return the most relevant alert (or all)
        return NextResponse.json({
            alerts: entries,
            source: 'Japan Meteorological Agency (JMA)',
            fetchedAt: new Date().toISOString()
        });

    } catch (error: any) {
        void writeAuditLog(request, {
            actorUserId: null,
            action: 'create',
            resourceType: 'weather_alerts',
            resourceId: 'tokyo',
            before: null,
            after: {
                ok: false,
                upstream: 'jma_rss',
                error: String(error?.message || error || '')
            }
        });
        console.error('Weather API Error:', error.message);
        return NextResponse.json({ alerts: [], error: 'Failed to fetch weather data' }, { status: 500 });
    }
}
