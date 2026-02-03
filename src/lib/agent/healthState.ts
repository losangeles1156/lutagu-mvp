let fallbackCount = 0;
let lastFallbackAt: string | null = null;
let lastFallbackReason: string | null = null;
let lastErrorAt: string | null = null;
let lastErrorMessage: string | null = null;

export function recordAgentFallback(mode: string, reason?: string) {
    fallbackCount += 1;
    lastFallbackAt = new Date().toISOString();
    lastFallbackReason = reason ? `${mode}:${reason}` : mode;
}

export function recordAgentError(message: string) {
    lastErrorAt = new Date().toISOString();
    lastErrorMessage = message;
}

export function getAgentHealthSnapshot() {
    return {
        fallbackCount,
        lastFallbackAt,
        lastFallbackReason,
        lastErrorAt,
        lastErrorMessage
    };
}
