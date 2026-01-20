export type SupportedLocale = 'zh-TW' | 'zh' | 'en' | 'ja';

export interface LLMParams {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    // Expanded task types for Trinity Architecture
    taskType?: 'reasoning' | 'synthesis' | 'context_heavy' | 'classification' | 'simple' | 'chat';
    model?: string; // Explicit model override
    maxTokens?: number;
}

function resolveTimeoutMs(taskType: LLMParams['taskType'] | undefined) {
    if (taskType === 'classification' || taskType === 'simple') return 20000;
    if (taskType === 'chat' || taskType === 'synthesis') return 30000;
    if (taskType === 'reasoning' || taskType === 'context_heavy') return 45000;
    return 30000;
}

function resolveMaxTokens(params: LLMParams) {
    if (typeof params.maxTokens === 'number' && Number.isFinite(params.maxTokens) && params.maxTokens > 0) {
        return Math.floor(params.maxTokens);
    }
    const taskType = params.taskType;
    if (taskType === 'classification' || taskType === 'simple') return 200;
    if (taskType === 'chat' || taskType === 'synthesis') return 700;
    if (taskType === 'reasoning' || taskType === 'context_heavy') return 600;
    return 400;
}

export async function generateLLMResponse(params: LLMParams): Promise<string | null> {
    const { taskType = 'reasoning', model: explicitModel } = params;

    // 0. Explicit model override (highest priority)
    if (explicitModel) {
        // Route deepseek models (including deepseek-v3.2) via Zeabur generic endpoint
        if (explicitModel.includes('deepseek')) return generateZeaburGenericResponse(params);
        if (explicitModel.includes('gemini')) return generateGeminiResponse(params);
        if (explicitModel.toLowerCase().includes('minimax')) return generateMiniMaxResponse(params);
        // Route GPT models (gpt-5-mini, etc.) via Zeabur generic endpoint
        if (explicitModel.includes('gpt')) return generateZeaburGenericResponse(params);
    }

    // --- Trinity Architecture Strategy ---

    // 1. Router / Simple / Classification -> Gemini 2.5 Flash-Lite (Fastest & Cheapest)
    if (taskType === 'classification' || taskType === 'simple') {
        return generateGeminiResponse({ ...params, model: 'gemini-2.5-flash-lite' });
    }

    // 2. Logic / Reasoning / Precision -> Gemini 2.0 Flash Exp
    if (taskType === 'reasoning' || taskType === 'context_heavy') {
        const result = await generateGeminiResponse({ ...params, model: 'gemini-3-flash-preview' });
        // Fallback to MiniMax-M2.1 if Gemini 2.0 fails (User Request: backup role)
        if (!result && process.env.MINIMAX_API_KEY) {
            console.warn('[LLM] Gemini 2.0 Flash failed, falling back to MiniMax M2.1');
            return generateMiniMaxResponse(params);
        }
        return result;
    }

    // 3. Chat / Creative / Long Output -> DeepSeek V3.2 (Zeabur AI Hub - High CP Value)
    if (taskType === 'synthesis' || taskType === 'chat') {
        // DeepSeek V3.2 via Zeabur AI Hub (corrected model name)
        return generateZeaburGenericResponse({ ...params, model: 'deepseek-v3.2' });
    }

    // 4. Default Fallback
    return generateGeminiResponse({ ...params, model: 'gemini-2.5-flash-lite' });
}

