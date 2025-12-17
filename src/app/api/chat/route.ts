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
            console.error('Dify API Error:', response.status);
            throw new Error(`Dify API failed with status ${response.status}`);
        }

        const data = await response.json();
        const rawAnswer = data.answer;

        // Parse Structured JSON from Dify if possible
        // Expected Format: { message: "Text", action_cards: [...] }
        let clientAnswer = rawAnswer;
        let clientActions: any[] = [];

        try {
            // Attempt to parse if the LLM returned strict JSON string as requested
            // Depending on Dify setting, it might be wrapped in ```json ... ``` or just raw string
            // We'll try to find the JSON block if it exists
            const jsonMatch = rawAnswer.match(/\{[\s\S]*\}/);
            const stringToParse = jsonMatch ? jsonMatch[0] : rawAnswer;

            const parsed = JSON.parse(stringToParse);
            if (parsed.message) {
                clientAnswer = parsed.message;
            }
            if (parsed.action_cards && Array.isArray(parsed.action_cards)) {
                clientActions = parsed.action_cards;
            }
        } catch (e) {
            // If parsing fails, assuming it's just a plain text answer
            console.warn('Failed to parse Dify JSON, fallback to plain text.', e);
        }

        return NextResponse.json({
            answer: clientAnswer,
            actions: clientActions
        });

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
