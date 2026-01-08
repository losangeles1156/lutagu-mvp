import { NextResponse } from 'next/server';
import { fetchNodeConfig } from '@/lib/api/nodes';

export async function GET(
    request: Request,
    { params }: { params: { nodeId: string } }
) {
    const nodeId = params.nodeId;
    console.log(`[API] Fetching node: ${nodeId}`);

    try {
        const result = await fetchNodeConfig(nodeId);
        console.log(`[API] fetchNodeConfig result for ${nodeId}:`, result?.profile ? 'Found' : 'Null', result?.error);

        // Handle explicit error from fetchNodeConfig
        if (result.error) {
            console.log(`[API] Node error: ${result.error}`);
            return NextResponse.json({ error: result.error }, { status: 404 });
        }

        // Handle missing profile
        if (!result.profile) {
            console.log(`[API] Node profile missing`);
            return NextResponse.json({ error: 'Node not found' }, { status: 404 });
        }

        // Return the profile directly to match frontend expectations
        return NextResponse.json(result.profile);
    } catch (error) {
        console.error(`[API] Error in /api/nodes/${nodeId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
