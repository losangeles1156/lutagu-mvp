let fallbackCount = 0;
let lastFallbackAt: string | null = null;
let lastFallbackReason: string | null = null;
let lastErrorAt: string | null = null;
let lastErrorMessage: string | null = null;
const recentRuns: Array<{
    requestId: string;
    backend: string;
    toolCalls: string[];
    latencyMs: number;
    success: boolean;
    timestamp: string;
}> = [];

export function recordAgentFallback(mode: string, reason?: string) {
    fallbackCount += 1;
    lastFallbackAt = new Date().toISOString();
    lastFallbackReason = reason ? `${mode}:${reason}` : mode;
}

export function recordAgentError(message: string) {
    lastErrorAt = new Date().toISOString();
    lastErrorMessage = message;
}

export function recordAgentResult(input: {
    requestId: string;
    backend: string;
    toolCalls: string[];
    latencyMs: number;
    success: boolean;
}) {
    recentRuns.unshift({
        ...input,
        timestamp: new Date().toISOString()
    });
    if (recentRuns.length > 50) recentRuns.length = 50;
}

export function getAgentHealthSnapshot() {
    return {
        fallbackCount,
        lastFallbackAt,
        lastFallbackReason,
        lastErrorAt,
        lastErrorMessage,
        recentRuns: [...recentRuns]
    };
}
