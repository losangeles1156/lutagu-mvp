import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// POST /api/admin/nodes/merge - 合併節點到 Hub
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const supabase = getSupabaseAdmin();

        const { child_node_ids, hub_node_id, action } = body;

        if (!hub_node_id) {
            return NextResponse.json(
                { error: 'hub_node_id is required' },
                { status: 400 }
            );
        }

        // 驗證 Hub 節點存在且是 Hub
        const { data: hubNode, error: hubError } = await supabase
            .from('nodes')
            .select('id, parent_hub_id')
            .eq('id', hub_node_id)
            .single();

        if (hubError || !hubNode) {
            return NextResponse.json(
                { error: 'Hub node not found' },
                { status: 404 }
            );
        }

        // Hub 節點不能是子節點
        if (hubNode.parent_hub_id) {
            return NextResponse.json(
                { error: 'Hub node cannot be a child of another node' },
                { status: 400 }
            );
        }

        let updatedCount = 0;
        const results: any[] = [];

        if (action === 'merge' && child_node_ids && Array.isArray(child_node_ids)) {
            // 合併多個子節點到 Hub
            for (const childId of child_node_ids) {
                // 驗證子節點存在
                const { data: childNode } = await supabase
                    .from('nodes')
                    .select('id, parent_hub_id')
                    .eq('id', childId)
                    .single();

                if (!childNode) {
                    results.push({ node_id: childId, status: 'not_found' });
                    continue;
                }

                // 不能將自己合併到自己
                if (childId === hub_node_id) {
                    results.push({ node_id: childId, status: 'invalid' });
                    continue;
                }

                // 更新 nodes 表
                const { error: updateError } = await supabase
                    .from('nodes')
                    .update({ parent_hub_id: hub_node_id })
                    .eq('id', childId);

                if (updateError) {
                    results.push({ node_id: childId, status: 'error', message: updateError.message });
                    continue;
                }

                // 更新 node_hierarchy 表
                await supabase
                    .from('node_hierarchy')
                    .upsert({
                        node_id: childId,
                        hub_id: hub_node_id,
                        is_active: true,
                        display_order: 0,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'node_id' });

                results.push({ node_id: childId, status: 'success' });
                updatedCount++;
            }
        } else if (action === 'unmerge' && child_node_ids) {
            // 從 Hub 中移除（設為獨立 Hub）
            for (const childId of child_node_ids) {
                const { error: updateError } = await supabase
                    .from('nodes')
                    .update({ parent_hub_id: null })
                    .eq('id', childId);

                if (updateError) {
                    results.push({ node_id: childId, status: 'error', message: updateError.message });
                    continue;
                }

                await supabase
                    .from('node_hierarchy')
                    .update({
                        hub_id: null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('node_id', childId);

                results.push({ node_id: childId, status: 'success' });
                updatedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            hub_node_id: hub_node_id,
            action,
            updated_count: updatedCount,
            results,
        });
    } catch (error: any) {
        console.error('[API] Error in node merge:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
