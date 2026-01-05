import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/admin/nodes/wards/[wardId] - 獲取行政區節點
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ wardId: string }> }
) {
    try {
        const { wardId } = await params;
        const supabase = getSupabaseAdmin();

        // 查詢行政區
        const { data: ward, error: wardError } = await supabase
            .from('wards')
            .select('*')
            .eq('id', wardId)
            .single();

        if (wardError || !ward) {
            return NextResponse.json(
                { error: 'Ward not found' },
                { status: 404 }
            );
        }

        // 查詢該行政區的所有節點
        const { data: nodes, error: nodesError } = await supabase
            .from('nodes')
            .select(`
                *,
                hierarchy:node_hierarchy(id, hub_id, is_active, display_order)
            `)
            .eq('ward_id', wardId)
            .order('name');

        if (nodesError) {
            console.error('[API] Error fetching ward nodes:', nodesError);
            return NextResponse.json(
                { error: 'Failed to fetch ward nodes', message: nodesError.message },
                { status: 500 }
            );
        }

        // 分類節點
        const hubNodes: any[] = [];
        const childNodes: any[] = [];

        (nodes || []).forEach((node: any) => {
            const formattedNode = {
                ...node,
                is_hub: !node.parent_hub_id,
                hub_id: node.hierarchy?.hub_id || node.parent_hub_id,
                is_active: node.hierarchy?.is_active ?? node.is_active ?? true,
                display_order: node.hierarchy?.display_order ?? node.display_order ?? 0,
                hierarchy: undefined,
            };

            if (!node.parent_hub_id) {
                hubNodes.push(formattedNode);
            } else {
                childNodes.push(formattedNode);
            }
        });

        return NextResponse.json({
            ward,
            nodes: {
                hubs: hubNodes,
                children: childNodes,
                total: (nodes || []).length,
            },
        });
    } catch (error: any) {
        console.error('[API] Error in GET ward nodes:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
