import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TOKEN_STANDARD = process.env.ODPT_API_TOKEN_STANDARD || process.env.ODPT_API_TOKEN!;
const TOKEN_CHALLENGE = process.env.ODPT_API_TOKEN_CHALLENGE || process.env.ODPT_API_TOKEN_BACKUP!;

async function fetchOdpt(type: string, operator?: string) {
    let baseUrl = 'https://api.odpt.org/api/v4';
    let token = TOKEN_STANDARD;

    if (operator?.includes('JR-East') || operator?.includes('Tobu') || operator?.includes('Keikyu') || operator?.includes('Tokyu')) {
        baseUrl = 'https://api-challenge.odpt.org/api/v4';
        token = TOKEN_CHALLENGE;
    }

    const params = new URLSearchParams();
    if (operator) params.append('odpt:operator', operator);
    if (token) params.append('acl:consumerKey', token);

    const url = `${baseUrl}/${type}?${params.toString()}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        console.error(`[Fetch Error] ${type}: ${e.message}`);
        return [];
    }
}

async function main() {
    console.log('📊 Researching Congestion Data...');

    // 1. Passenger Survey (Static/Historical)
    console.log('Fetching Passenger Survey data...');
    // Try without operator first to see global coverage
    const surveys = await fetchOdpt('odpt:PassengerSurvey');
    console.log(`Received ${surveys.length} survey records.`);

    if (surveys.length > 0) {
        console.log('Raw First Survey Record:', JSON.stringify(surveys[0], null, 2));

        const mappedSurveys = surveys.flatMap((s: any) => {
            const stations = s['odpt:station'];
            const stationId = Array.isArray(stations) ? stations[0] : stations;
            const surveyObjects = s['odpt:passengerSurveyObject'] || [];

            // Map each year's entry to the object structure
            return surveyObjects.map((obj: any) => ({
                station_id: stationId,
                operator: s['odpt:operator'],
                survey_year: obj['odpt:surveyYear'],
                passenger_journeys: obj['odpt:passengerJourneys'],
                updated_at: new Date().toISOString()
            }));
        }).filter(s => s.station_id && s.passenger_journeys);

        console.log(`Mapped ${mappedSurveys.length} survey records across years.`);
        if (mappedSurveys.length > 0) {
            // Sort by year descending to keep the latest if we only want one per station
            // But storing all years is also fine for historical vibe.
            // For MVP, we'll upsert based on (station_id, survey_year).

            console.log('Sample Mapped Survey:', mappedSurveys[0]);

            // Create station_stats table
            console.log('Ingesting into station_stats table...');
            const { error: tableError } = await supabase.rpc('execute_sql', {
                query: `
                    CREATE TABLE IF NOT EXISTS station_stats (
                        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                        station_id text,
                        operator text,
                        survey_year integer,
                        passenger_journeys integer,
                        updated_at timestamptz DEFAULT now()
                    );
                `
            });
            // If RPC fails, I'll use the MCP tool later, but let's try to make the script robust.

            // Add unique constraint for (station_id, survey_year)
            console.log('Updating station_stats table constraints...');
            await supabase.rpc('execute_sql', {
                query: `
                    ALTER TABLE station_stats DROP CONSTRAINT IF EXISTS station_stats_station_id_key;
                    ALTER TABLE station_stats ADD CONSTRAINT station_stats_station_year_unq UNIQUE (station_id, survey_year);
                `
            });

            // Deduplicate to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time"
            const uniqueSurveys = Array.from(new Map(mappedSurveys.map(s => [`${s.station_id}-${s.survey_year}`, s])).values());
            console.log(`Deduplicated to ${uniqueSurveys.length} records.`);

            const { error } = await supabase.from('station_stats').upsert(uniqueSurveys, { onConflict: 'station_id, survey_year' });
            if (error) console.error(`❌ Ingestion Error: ${error.message}`);
            else console.log(`✅ Successfully upserted ${uniqueSurveys.length} survey records.`);
        }
    }

    // 2. Station Crowd (Live)
    console.log('Checking Station Crowd live availability...');
    const stationCrowds = await fetchOdpt('odpt:StationCrowd');
    console.log(`Received ${stationCrowds.length} live station crowd records.`);
    if (stationCrowds.length > 0) {
        console.log('Sample Live Crowd:', stationCrowds[0]);
    }

    // 3. Train Crowd (Live)
    console.log('Checking Train Crowd live availability...');
    const trainCrowds = await fetchOdpt('odpt:TrainCrowd');
    console.log(`Received ${trainCrowds.length} live train crowd records.`);

    console.log('🌟 Research Complete.');
}

main().catch(console.error);
