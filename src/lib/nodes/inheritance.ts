// Logic for Hub/Spoke inheritance
import { supabase } from '../supabase';

export async function getEffectivePersona(nodeId: string) {
    // 1. Get current node
    const { data: node, error } = await supabase
        .from('nodes')
        .select('id, is_hub, persona_prompt, parent_hub_id')
        .eq('id', nodeId)
        .single();

    if (error || !node) return null;

    // 2. If Hub and has prompt, return it
    if (node.is_hub && node.persona_prompt) {
        return node.persona_prompt;
    }

    // 3. If Spoke, fetch parent hub's prompt
    if (node.parent_hub_id) {
        const { data: parent } = await supabase
            .from('nodes')
            .select('persona_prompt')
            .eq('id', node.parent_hub_id)
            .single();

        return parent?.persona_prompt || null;
    }

    return null;
}
