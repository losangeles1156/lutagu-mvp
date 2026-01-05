import { NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/security/audit';
import { WEATHER_REGION_POLICY } from '@/lib/weather/policy';
import { generateLLMResponse } from '@/lib/ai/llmClient';
import { supabaseAdmin } from '@/lib/supabase';
import { createHash } from 'crypto';

// Helper to translate/summarize alert using AI with Caching
async function getTranslatedAlert(title: string, summary: string, updated: string, severity: string) {
    // 1. Create content hash
    const hash = createHash('md5').update(`${title}:${updated}:${summary}:${severity}`).digest('hex');
    const cacheKey = `weather:v1:${hash}`;

    // 2. Check Cache
    const { data: cached } = await supabaseAdmin
        .from('l2_cache')
        .select('value')
        .eq('key', cacheKey)
        .maybeSingle();

    if (cached?.value) {
        return cached.value;
    }

    // 3. Call AI if miss
    console.log(`[WeatherAPI] Cache miss for ${hash}. Calling AI...`);

    // Fallback default
    const fallback = {
        ja: summary,
        en: 'Detailed weather information is available in Japanese.',
        zh: '詳細天氣資訊僅提供日文版本。'
    };

    try {
        // Adjust translation style based on severity
        const severityConfig = {
            critical: {
                style: '緊急、簡潔、嚴肅',
                maxLength: 30
            },
            warning: {
                style: '謹慎、清晰、實用',
                maxLength: 40
            },
            advisory: {
                style: '溫和、友善、提醒',
                maxLength: 50
            },
            info: {
                style: '中性、資訊性',
                maxLength: 60
            }
        };

        const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.info;

        const prompt = `
You are a weather translator for a travel app in Tokyo.
Translate and summarize the following JMA Weather Alert into a strictly valid JSON object.

Severity Level: ${severity}
Style Requirement: ${config.style} (max ${config.maxLength} characters per language)

Input Title: ${title}
Input Summary: ${summary}

Response Format:
{
  "ja": "...",
  "en": "...",
  "zh": "..."
}

Important Rules:
1. For critical/warning alerts: Be clear but NOT alarmist. State facts and recommended actions.
2. For advisory/info alerts: Be friendly and helpful.
3. Do NOT use exaggerated language like "DANGER!" or "STAY INSIDE!"
4. Output only raw JSON, no markdown formatting.
`;
        const jsonStr = await generateLLMResponse({
            systemPrompt: 'Output raw JSON only. No markdown formatting.',
            userPrompt: prompt,
            temperature: 0.1
        });

        if (!jsonStr) return fallback;

        // Clean up markdown code blocks if present
        const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        // Validate structure
        if (!parsed.ja || !parsed.en || !parsed.zh) throw new Error('Invalid JSON structure');

        // 4. Write to Cache
        await supabaseAdmin.from('l2_cache').insert({
            key: cacheKey,
            value: parsed,
            updated_at: new Date().toISOString()
        });

        return parsed;

    } catch (e) {
        console.error('[WeatherAPI] AI Translation Failed:', e);
        return fallback;
    }
}

export async function GET(request: Request) {
    const startTime = Date.now();
    try {
        const response = await fetch('https://www.data.jma.go.jp/developer/xml/feed/extra.xml', {
            next: { revalidate: 300 }
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

            // Apply Strict Region Policy (includes cross-contamination fix)
            if (!WEATHER_REGION_POLICY.isTargetRegion(title, summary)) {
                continue;
            }

            // Determine severity using the new granular classification
            const severity = WEATHER_REGION_POLICY.getSeverity(title, summary);
            const severityLabel = WEATHER_REGION_POLICY.getSeverityLabel(severity);

            // Clean summary for display/AI
            const cleanSummary = summary.replace(/<br \/>/g, '\n').trim();

            // Get AI Translation with severity-aware prompting
            const polyglotSummary = await getTranslatedAlert(title, cleanSummary, updated, severity);

            entries.push({
                title,
                original_summary: cleanSummary,
                summary: polyglotSummary,
                updated,
                severity,
                severity_label: severityLabel, // Human-readable label
                urgency: WEATHER_REGION_POLICY.severityToUrgency[severity],
                color: WEATHER_REGION_POLICY.severityToColor[severity],
                alert_type: WEATHER_REGION_POLICY.extractAlertType(title),
                region: WEATHER_REGION_POLICY.extractRegion(title, cleanSummary)
            });
        }

        // Sort by urgency (highest first)
        entries.sort((a, b) => b.urgency - a.urgency);

        const responseTime = Date.now() - startTime;
        console.log(`[WeatherAPI] ${entries.length} alerts, response time: ${responseTime}ms`);

        return NextResponse.json({
            alerts: entries,
            source: 'Japan Meteorological Agency (JMA)',
            fetchedAt: new Date().toISOString(),
            response_time_ms: responseTime
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
