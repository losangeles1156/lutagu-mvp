/**
 * Agent Feature Flags
 * 
 * Controls which agent version to use.
 * Set NEXT_PUBLIC_AGENT_V2=true to enable the new Agent 2.0 architecture.
 */

export const AGENT_CONFIG = {
    // Endpoints
    endpoints: {
        v2: '/api/agent/v2',
        adk: '/api/agent/adk',
    },

    // Production path is Go ADK. v2 is archived fallback only.
    get currentEndpoint() {
        const forcedPath = (process.env.NEXT_PUBLIC_AGENT_PATH || 'adk').toLowerCase();
        if (forcedPath === 'v2') return this.endpoints.v2;
        return this.endpoints.adk;
    },

    // Agent 2.0 settings
    v2Settings: {
        maxSteps: 5,
        modelId: 'gemini-2.5-flash-preview-05-20',
    },
};
