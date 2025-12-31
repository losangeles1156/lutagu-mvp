export type SupportedLocale = 'zh-TW' | 'en' | 'ja';

interface LLMParams {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
}

export async function generateLLMResponse(params: LLMParams): Promise<string | null> {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
        console.warn('Missing MISTRAL_API_KEY');
        return null;
    }

    const model = process.env.AI_SLM_MODEL || 'mistral-small-latest';
    const { systemPrompt, userPrompt, temperature = 0.2 } = params;

    try {
        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature
            })
        });

        if (!res.ok) {
            console.error(`Mistral API Error: ${res.statusText}`);
            return null;
        }

        const data: any = await res.json();
        const content = data?.choices?.[0]?.message?.content;

        return String(content || '').trim();

    } catch (error) {
        console.error('LLM API Call Failed:', error);
        return null;
    }
}
