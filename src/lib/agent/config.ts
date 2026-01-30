/**
 * Agent Feature Flags
 * 
 * Controls which agent version to use.
 * Set NEXT_PUBLIC_AGENT_V2=true to enable the new Agent 2.0 architecture.
 */

export const AGENT_CONFIG = {
    // Feature flag for Agent 2.0
    useAgentV2: process.env.NEXT_PUBLIC_AGENT_V2 === 'true',

    // Endpoints
    endpoints: {
        v1: '/api/agent/chat',
        v2: '/api/agent/v2',
        adk: '/api/agent/adk',
    },

    // Get the current endpoint based on feature flag
    get currentEndpoint() {
        return this.useAgentV2 ? this.endpoints.v2 : this.endpoints.v1;
    },

    // Agent 2.0 settings
    v2Settings: {
        maxSteps: 5,
        modelId: 'gemini-2.5-flash-preview-05-20',
    },
};
