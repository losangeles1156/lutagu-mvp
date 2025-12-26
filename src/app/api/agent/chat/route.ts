
import { NextRequest, NextResponse } from 'next/server';
import { fetchNodeConfig } from '@/lib/api/nodes';
import { StationUIProfile } from '@/lib/types/stationStandard';
import { getStationWisdom } from '@/lib/odpt/knowledge_reader';

// Force dynamic to prevent caching of L2 data
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages, inputs, nodeId, conversation_id } = body;

        console.log('[API] Chat Request Received:', { nodeId, inputs });

        const clientInputs = inputs || {};

        // 1. Fetch Node Context (L2 + L3)
        // If nodeId is missing, we must handle it gracefully or default.
        if (!nodeId) {
            console.warn('[API] Warning: nodeId is missing in request.');
        }

        const { profile } = await fetchNodeConfig(nodeId || 'default');

        if (!profile) {
            console.error('[API] Error: Profile not found for nodeId:', nodeId);
            return NextResponse.json({ error: `Profile not found for nodeId: ${nodeId}` }, { status: 404 });
        }

        console.log('[API] Node Profile Fetched:', { name: profile.name?.en || profile.name?.ja || profile.id, id: profile.id });

        // 1.5 Fetch Static ODPT Knowledge (Timetables, Fares)
        const odptWisdom = await getStationWisdom(nodeId);

        // 2. Format Context for Dify Variables
        const contextInputs = prepareContextInputs(profile, inputs, odptWisdom);

        // 3. Call Dify API
        const difyApiKey = process.env.DIFY_API_KEY;
        const difyApiUrl = process.env.DIFY_API_URL;

        if (!difyApiKey || !difyApiUrl) {
            console.error('Missing Dify Env configuration');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const difyResponse = await fetch(`${difyApiUrl}/chat-messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${difyApiKey}`
            },
            body: JSON.stringify({
                inputs: contextInputs,
                query: messages[messages.length - 1].content, // Send the last user message
                response_mode: 'streaming',
                conversation_id: conversation_id || '',
                user: 'bambi-user-v1', // Simple user ID for now
                files: []
            })
        });

        if (!difyResponse.ok) {
            const errorText = await difyResponse.text();
            console.error('Dify API Error:', errorText);
            return NextResponse.json({ error: `Dify Error: ${difyResponse.statusText}` }, { status: difyResponse.status });
        }

        // 4. Stream the response back to frontend
        const stream = difyResponse.body;

        return new NextResponse(stream, {
            headers: { 'Content-Type': 'text/event-stream' }
        });

    } catch (error) {
        console.error('Agent API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Helper: Format Station Profile into Dify Variables
function prepareContextInputs(profile: StationUIProfile, clientInputs: any, odptWisdom: string) {
    // A. L2 Real-time (Constraints)
    const lines = profile.l2?.lines || [];
    let l2Status = "Status: ALL NORMAL\n";
    const delayedLines = lines.filter(l => l.status !== 'normal');
    if (delayedLines.length > 0) {
        l2Status = "Status: ⚠️ DELAYS / ISSUES\n";
        delayedLines.forEach(l => {
            l2Status += ` - ${l.name.en}: ${l.status.toUpperCase()} (${l.message?.en || ''})\n`;
        });
    }

    const w = profile.l2?.weather;
    const l2Weather = w ? `Weather: ${w.condition}, ${w.temp}°C` : "Weather: Unknown";

    // B. L3 Amenities (Structural Facts)
    const l3Summary = (profile.l3_facilities || []).map((f: any) => `- ${f.type}: ${f.location?.en || f.location || 'N/A'}`).join('\n');

    // C. Synthesis Construction
    // effectively merging "route_info" into a single powerful context blob for the prompt

    const synthesisContext = `
[L2: Real-time Context]
${l2Status}
${l2Weather}

[L3: Infrastructure & Amenities]
${l3Summary || "No detailed facility data."}

${odptWisdom}

[User Intent / Priority]
${clientInputs?.user_context || "General Inquiry"}
    `.trim();

    return {
        // Map these to the variables defined in your Dify Prompt
        current_station: profile.name?.en || profile.name?.ja || profile.id || 'Unknown Station',
        // We pass the synthesized blob into 'route_info' (or whatever variable your prompt uses for context)
        // If your Dify prompt expects separate 'realtime_status' / 'weather', we populate those too.
        realtime_status: l2Status,
        weather: l2Weather,
        route_info: synthesisContext, // This is the heavy lifter
        user_context: clientInputs?.user_context || "General Inquiry"
    };
}
