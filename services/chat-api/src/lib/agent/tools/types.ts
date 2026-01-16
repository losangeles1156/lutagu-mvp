
import { AgentLevel } from '../core/types';

export interface IToolContext {
    userId?: string;
    nodeId: string;
    level?: AgentLevel; // Made optional for flexibility
    userProfile?: string;
    locale?: string;
    timestamp?: number;
}

export interface ITool {
    id: string;
    name: string;
    description: string;
    requiredLevel: AgentLevel;
    
    execute(params: any, context: IToolContext): Promise<any>;
}

export interface IToolRegistry {
    register(tool: ITool): void;
    getTool(id: string): ITool | undefined;
    getToolsByLevel(level: AgentLevel): ITool[];
    canAccess(toolId: string, userLevel: AgentLevel): boolean;
}
