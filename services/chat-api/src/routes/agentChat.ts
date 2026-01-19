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

        const sendUpdate = (delta: string) => {
            if (!delta) return;
            res.write(delta);
        };

        const sendThinking = (step: string) => {
            sendUpdate(`[THINKING]${step}[/THINKING]\n`);
        };

        try {
            sendThinking(locale === 'en' ? 'Thinking...' : '思考中...');

            let streamedAnyToken = false;

            const result = await hybridEngine.processRequest({
                text: query,
                locale,
                context,
                onProgress: (step) => sendThinking(step),
                onToken: (delta) => {
                    streamedAnyToken = true;
                    sendUpdate(delta);
                }
            });

            if (result) {
                // Note: reasoning field is for internal logging only, not sent to users
                // Only send content to prevent debug info leakage (Fixed: Issue #AI-CHAT-001)
                if (!streamedAnyToken && result.content) {
                    sendUpdate(result.content);
                }

                // Log reasoning internally for debugging (not exposed to users)
                if (result.reasoning && process.env.NODE_ENV === 'development') {
                    console.log('[Debug] Reasoning:', result.reasoning);
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
