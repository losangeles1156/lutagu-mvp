import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/admin/nodes - 獲取節點列表
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const supabase = getSupabaseAdmin();

        const wardId = searchParams.get('ward_id') || undefined;
        const isHub = searchParams.get('is_hub') === 'true' ? true : 
                      searchParams.get('is_hub') === 'false' ? false : undefined;
        const isActive = searchParams.get('is_active') === 'true' ? true :
                        searchParams.get('is_active') === 'false' ? false : undefined;
        const parentHubId = searchParams.get('parent_hub_id') || undefined;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        // 查詢節點
        let query = supabase
            .from('nodes')
            .select(`
                *,
                hierarchy:node_hierarchy(id, hub_id, is_active, display_order)
            `, { count: 'exact' });

        if (wardId) {
            query = query.eq('ward_id', wardId);
        }
        if (isHub !== undefined) {
            query = query.is('parent_hub_id', isHub ? null : (parentHubId ? undefined : false));
        }
        if (isActive !== undefined) {
            query = query.eq('is_active', isActive);
        }
        if (parentHubId) {
            query = query.eq('parent_hub_id', parentHubId);
        }

        // 分頁
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        query = query
            .order('name')
            .range(from, to);

        const { data: nodes, error, count } = await query;

        if (error) {
            console.error('[API] Error fetching nodes:', error);
            return NextResponse.json(
                { error: 'Failed to fetch nodes', message: error.message },
                { status: 500 }
            );
        }

        // 格式化返回數據
        const formattedNodes = (nodes || []).map((node: any) => ({
            ...node,
            is_hub: !node.parent_hub_id,
            hub_id: node.hierarchy?.hub_id || node.parent_hub_id,
            is_active: node.hierarchy?.is_active ?? node.is_active ?? true,
            display_order: node.hierarchy?.display_order ?? node.display_order ?? 0,
            hierarchy: undefined, // 移除嵌套結構
        }));

        return NextResponse.json({
            nodes: formattedNodes,
            total: count || 0,
            page,
            limit,
            total_pages: Math.ceil((count || 0) / limit),
        });
    } catch (error: any) {
        console.error('[API] Error in GET nodes:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/nodes - 批量更新節點
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const supabase = getSupabaseAdmin();

        const { node_ids, updates } = body;

        if (!node_ids || !Array.isArray(node_ids) || node_ids.length === 0) {
            return NextResponse.json(
                { error: 'node_ids is required' },
                { status: 400 }
            );
        }

        // 準備更新數據
        const updateData: any = { ...updates };
        if (updates.parent_hub_id !== undefined) {
            updateData.parent_hub_id = updates.parent_hub_id;
        }
        if (updates.is_active !== undefined) {
            updateData.is_active = updates.is_active;
        }

        // 更新 nodes 表
        const { error: nodeError } = await supabase
            .from('nodes')
            .update(updateData)
            .in('id', node_ids);

        if (nodeError) {
            console.error('[API] Error updating nodes:', nodeError);
            return NextResponse.json(
                { error: 'Failed to update nodes', message: nodeError.message },
                { status: 500 }
            );
        }

        // 如果有 parent_hub_id 或 is_active 更新，同步到 node_hierarchy
        if (updates.parent_hub_id !== undefined || updates.is_active !== undefined) {
            for (const nodeId of node_ids) {
                const { error: upsertError } = await supabase
                    .from('node_hierarchy')
                    .upsert({
                        node_id: nodeId,
                        hub_id: updates.parent_hub_id || null,
                        is_active: updates.is_active !== undefined ? updates.is_active : true,
                        display_order: 0,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'node_id' });

                if (upsertError) {
                    console.warn('[API] Warning: Failed to sync node_hierarchy for', nodeId, upsertError);
                }
            }
        }

        return NextResponse.json({
            success: true,
            updated_count: node_ids.length,
            message: `Updated ${node_ids.length} nodes`,
        });
    } catch (error: any) {
        console.error('[API] Error in PATCH nodes:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
