import { Router } from 'express';
import { hybridEngine, RequestContext } from '@/lib/l4/HybridEngine';
import { StrategyEngine } from '@/lib/ai/strategyEngine';
import { randomUUID } from 'crypto';

export const agentChatRouter = Router();

agentChatRouter.post('/', async (req, res) => {
    try {
        const body = req.body;
        const locale = body.locale || 'zh-TW';

        // Helper to extract text from various payload formats
        const extractText = (value: any): string => {
            if (!value) return '';
            if (typeof value === 'string') return value;
            if (Array.isArray(value)) {
                return value
                    .map((part) => {
                        if (!part) return '';
                        if (typeof part === 'string') return part;
                        if (typeof part?.text === 'string') return part.text;
                        if (typeof part?.content === 'string') return part.content;
                        if (Array.isArray(part?.content)) return extractText(part.content);
                        return '';
                    })
                    .join('')
                    .trim();
            }
            if (typeof value?.text === 'string') return value.text;
            if (typeof value?.content === 'string') return value.content;
            if (Array.isArray(value?.content)) return extractText(value.content);
            return '';
        };

        const query = extractText(body.text) || extractText(body.messages?.[body.messages?.length - 1]?.content) || 'Hello';
        const nodeId = body.nodeId || body.current_station || body.currentStation || body.stationId;
        const userId = body.userId || `anon-${randomUUID()}`;

        // Build Context
        const context: RequestContext = {
            userId: userId,
            currentStation: nodeId,
            userLocation: body.userLocation,
            preferences: { categories: [] },
            strategyContext: null
        };

        // Strategy Synthesis (L4) logic
        if (!context.strategyContext) {
            try {
                if (context.userLocation) {
                    context.strategyContext = await StrategyEngine.getSynthesis(context.userLocation.lat, context.userLocation.lng, locale);
                } else {
                    // Fallback: If nodeId is provided, we can try to look it up if StrategyEngine supports it in future.
                    // For now, proceed without strategy context if no lat/lon.
                }
            } catch (e) {
                console.error('[AgentChat] Strategy init failed:', e);
            }
        }

        // Set Headers for Streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // Helpers for Vercel AI SDK Data Protocol (Text Stream)
        // 0: text-start
        // 1: text-delta
        // 2: text-end (optional, closing stream implies end)

        const textId = 'text-1';

        // Send initial part
        res.write(`0:"${textId}"\n`);

        const sendUpdate = (delta: string) => {
            // Protocol: 1:"text_delta_content"\n
            // Need to JSON stringify the delta to escape newlines/quotes properly
            if (delta) {
                res.write(`0:${JSON.stringify(delta)}\n`);
            }
        };

        const sendThinking = (step: string) => {
            sendUpdate(`[THINKING]${step}[/THINKING]\n`);
        };

        try {
            sendThinking(locale === 'en' ? 'Thinking...' : '思考中...');

            const result = await hybridEngine.processRequest({
                text: query,
                locale,
                context,
                onProgress: (step) => sendThinking(step),
                onToken: (delta) => {
                    sendUpdate(delta);
                }
            });

            if (result) {
                if (result.reasoning) {
                    // Send final reasoning block if exists
                    sendUpdate(`[THINKING]${result.reasoning}[/THINKING]\n`);
                }
                // If the engine didn't stream tokens (e.g. from cache or logic), send content now
                if (result.content && !result.reasoning) { // Simple check, usually onToken handles it for LLM
                    // Note: If onToken was called, appending content again might duplicate.
                    // HybridEngine should guarantee onToken calls for LLM. 
                    // For template/algorithm responses, they might not stream onToken.
                    // Let's rely on checking if onToken was ever called? 
                    // Actually, HybridEngine implementation calls onToken for LLM.
                    // For templates/others, it might just return result.
                    // Let's send result.content only if it's NOT LLM source (safe bet) or strictly check.
                    if (result.source !== 'llm') {
                        sendUpdate(result.content);
                    }
                } else if (result.source === 'llm' && !result.content) {
                    // LLM failed to produce content?
                }
            } else {
                const msg = locale === 'en' ? "I'm not sure, could you clarify?" : '抱歉，我不太理解您的意思。';
                sendUpdate(msg);
            }
        } catch (error: any) {
            console.error('[AgentChat] Process Error:', error);
            const msg = locale === 'en' ? 'Service temporarily unavailable.' : '服務暫時無法使用。';
            sendUpdate(msg);
        } finally {
            // End stream
            res.end();
        }

    } catch (error) {
        console.error('[AgentChat] Fatal Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.end();
        }
    }
});
