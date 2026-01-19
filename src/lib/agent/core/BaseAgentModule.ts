
import { IAgentMessage, IAgentContext, AgentLevel } from './types';

export abstract class BaseAgentModule {
    protected context: IAgentContext;

    constructor(context: IAgentContext) {
        this.context = context;
    }

    abstract getLevel(): AgentLevel;

    // Default handler, override in specific implementations
    async handle(message: IAgentMessage): Promise<any> {
        console.log(`[BaseAgent:${this.getLevel()}] Handling message`, message);
        return { status: 'acknowledged' };
    }
}