// ... existing MiniMax function ...
async function generateMiniMaxResponse(params: LLMParams): Promise<string | null> {
    // ... keep existing code ...
    const { systemPrompt, userPrompt, temperature = 0.2 } = params;
    const endpoint = 'https://api.minimax.io/v1/chat/completions';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), resolveTimeoutMs(params.taskType));
    const maxTokens = resolveMaxTokens(params);

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
                temperature,
                max_tokens: maxTokens
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            console.error(`[MiniMax] API Error ${res.status}`);
            return null;
        }
        const data: any = await res.json();
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
    const { systemPrompt, userPrompt, temperature = 0.2, model = 'gemini-2.5-flash-lite' } = params;

    // Strict model mapping for Zeabur AI Hub
    // Supported: gemini-3-flash-preview, gemini-2.5-flash-lite, gemini-2.5-flash, gemini-2.5-pro, gemini-1.5-pro
    let targetModel = model;

    // Legacy mapping (just in case)
    if (model.includes('1.5-flash')) targetModel = 'gemini-2.5-flash-lite';

    try {
        // Zeabur AI Hub (Tokyo Node)
        const endpoint = `https://hnd1.aihub.zeabur.ai/v1/chat/completions`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), resolveTimeoutMs(params.taskType));
        const maxTokens = resolveMaxTokens(params);

        // Use Zeabur Key for Gemini LLM models (avoid free API rate limits), fallback to Google AI
        const apiKey = process.env.ZEABUR_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}` // Zeabur requires sk-...
            },
            body: JSON.stringify({
                model: targetModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature,
                max_tokens: maxTokens
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            const errText = await res.text();
            console.error(`Gemini API Error (${targetModel}):`, res.status, errText);

            // Fallback for 429 to Lite if using heavy model
            if (res.status === 429 && targetModel !== 'gemini-2.5-flash-lite') {
                console.warn('Rate limit hit, retrying with Flash Lite...');
                return generateGeminiResponse({ ...params, model: 'gemini-2.5-flash-lite' });
            }
            return null;
        }

        const data: any = await res.json();
        let content = data?.choices?.[0]?.message?.content || null;
        if (content) content = content.replace(/\[THINKING\][\s\S]*?\[\/THINKING\]/g, '').trim();
        return content;
    } catch (error) {
        console.error('Gemini API Failed:', error);
        return null;
    }
}

/**
 * Generic Zeabur AI Hub handler for non-Gemini models (e.g., deepseek-v3.2, gpt-5-mini)
 */
async function generateZeaburGenericResponse(params: LLMParams): Promise<string | null> {
    const { systemPrompt, userPrompt, temperature = 0.4, model } = params;

    if (!model) {
        console.error('[Zeabur Generic] No model specified');
        return null;
    }

    const endpoint = `https://hnd1.aihub.zeabur.ai/v1/chat/completions`;
    const apiKey = process.env.ZEABUR_API_KEY || process.env.GEMINI_API_KEY;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), resolveTimeoutMs(params.taskType));
    const maxTokens = resolveMaxTokens(params);

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
                temperature,
                max_tokens: maxTokens
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[Zeabur Generic] API Error (${model}):`, res.status, errText);
            return null;
        }

        const data: any = await res.json();
        let content = data?.choices?.[0]?.message?.content || null;
        if (content) content = content.replace(/\[THINKING\][\s\S]*?\[\/THINKING\]/g, '').trim();
        return content;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error(`[Zeabur Generic] Request Timeout (${model})`);
        } else {
            console.error(`[Zeabur Generic] API Call Failed (${model}):`, error);
        }
        return null;
    }
}

async function generateDeepSeekResponse(params: LLMParams): Promise<string | null> {
    const { systemPrompt, userPrompt, temperature = 0.4 } = params;

    // Zeabur AI Hub supports DeepSeek via same endpoint
    const endpoint = `https://hnd1.aihub.zeabur.ai/v1/chat/completions`;
    // Use dedicated DeepSeek key (lutagu-mvp) or fallback to main Zeabur key
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.ZEABUR_API_KEY || process.env.GEMINI_API_KEY;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), resolveTimeoutMs(params.taskType));
    const maxTokens = resolveMaxTokens(params);

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'deepseek-v3', // Standard name for V3
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
                temperature,
                max_tokens: maxTokens
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            const errText = await res.text();
            console.error('[DeepSeek] API Error:', res.status, errText);
            // Fallback for 429/Error
            if (res.status === 429 || res.status >= 500) {
                console.warn('[DeepSeek] Falling back to Gemini 3 due to server error/limit');
                return generateGeminiResponse({ ...params, model: 'gemini-3-flash-preview' });
            }
            return null;
        }

        const data: any = await res.json();
        let content = data?.choices?.[0]?.message?.content || null;
        if (content) content = content.replace(/\[THINKING\][\s\S]*?\[\/THINKING\]/g, '').trim();
        return content;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error('[DeepSeek] Request Timeout');
        } else {
            console.error('[DeepSeek] API Call Failed:', error);
        }
        return null;
    }
}

// Remove Mistral legacy function to save space if not used, or keep as dead code.
// Keeping strictly requested changes.
