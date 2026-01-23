
import { rustL2Client } from '../src/lib/services/RustL2Client';

async function verifyL2Client() {
    console.log('--- Verifying RustL2Client Integration ---');

    const stationId = 'odpt.Station:JR-East.Yamanote.Tokyo';

    console.log(`Requesting status for: ${stationId}`);

    try {
        const start = Date.now();
        const status = await rustL2Client.getStatus(stationId);
        const duration = Date.now() - start;

        console.log(`\n✅ Client returned in ${duration}ms`);

        if (status) {
            console.log('✅ Success! Received Status.');
            console.log(`Is Stale: ${status.is_stale}`);
            console.log(`Updated At: ${status.updated_at}`);
            console.log(`Line Status count: ${status.line_status.length}`);
            if (status.line_status.length > 0) {
                const ls = status.line_status[0];
                console.log(`Example Line: ${ls.line} - ${ls.status}`);
            }
        } else {
            console.warn('⚠️ Service returned null. Possible reasons: Service down, invalid station ID, or no data.');
        }

    } catch (error) {
        console.error('❌ Client Verification Failed:', error);
    }
}

verifyL2Client();
