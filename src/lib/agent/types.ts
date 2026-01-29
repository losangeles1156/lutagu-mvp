export interface TodoItem {
    id: string;
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    activeForm?: string; // e.g. "Searching routes..."
}

export interface AgentPlan {
    id: string;           // Unique ID for plan tracking/updates
    title: string;
    items: TodoItem[];
    locale: string;       // Target locale for the plan
    updatedAt: string;    // ISO timestamp
}

export type SubagentType = 'explore' | 'routePlanner' | 'localExpert' | 'summarizer';

export const AGENT_TYPES: Record<SubagentType, {
    description: string;
    tools: string[];
    systemPrompt: string;
}> = {
    explore: {
        description: 'Read-only searching and analysis agent.',
        tools: ['getStationInfo', 'getWeather', 'searchPOI'],
        systemPrompt: 'You are a research subagent. Your goal is to explore and return a concise summary of your findings. DO NOT perform redundant planning.',
    },
    routePlanner: {
        description: 'Specialized transit route and fare calculation agent.',
        tools: ['findRoute'],
        systemPrompt: 'You are a route planning expert. Focus on providing accurate timing, transfers, and fare details for the requested journey.',
    },
    localExpert: {
        description: 'Tokyo local expert for POIs and hidden gems.',
        tools: ['searchPOI', 'getStationInfo'],
        systemPrompt: 'You are a local knowledge expert. Provide deep insights into neighborhoods, food, and culture. Use specialized skills when available.',
    },
    summarizer: {
        description: 'Pure text summarizer and rewriter.',
        tools: [], // No tools = Zeabur Candidate
        systemPrompt: 'You are a skilled summarizer. Distill the information provided into a concise, easy-to-read format. Do not add new facts.',
    },
};
