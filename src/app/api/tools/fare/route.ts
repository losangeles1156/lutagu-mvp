
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic'; // Prevent caching as this is a tool

async function resolveSpokes(query: string): Promise<{ hubName: string, spokeIds: string[] }> {
    // 1. Search for nodes matching the query
    const { data: nodes, error } = await supabase
        .from('nodes')
        .select('id, name, node_type, parent_hub_id')
        .or(`name->>en.ilike.%${query}%,name->>ja.ilike.%${query}%`)
        .limit(5);

    if (error || !nodes || nodes.length === 0) {
        return { hubName: query, spokeIds: [] };
    }

    // 2. Collect all relevant spoke IDs
    let spokeIds: string[] = [];
    let hubNames: string[] = [];

    for (const node of nodes) {
        // Use the first English name found as the canonical name for response
        if (hubNames.length === 0) hubNames.push(node.name?.en || node.name?.ja || query);

        if (node.node_type === 'hub') {
            // It's a Hub, get its children
            const { data: children } = await supabase
                .from('nodes')
                .select('id')
                .eq('parent_hub_id', node.id);
            if (children) spokeIds.push(...children.map(c => c.id));
        } else {
            // It's a Spoke
            spokeIds.push(node.id);
            // Also add its siblings if we want to be generous?
            // No, if user asked for specific station, maybe just that.
            // But usually "Ueno" matches "JR Ueno" and "Metro Ueno".
            // Our search returns both, so we are good.
        }
    }

    return {
        hubName: hubNames[0],
        spokeIds: Array.from(new Set(spokeIds))
    };
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
        return NextResponse.json({ error: 'Missing from/to parameters' }, { status: 400 });
    }

    console.log(`[Tool:Fare] Searching fare from "${from}" to "${to}"`);

    const [origin, destination] = await Promise.all([
        resolveSpokes(from),
        resolveSpokes(to)
    ]);

    if (origin.spokeIds.length === 0) {
        return NextResponse.json({ error: `Origin station "${from}" not found` }, { status: 404 });
    }
    if (destination.spokeIds.length === 0) {
        return NextResponse.json({ error: `Destination station "${to}" not found` }, { status: 404 });
    }

    // 3. Matrix Search for Fares
    // We want to find any valid fare between any origin spoke and any destination spoke.
    // Optimization: Use a single query with IN clause
    const { data: fares, error } = await supabase
        .from('fares')
        .select('*')
        .in('from_station_id', origin.spokeIds)
        .in('to_station_id', destination.spokeIds)
        .order('ticket_fare', { ascending: true });

    if (error) {
        return NextResponse.json({ error: 'Database error fetching fares' }, { status: 500 });
    }

    if (!fares || fares.length === 0) {
        return NextResponse.json({
            message: `No direct fare found between ${origin.hubName} and ${destination.hubName}.`,
            suggestion: "Transfer might be required."
        });
    }

    // Format the result for the Agent
    const results = fares.map(f => ({
        from: f.from_station_id,
        to: f.to_station_id,
        ticket: f.ticket_fare,
        ic: f.ic_card_fare,
        operator: f.from_station_id.split(':')[2]?.split('.')[0] || 'Unknown' // Extract operator from ID
    }));

    return NextResponse.json({
        route: `${origin.hubName} → ${destination.hubName}`,
        best_option: results[0], // Cheapest because we ordered by ticket_fare
        all_options: results
    });
}
