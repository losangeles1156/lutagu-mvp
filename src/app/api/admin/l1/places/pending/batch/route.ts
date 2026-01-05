import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// POST /api/admin/l1/places/pending/batch - 批量批准或拒絕 L1 數據
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, place_ids, station_id, category, notes } = body;
        const supabase = getSupabaseAdmin();

        if (!action || !['approve', 'reject'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Must be "approve" or "reject"' },
                { status: 400 }
            );
        }

        // 統計操作結果
        let updatedCount = 0;
        let skippedCount = 0;

        if (place_ids && Array.isArray(place_ids) && place_ids.length > 0) {
            // 按 ID 列表操作
            const { error } = await supabase
                .from('node_l1_config')
                .update({
                    is_approved: action === 'approve',
                    approved_at: action === 'approve' ? new Date().toISOString() : null,
                    notes: notes || `Batch ${action} via API at ${new Date().toISOString()}`,
                    updated_at: new Date().toISOString(),
                })
                .in('source_id', place_ids);

            if (error) {
                console.error('[API] Error in batch operation:', error);
                return NextResponse.json(
                    { error: 'Batch operation failed', message: error.message },
                    { status: 500 }
                );
            }

            updatedCount = place_ids.length;
        } else if (station_id && category) {
            // 按站點和分類批量操作
            // 先獲取匹配的記錄
            const { data: configs, error: selectError } = await supabase
                .from('v_l1_pending')
                .select('id')
                .eq('node_id', station_id)
                .eq('category', category);

            if (selectError) {
                console.error('[API] Error fetching pending records:', selectError);
                return NextResponse.json(
                    { error: 'Failed to fetch pending records', message: selectError.message },
                    { status: 500 }
                );
            }

            if (!configs || configs.length === 0) {
                return NextResponse.json({
                    message: 'No pending records found for the specified criteria',
                    updated_count: 0,
                    skipped_count: 0,
                });
            }

            const ids = configs.map((c: any) => c.id.toString());

            const { error: updateError } = await supabase
                .from('node_l1_config')
                .update({
                    is_approved: action === 'approve',
                    approved_at: action === 'approve' ? new Date().toISOString() : null,
                    notes: notes || `Batch ${action} via API: ${category} at ${station_id}`,
                    updated_at: new Date().toISOString(),
                })
                .in('source_id', ids);

            if (updateError) {
                console.error('[API] Error in batch operation:', updateError);
                return NextResponse.json(
                    { error: 'Batch operation failed', message: updateError.message },
                    { status: 500 }
                );
            }

            updatedCount = ids.length;
        } else {
            return NextResponse.json(
                { error: 'Missing required fields. Provide place_ids or (station_id + category)' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            action,
            updated_count: updatedCount,
            message: `Batch ${action} completed: ${updatedCount} records updated`,
        });
    } catch (error: any) {
        console.error('[API] Error in batch operation:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
