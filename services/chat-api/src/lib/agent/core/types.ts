
// Basic types for the Agent Framework

export enum AgentLevel {
    L1_DNA = 'L1', // Physical attributes, Location
    L2_LIVE = 'L2', // Real-time Status, Weather, Congestion
    L3_FACILITY = 'L3', // Services, Lockers, Toilets
    L4_STRATEGY = 'L4' // Decision Making, Vibe, Wisdom
}

export enum NodeType {
    HUB = 'hub',
    SPOKE = 'spoke'
}

export interface IAgentContext {
    userId?: string;
    sessionId?: string;
    timestamp: number;
    intent?: string;
}

export interface IAgentMessage {
    from: string;
    to: string;
    type: 'QUERY' | 'RESPONSE' | 'EVENT';
    payload: any;
    level: AgentLevel;
}

export interface INodeActor {
    id: string;
    type: NodeType;
    parentId: string | null;
    childrenIds: string[];
    
    // Core Methods
    receiveMessage(msg: IAgentMessage): Promise<IAgentMessage>;
    syncState(): Promise<void>;
    
    // Level specific handlers
    getLevelHandler(level: AgentLevel): any;
}
