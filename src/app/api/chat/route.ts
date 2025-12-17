import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages, userLocation, zone } = body;

        // Use last message as query
        const lastMessage = messages[messages.length - 1]?.content || 'Hello';

        // Dify API Inputs
        const difyInputs = {
            current_zone: zone || 'unknown',
            user_location: userLocation ? `${userLocation.lat},${userLocation.lon}` : 'unknown'
        };

        let clientAnswer = "I'm having trouble connecting to the brain, but I can help locally.";
        let clientActions: any[] = [];
        let useMock = false;

        try {
            if (!process.env.DIFY_API_KEY) throw new Error('No Dify API Key');

            const response = await fetch(`${process.env.DIFY_API_URL}/chat-messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: difyInputs,
                    query: lastMessage,
                    response_mode: 'blocking',
                    user: 'bambigo-user-v2' // Hardcoded for MVP, should be real User ID
                })
            });

            if (!response.ok) {
                console.warn('Dify API Warning:', response.status);
                useMock = true; // Fallback to mock
            } else {
                const data = await response.json();
                const rawAnswer = data.answer;

                // Parse Structured JSON from Dify
                try {
                    const jsonMatch = rawAnswer.match(/\{[\s\S]*\}/);
                    const stringToParse = jsonMatch ? jsonMatch[0] : rawAnswer;
                    const parsed = JSON.parse(stringToParse);
                    if (parsed.message) clientAnswer = parsed.message;
                    if (parsed.action_cards && Array.isArray(parsed.action_cards)) clientActions = parsed.action_cards;
                } catch (e) {
                    clientAnswer = rawAnswer;
                }
            }
        } catch (difyError) {
            console.warn('Dify Connection Failed, using Mock:', difyError);
            useMock = true;
        }

        // --- MOCK LOGIC FOR DEMO ---
        // If no actions returned by AI, inject some based on keywords for MVP testing
        if (clientActions.length === 0) {
            const lowerMsg = lastMessage.toLowerCase();
            if (lowerMsg.includes('ueno') || lowerMsg.includes('上野')) {
                clientActions.push({
                    type: 'navigate',
                    label: '前往上野 (Go to Ueno)',
                    target: 'ueno',
                    metadata: { coordinates: [35.7141, 139.7774] }
                });
                clientActions.push({
                    type: 'details',
                    label: '查看車站詳情',
                    target: 'odpt:Station:TokyoMetro.Ueno'
                });
            }
            if (lowerMsg.includes('help') || lowerMsg.includes('東京')) {
                clientActions.push({
                    type: 'trip',
                    label: '東京車站一日遊',
                    target: 'plan_tokyo_1'
                });
            }
        }
        // ---------------------------

        return NextResponse.json({
            answer: clientAnswer,
            actions: clientActions
        });

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
