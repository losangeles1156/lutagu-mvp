
import { getTrainStatus } from '../src/lib/odpt/service';

// Mock console to avoid noise if needed, or just let it print
process.env.ODPT_API_KEY = process.env.ODPT_API_KEY || 'test_key';

async function main() {
    console.log('--- Verifying Yahoo Integration ---');
    try {
        // Attempt to call the service.
        // NOTE: This might fail if next/cache is not available in the environment.
        // If so, we will handle it gracefully or mocking.
        const results = await getTrainStatus('TokyoMetro');
        console.log(`Fetched ${results.length} records.`);
        if (results.length > 0) {
            const sample = results[0];
            console.log('Sample Record:', {
                railway: sample['odpt:railway'],
                status_en: sample['odpt:trainInformationText']?.en,
                secondary_source: sample.secondary_source,
                secondary_status: sample.secondary_status
            });
        }
    } catch (e: any) {
        if (e.message && e.message.includes('next/cache')) {
            console.log('SKIP: Cannot run next/cache outside of Next.js context. Please verify via full app run.');
        } else {
            console.error('Execution Error:', e);
        }
    }
}

main();
