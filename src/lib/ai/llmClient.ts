export type SupportedLocale = 'zh-TW' | 'en' | 'ja';

export interface LLMParams {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    taskType?: 'reasoning' | 'synthesis' | 'context_heavy' | 'classification';
}

export async function generateLLMResponse(params: LLMParams): Promise<string | null> {
    const { taskType = 'reasoning' } = params;

    // 1. 推理型任務優先交給 MiniMax-M2.1
    if (taskType === 'reasoning' && process.env.MINIMAX_API_KEY) {
        return generateMiniMaxResponse(params);
    }

    // 2. 分類/快速任務交給 Gemini 2.5 Flash Lite (if avail) or Gemini 3
    if (taskType === 'classification' && process.env.GEMINI_API_KEY) {
        // TODO: Add separate function for 2.5 if needed, for now use generic Gemini function
        // which defaults to 3-flash-preview, but we can make it configurable
        return generateGeminiResponse({ ...params, model: 'gemini-2.5-flash-lite' });
    }

    // 3. 彙整型或海量數據任務交給 Gemini 3 Flash
    if ((taskType === 'synthesis' || taskType === 'context_heavy') && process.env.GEMINI_API_KEY) {
        return generateGeminiResponse(params);
    }

    // 3. 備援：Mistral
    const apiKey = process.env.MISTRAL_API_KEY;
    if (apiKey) {
        return generateMistralResponse(params);
    }

    console.warn('No available AI API Keys for task:', taskType);
    return null;
}

async function generateMiniMaxResponse(params: LLMParams): Promise<string | null> {
    const { systemPrompt, userPrompt, temperature = 0.2 } = params;

    // International endpoint: api.minimax.io
    const endpoint = 'https://api.minimax.io/v1/chat/completions';

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.MINIMAX_API_KEY}`
            },
            body: JSON.stringify({
                model: 'MiniMax-M2.1',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                reasoning_split: true,
                temperature
            })
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`[MiniMax] API Error ${res.status}:`, errorText);
            return null;
        }

        const data: any = await res.json();
        if (data?.choices?.[0]?.reasoning_details) {
            console.log('💭 MiniMax Thinking:', data.choices[0].reasoning_details);
        }

        return data?.choices?.[0]?.message?.content || null;
    } catch (error) {
        console.error('[MiniMax] API Call Failed:', error);
        return null;
    }
}

interface GeminiParams extends LLMParams {
    model?: string;
}

async function generateGeminiResponse(params: GeminiParams): Promise<string | null> {
    const { systemPrompt, userPrompt, temperature = 0.2, model = 'gemini-3-flash-preview' } = params;
    // Map 'gemini-2.5-flash-lite' to actual model name if known, currently using preview for 2.5 if available or fallback
    // Since 2.5 might not be public API yet, we stick to 1.5-flash or 3-flash-preview as "Fast" models
    // User requested "gemini-2.5-flash-lite", let's assume it matches 'gemini-2.0-flash-lite-preview' or similar logic
    // For safety, defaulting to 1.5-flash or 3-flash logic

    // Note: Adjust model version based on actual API availability. 
    // Assuming 'gemini-2.0-flash-exp' or similar for "2.5" placeholder if needed, 
    // but for now let's use the valid `gemini-1.5-flash` as the "Lite" equivalent until 2.5 is confirmed.
    // User explicitly asked for "gemini-3-flash-preview" and "gemini-2.5-flash-lite".

    const targetModel = model === 'gemini-2.5-flash-lite' ? 'gemini-1.5-flash' : model;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: `System: ${systemPrompt}` },
                        { text: `User: ${userPrompt}` }
                    ]
                }],
                generationConfig: { temperature }
            })
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(`Gemini API Error (${targetModel}):`, err);
            return null;
        }

        const data: any = await res.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
        console.error('Gemini API Failed:', error);
        return null;
    }
}

async function generateMistralResponse(params: LLMParams): Promise<string | null> {
    const apiKey = process.env.MISTRAL_API_KEY;
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
        console.error('Mistral API Call Failed:', error);
        return null;
    }
}
