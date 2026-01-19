
import { ITool, IToolRegistry } from './types';
import { AgentLevel } from '../core/types';

export class ToolRegistry implements IToolRegistry {
    private static instance: ToolRegistry;
    private tools: Map<string, ITool> = new Map();

    private constructor() {}

    static getInstance(): ToolRegistry {
        if (!ToolRegistry.instance) {
            ToolRegistry.instance = new ToolRegistry();
        }
        return ToolRegistry.instance;
    }

    register(tool: ITool): void {
        console.log(`[ToolRegistry] Registering tool: ${tool.id} (${tool.requiredLevel})`);
        this.tools.set(tool.id, tool);
    }

    getTool(id: string): ITool | undefined {
        return this.tools.get(id);
    }

    getToolsByLevel(level: AgentLevel): ITool[] {
        // Return tools that are AT or BELOW the requested level?
        // Or strictly matching?
        // Usually higher levels can access lower level tools.
        // Let's implement strict level matching for grouping, or access control.
        return Array.from(this.tools.values()).filter(t => t.requiredLevel === level);
    }

    canAccess(toolId: string, userLevel: AgentLevel): boolean {
        const tool = this.tools.get(toolId);
        if (!tool) return false;

        // Simple Level Hierarchy: L4 > L3 > L2 > L1
        const levels = [AgentLevel.L1_DNA, AgentLevel.L2_LIVE, AgentLevel.L3_FACILITY, AgentLevel.L4_STRATEGY];
        const toolIdx = levels.indexOf(tool.requiredLevel);
        const userIdx = levels.indexOf(userLevel);

        return userIdx >= toolIdx;
    }
}
