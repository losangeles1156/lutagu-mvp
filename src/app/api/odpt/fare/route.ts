import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const fromStation = searchParams.get('from');
    const toStation = searchParams.get('to');

    if (!fromStation) {
        return NextResponse.json({ error: 'Missing from station' }, { status: 400 });
    }

    try {
        // 1. Try fetching from our local fares table first (much faster)
        let query = supabaseAdmin
            .from('fares')
            .select('*')
            .eq('from_station_id', fromStation);

        if (toStation) {
            query = query.eq('to_station_id', toStation);
        }

        const { data: localFares, error: dbError } = await query.limit(toStation ? 20 : 500);

        if (dbError) {
            console.warn('Database error fetching fares, falling back to ODPT API:', dbError.message);
        } else if (localFares && localFares.length > 0) {
            return NextResponse.json({
                found: true,
                source: 'database',
                fares: localFares.map(f => ({
                    ticket: f.ticket_fare,
                    ic: f.ic_card_fare,
                    operator: f.operator,
                    from: f.from_station_id,
                    to: f.to_station_id
                }))
            }, {
                headers: {
                    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' // Fares are static, cache for 1 day
                }
            });
        }

        // 2. Fallback to ODPT API if not in database
        const ODPT_API_KEY = process.env.ODPT_API_KEY || process.env.ODPT_API_TOKEN || process.env.ODPT_API_TOKEN_BACKUP;
        if (!ODPT_API_KEY) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });

        const BASE_URL = 'https://api.odpt.org/api/v4/odpt:RailwayFare';
        const odptSearchParams = new URLSearchParams({
            'odpt:fromStation': fromStation,
            'acl:consumerKey': ODPT_API_KEY
        });

        if (toStation) {
            odptSearchParams.append('odpt:toStation', toStation);
        }
        const apiUrl = `${BASE_URL}?${odptSearchParams.toString()}`;

        const res = await fetch(apiUrl, { next: { revalidate: 3600 } });
        if (!res.ok) throw new Error('ODPT API Error');

        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ found: false, message: 'No fare data found.' });
        }

        const fares = (toStation ? data : data.slice(0, 500)).map((entry: any) => ({
            ticket: entry['odpt:ticketFare'],
            ic: entry['odpt:icCardFare'],
            operator: entry['odpt:operator'],
            from: entry['odpt:fromStation'],
            to: entry['odpt:toStation']
        }));

        return NextResponse.json({ found: true, source: 'odpt_api', fares }, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600'
            }
        });

    } catch (error) {
        console.error('Fare API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch fare' }, { status: 500 });
    }
}
