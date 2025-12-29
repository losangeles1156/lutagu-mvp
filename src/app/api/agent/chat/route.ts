
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

        // 2. Format Context for Dify Variables (V2 Architecture: Tool Calling)
        // We only pass the station ID and user profile. The Agent fetches the rest.

        let currentStationId = profile.id;
        // Ensure ID is fully qualified if possible, or trust profile.id
        // profile.id from nodes table is usually 'odpt:Station:...'

        const contextInputs = {
            current_station: currentStationId,
            user_profile: clientInputs.user_profile || 'general'
        };

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
                query: messages[messages.length - 1].content,
                response_mode: 'streaming',
                conversation_id: conversation_id || '',
                user: 'bambi-user-v1',
                files: []
            })
        });

        if (!difyResponse.ok) {
            const errorText = await difyResponse.text();
            console.error('Dify API Error:', errorText);
            return NextResponse.json({ error: `Dify Error: ${difyResponse.statusText}` }, { status: difyResponse.status });
        }

        const stream = difyResponse.body;
        return new NextResponse(stream, {
            headers: { 'Content-Type': 'text/event-stream' }
        });

    } catch (error) {
        console.error('Agent API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

