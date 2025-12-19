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
            // Check for n8n configuration first, then Dify (as fallback if direct mode desires, but we are switching entirely)
            // Ideally we rely on n8n to handle Dify.
            if (!process.env.N8N_WEBHOOK_URL) throw new Error('No N8N_WEBHOOK_URL configured');

            const response = await fetch(process.env.N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add authentication header if configured
                    ...(process.env.N8N_WEBHOOK_SECRET ? { 'Authorization': `Bearer ${process.env.N8N_WEBHOOK_SECRET}` } : {})
                },
                body: JSON.stringify({
                    messages: messages, // Send full history or just last message? n8n flow expects body.messages array access in our design
                    query: lastMessage,
                    userLocation,
                    zone,
                    user: 'bambigo-user-v2'
                })
            });

            if (!response.ok) {
                console.warn('n8n Webhook Warning:', response.status);
                useMock = true;
            } else {
                const data = await response.json();

                // Expecting n8n to return { answer: "...", actions: [...] }
                // Based on our n8n workflow design
                if (data.answer) clientAnswer = data.answer;
                if (data.actions && Array.isArray(data.actions)) clientActions = data.actions;

                // If n8n returns raw string or different format, strict typing might fail, 
                // but our n8n workflow ensures standard structure.
            }

        } catch (n8nError) {
            console.warn('n8n Connection Failed, attempting Mock override:', n8nError);
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
