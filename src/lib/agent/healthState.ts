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

const adkRecent: Array<{
    requestId: string;
    status: 'ok' | 'degraded' | 'failed';
    layer: 'proxy' | 'upstream-network' | 'upstream-http' | 'upstream-stream' | 'upstream-model' | 'upstream-tool' | 'unknown';
    reason: string;
    httpStatus?: number;
    latencyMs?: number;
    busyDetected: boolean;
    toolTraceCount: number;
    decisionTraceCount: number;
    errorEventCount: number;
    timestamp: string;
}> = [];

let adkLastDegradedAt: string | null = null;
let adkLastDegradedReason: string | null = null;
let adkFailureCount = 0;
let adkDegradedCount = 0;

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

export function recordAdkObservation(input: {
    requestId: string;
    status: 'ok' | 'degraded' | 'failed';
    layer: 'proxy' | 'upstream-network' | 'upstream-http' | 'upstream-stream' | 'upstream-model' | 'upstream-tool' | 'unknown';
    reason: string;
    httpStatus?: number;
    latencyMs?: number;
    busyDetected?: boolean;
    toolTraceCount?: number;
    decisionTraceCount?: number;
    errorEventCount?: number;
}) {
    if (input.status === 'failed') adkFailureCount += 1;
    if (input.status === 'degraded') {
        adkDegradedCount += 1;
        adkLastDegradedAt = new Date().toISOString();
        adkLastDegradedReason = `${input.layer}:${input.reason}`;
    }

    adkRecent.unshift({
        requestId: input.requestId,
        status: input.status,
        layer: input.layer,
        reason: input.reason,
        httpStatus: input.httpStatus,
        latencyMs: input.latencyMs,
        busyDetected: Boolean(input.busyDetected),
        toolTraceCount: input.toolTraceCount ?? 0,
        decisionTraceCount: input.decisionTraceCount ?? 0,
        errorEventCount: input.errorEventCount ?? 0,
        timestamp: new Date().toISOString()
    });
    if (adkRecent.length > 100) adkRecent.length = 100;
}

export function getAgentHealthSnapshot() {
    return {
        fallbackCount,
        lastFallbackAt,
        lastFallbackReason,
        lastErrorAt,
        lastErrorMessage,
        recentRuns: [...recentRuns],
        adk: {
            failureCount: adkFailureCount,
            degradedCount: adkDegradedCount,
            lastDegradedAt: adkLastDegradedAt,
            lastDegradedReason: adkLastDegradedReason,
            recent: [...adkRecent]
        }
    };
}
