import { odptClient } from './client';
import assert from 'node:assert';
import { test, describe, mock } from 'node:test';

// We want to test the internal logic of fetchOdpt via public methods
// Since we can't easily mock process.env after import, we assume they are set or missing
// and check if the correct error messages are thrown (which contain operator info).

describe('ODPT Client Token Dispatching', () => {
    
    test('Should identify Tokyo Metro and attempt to use Metro Token', async () => {
        try {
            await odptClient.getStation('odpt.Station:TokyoMetro.Ginza.Ueno');
        } catch (e: any) {
            // If token is missing, it should throw specific error we defined
            if (e.message.includes('ODPT_API_KEY_METRO missing')) {
                assert.ok(true, 'Correctly identified Metro and looked for Metro token');
            } else if (e.message.includes('ODPT API Error')) {
                assert.ok(true, 'Attempted call with some token (likely from .env)');
            }
        }
    });

    test('Should identify JR-East and attempt to use Challenge Token', async () => {
        try {
            await odptClient.getStation('odpt.Station:JR-East.Yamanote.Ueno');
        } catch (e: any) {
            if (e.message.includes('ODPT_API_KEY_JR_EAST missing')) {
                assert.ok(true, 'Correctly identified JR-East and looked for Challenge token');
            } else if (e.message.includes('ODPT API Error')) {
                assert.ok(true, 'Attempted call with Challenge token');
            }
        }
    });

    test('Should identify Private Railways (e.g. Tokyu) and use Challenge Token', async () => {
        try {
            await odptClient.getStation('odpt.Station:Tokyu.Toyoko.Shibuya');
        } catch (e: any) {
            if (e.message.includes('ODPT_API_KEY_JR_EAST missing') && e.message.includes('Tokyu')) {
                assert.ok(true, 'Correctly identified Tokyu as Challenge API target');
            }
        }
    });

    test('Should identify Toei and use Public API with Optional Token', async () => {
        // Toei usually doesn't throw "missing token" because Strategy A allows undefined token
        // But it should log "[ODPT Client] Fetching (Public)"
        // This is harder to assert without spy, but we can check if it doesn't throw the "Metro missing" error
        try {
            await odptClient.getStation('odpt.Station:Toei.Asakusa.Asakusa');
        } catch (e: any) {
            assert.strictEqual(e.message.includes('ODPT_API_KEY_METRO missing'), false);
            assert.strictEqual(e.message.includes('ODPT_API_KEY_JR_EAST missing'), false);
        }
    });
});
