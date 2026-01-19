import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const stationId = searchParams.get('station_id');

        if (!stationId) {
            return NextResponse.json({ error: 'Missing station_id' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Determine Source Dataset for this station
        // This is a mapping heuristic.
        // Ueno -> 'hokonavi_ueno'
        // Ueno-okachimachi -> 'odpt_oedo_ueno'
        // Daimon -> 'odpt_oedo_daimon'
        // Ideally, we query ALL and filter by station_id if data is linked.
        // But pedestrian_links don't always have station_id directly populated for all sources?
        // Let's query by matching source_dataset or just query generally if spatial match?
        // For MVP, since we used specific datasets:

        let datasetFilter = '';
        if (stationId.includes('Ueno') && !stationId.includes('Okachimachi')) datasetFilter = 'hokonavi_ueno';
        else if (stationId.includes('Ueno') && stationId.includes('Okachimachi')) datasetFilter = 'odpt_oedo_ueno';
        else if (stationId.includes('Daimon')) datasetFilter = 'odpt_oedo_daimon';

        // If we can't map strictly, we might return empty or query all.
        // Better strategy: Count links related to this station spatially, but for now stick to dataset mapping.

        if (!datasetFilter) {
            // Fallback: return generic info or "No detailed barrier-free data available for this station yet."
            return NextResponse.json({
                station_id: stationId,
                status: 'no_data',
                message: 'No barrier-free network data available for this station.'
            });
        }

        // 2. Aggregate Stats
        // Total Links
        const { count: totalLinks } = await supabase
            .from('pedestrian_links')
            .select('*', { count: 'exact', head: true })
            .eq('source_dataset', datasetFilter);

        // Elevator Access
        const { count: elevatorLinks } = await supabase
            .from('pedestrian_links')
            .select('*', { count: 'exact', head: true })
            .eq('source_dataset', datasetFilter)
            .eq('has_elevator_access', true);

        // S Rank
        const { count: sRankLinks } = await supabase
            .from('pedestrian_links')
            .select('*', { count: 'exact', head: true })
            .eq('source_dataset', datasetFilter)
            .like('accessibility_rank', 'S%');

        const coverage = totalLinks ? Math.round((elevatorLinks || 0) / totalLinks * 100) : 0;

        // Traceability & Confidence Simulation (L4 Upgrade)
        const tracePath = [
            `Identify Station: ${stationId}`,
            `Map to Dataset: ${datasetFilter}`,
            `Query Supabase: pedestrian_links (Count: ${totalLinks})`,
            `Filter Elevator Access: ${elevatorLinks} links`,
            `Calculate Coverage: ${coverage}%`
        ];

        // Bayesian Confidence Simulation
        // Base confidence starts high if we have data.
        // Penalize for low link count (sparse data) or old dataset.
        let confidence = 0.95;
        if (!totalLinks || totalLinks < 10) confidence -= 0.2;
        if (coverage < 50) confidence -= 0.1; // Lower confidence in "goodness" if coverage is low? No, confidence is about data accuracy.
        // Let's say confidence is about the "Completeness" of our knowledge.

        const suggestions = [
             // Mock suggestions based on station context
            `Check nearby bus stops for alternative access`,
            `Verify elevator operation status via station staff`,
            `Use underground passages during bad weather`
        ];

        return NextResponse.json({
            station_id: stationId,
            status: 'available',
            dataset: datasetFilter,
            stats: {
                total_paths: totalLinks,
                elevator_accessible_paths: elevatorLinks,
                elevator_coverage_percent: coverage,
                s_rank_paths: sRankLinks,
                wheelchair_friendly: coverage > 80 // Threshold logic
            },
            // New Interaction Protocol Fields
            traceability: tracePath,
            confidence: confidence.toFixed(2), // 0.00 - 1.00
            potential_associations: suggestions,
            message: `Accessibility Data: ${coverage}% of paths are elevator accessible. ${sRankLinks} paths are rated S-rank (Excellent).`
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
