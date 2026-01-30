import { Router } from 'express';
import { hybridEngine, RequestContext } from '@/lib/l4/HybridEngine';
import { StrategyEngine } from '@/lib/ai/strategyEngine';
import { extractOdptStationIds } from '@/lib/l4/assistantEngine';
import { randomUUID } from 'crypto';
import { generateRequestId, getTimestamp, getElapsedMs, logAIChatMetric } from '@/lib/monitoring/performanceLogger';
import { CircuitBreaker } from '@/lib/utils/retry';

export const agentChatRouter = Router();

const strategyBreaker = new CircuitBreaker({
    name: 'strategy_engine',
    failureThreshold: 3,
    resetTimeoutMs: 20000,
    halfOpenSuccessThreshold: 1
});

agentChatRouter.post('/', async (req, res) => {
    try {
        const requestId = generateRequestId();
        const startTime = getTimestamp();
        const body = req.body;
        const locale = body.locale || 'zh-TW';
        const { text, locale: inputLocale, context: reqContext } = req.body; // Renamed 'context' to 'reqContext' to avoid conflict
        console.log('[AgentChat Debug] Request Received:', JSON.stringify({ text, locale: inputLocale }));

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

        const lastMessage = Array.isArray(body.messages)
            ? body.messages[body.messages.length - 1]
            : null;

        const query =
            extractText(body.text) ||
            extractText(body.input) ||
            extractText(body.prompt) ||
            extractText(body.message) ||
            extractText(lastMessage?.content ?? lastMessage?.parts ?? lastMessage?.text ?? lastMessage) ||
            'Hello';
        const rawNodeId = body.nodeId || body.current_station || body.currentStation || body.stationId;
        const userId = body.userId || `anon-${randomUUID()}`;
        const sessionId = body.sessionId || userId;

        const recentMessages = Array.isArray(body.messages)
            ? body.messages
                .map((m: any) => {
                    const role = m?.role === 'assistant' ? 'assistant' : 'user';
                    const content = extractText(m?.content ?? m?.parts ?? m?.text ?? m);
                    return content ? { role, content } : null;
                })
                .filter(Boolean)
                .slice(-8)
            : [];

        const recentText = recentMessages.map((m: any) => m?.content || '').join(' ');
        const inferredStations = extractOdptStationIds(`${query} ${recentText}`);
        const inferredStationId = inferredStations.length > 0 ? inferredStations[inferredStations.length - 1] : undefined;
        const nodeId = rawNodeId || inferredStationId;

        // Build Context
        const context: RequestContext = {
            userId: userId,
            currentStation: nodeId,
            userLocation: body.userLocation,
            preferences: { categories: [] },
            strategyContext: null
        } as any; // Cast to any to allow optional recentMessages field
        (context as any).recentMessages = recentMessages;

        // Strategy Synthesis (L4) logic
        if (!context.strategyContext) {
            try {
                if (context.userLocation) {
                    context.strategyContext = await strategyBreaker.execute(() =>
                        StrategyEngine.getSynthesis(context.userLocation.lat, context.userLocation.lng, locale)
                    );
                } else {
                    // Fallback: If nodeId is provided, we can try to look it up if StrategyEngine supports it in future.
                    // For now, proceed without strategy context if no lat/lon.
                }
            } catch (e) {
                console.error('[AgentChat] Strategy init failed:', e);
            }
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Request-Id', requestId);
        if (typeof res.flushHeaders === 'function') {
            res.flushHeaders();
        }

        let outputLength = 0;
        let hadError = false;
        let errorMessage: string | undefined;
        let decisionSource: string | undefined;
        let decisionType: string | undefined;
        let anomalyReason: string | undefined;
        let decisionLevel: string | undefined;
        let decisionConfidence: number | undefined;
        let matchedSkill: string | undefined;
        let agentTool: string | undefined;
        let dataMuxHit = false;
        let usedFallback = false;

        const inputHasAlphaNumeric = /[\p{L}\p{N}]/u.test(query);
        const inputHasCjk = /[\u4e00-\u9fa5\u3040-\u30ff]/.test(query);
        const inputHasEmoji = /\p{Extended_Pictographic}/u.test(query);
        const inputIsEmojiOnly = inputHasEmoji && !inputHasAlphaNumeric && !inputHasCjk;
        const inputIsCjkOnly = inputHasCjk && !inputHasAlphaNumeric;

        const sendUpdate = (delta: string) => {
            if (!delta) return;
            outputLength += delta.length;
            res.write(delta);
        };

        const sendThinking = (step: string) => {
            sendUpdate(`[THINKING]${step}[/THINKING]\n`);
        };

        try {
            const trimmedQuery = String(query || '').trim();
            if (!trimmedQuery) {
                const msg = locale === 'en' ? "Please enter your question again." : '請重新輸入問題。';
                sendUpdate(msg);
                res.end();
                return;
            }

            sendThinking(locale === 'en' ? 'Thinking...' : '思考中...');

            let streamedAnyToken = false;

            const result = await hybridEngine.processRequest({
                text: trimmedQuery,
                locale,
                context,
                onProgress: (step) => sendThinking(step),
                onToken: (delta) => {
                    streamedAnyToken = true;
                    sendUpdate(delta);
                }
            });

            if (result) {
                decisionSource = result.source;
                decisionType = result.type;
                if (result.reasoning?.startsWith('Anomaly detection:')) {
                    anomalyReason = result.reasoning.replace('Anomaly detection:', '').trim();
                }
                const logs = Array.isArray(result.reasoningLog) ? result.reasoningLog : [];
                for (const entry of logs) {
                    const intentMatch = entry.match(/\[Intent\] Classified Level: (\w+) \(Conf: ([0-9.]+)\)/);
                    if (intentMatch) {
                        decisionLevel = intentMatch[1];
                        decisionConfidence = Number(intentMatch[2]);
                    }
                    const skillMatch = entry.match(/\[Deep Research\] Legacy Skill Triggered: (.+)$/);
                    if (skillMatch) {
                        matchedSkill = skillMatch[1];
                    }
                    const agentMatch = entry.match(/\[Deep Research\] Agent Decision: ([^\s]+) /);
                    if (agentMatch) {
                        agentTool = agentMatch[1];
                    }
                    if (entry.includes('DataMux enriched content found')) dataMuxHit = true;
                    if (entry.includes('[Fallback] Delegating to LLM Service')) usedFallback = true;
                }
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
            hadError = true;
            errorMessage = error?.message || String(error);
            const msg = locale === 'en' ? 'Service temporarily unavailable.' : '服務暫時無法使用。';
            sendUpdate(msg);
        } finally {
            const responseTimeMs = getElapsedMs(startTime);
            logAIChatMetric({
                requestId,
                sessionId,
                nodeId,
                locale,
                responseTimeMs,
                inputLength: typeof query === 'string' ? query.length : 0,
                outputLength,
                hadError,
                errorMessage,
                metadata: {
                    decisionSource,
                    decisionType,
                    decisionLevel,
                    decisionConfidence,
                    matchedSkill,
                    agentTool,
                    dataMuxHit,
                    usedFallback,
                    anomalyReason,
                    anomalyDetected: Boolean(anomalyReason),
                    hasStrategyContext: Boolean(context.strategyContext),
                    inputHasAlphaNumeric,
                    inputHasCjk,
                    inputHasEmoji,
                    inputIsEmojiOnly,
                    inputIsCjkOnly
                }
            });

            // === Performance Alerts ===
            const SLOW_THRESHOLD_MS = 15000;
            if (responseTimeMs > SLOW_THRESHOLD_MS) {
                console.warn(`[AgentChat] SLOW_RESPONSE: ${responseTimeMs}ms (threshold: ${SLOW_THRESHOLD_MS}ms)`, {
                    requestId,
                    query: query.substring(0, 50),
                    decisionSource,
                    usedFallback
                });
            }
            if (hadError) {
                console.error(`[AgentChat] ERROR_ALERT:`, { requestId, errorMessage });
            }

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
