
import { supabase } from '@/lib/supabase';
import { INodeActor, NodeType, IAgentMessage, AgentLevel } from './types';
import { BaseAgentModule } from './BaseAgentModule';

// Registry Pattern to manage Node Instances
export class NodeRegistry {
    private static instance: NodeRegistry;
    private nodes: Map<string, NodeActor> = new Map();

    private constructor() {}

    static getInstance(): NodeRegistry {
        if (!NodeRegistry.instance) {
            NodeRegistry.instance = new NodeRegistry();
        }
        return NodeRegistry.instance;
    }

    async getNode(nodeId: string): Promise<NodeActor | null> {
        if (this.nodes.has(nodeId)) {
            return this.nodes.get(nodeId)!;
        }

        // Lazy Load from DB
        const { data, error } = await supabase
            .from('nodes')
            .select('*')
            .eq('id', nodeId)
            .single();

        if (error || !data) {
            console.error(`NodeRegistry: Node ${nodeId} not found.`);
            return null;
        }

        const actor = new NodeActor(data);
        await actor.initialize(); // Load children links
        this.nodes.set(nodeId, actor);
        return actor;
    }
}

export class NodeActor implements INodeActor {
    id: string;
    type: NodeType;
    parentId: string | null;
    childrenIds: string[] = [];
    
    // Modules
    private modules: Map<AgentLevel, BaseAgentModule> = new Map();

    constructor(dbRecord: any) {
        this.id = dbRecord.id;
        this.type = dbRecord.node_type === 'hub' ? NodeType.HUB : NodeType.SPOKE;
        this.parentId = dbRecord.parent_hub_id;
    }

    async initialize() {
        // Load Children if Hub
        if (this.type === NodeType.HUB) {
            const { data } = await supabase
                .from('nodes')
                .select('id')
                .eq('parent_hub_id', this.id);
            if (data) {
                this.childrenIds = data.map(d => d.id);
            }
        }
    }

    async receiveMessage(msg: IAgentMessage): Promise<IAgentMessage> {
        console.log(`[NodeActor:${this.id}] Received ${msg.type} from ${msg.from}`);
        
        // Route to appropriate module
        const agentModule = this.modules.get(msg.level);
        if (agentModule) {
            const result = await agentModule.handle(msg);
            return {
                from: this.id,
                to: msg.from,
                type: 'RESPONSE',
                payload: result,
                level: msg.level
            };
        }

        return {
            from: this.id,
            to: msg.from,
            type: 'RESPONSE',
            payload: { error: 'Module not supported' },
            level: msg.level
        };
    }

    async syncState(): Promise<void> {
        // Bidirectional Sync Logic
        // 1. If Hub, pull status from Children
        if (this.type === NodeType.HUB) {
            console.log(`[NodeActor:${this.id}] Syncing state from ${this.childrenIds.length} children...`);
            // In a real implementation, we would call children to get their status
            // For MVP, we might aggregate DB rows
        } 
        // 2. If Spoke, push status to Parent (or Parent pulls it)
        else if (this.parentId) {
            console.log(`[NodeActor:${this.id}] Notify parent ${this.parentId} of state change.`);
        }
    }

    getLevelHandler(level: AgentLevel) {
        return this.modules.get(level);
    }
    
    registerModule(level: AgentLevel, module: BaseAgentModule) {
        this.modules.set(level, module);
    }
}
