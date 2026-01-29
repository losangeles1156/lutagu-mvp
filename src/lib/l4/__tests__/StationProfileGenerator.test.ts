
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StationProfileGenerator } from '../data/StationProfileGenerator';
import { getDefaultTopology } from '../assistantEngine';

describe('StationProfileGenerator', () => {

    it('should generate valid GEM Profile structure', () => {
        const profile = StationProfileGenerator.generate('odpt.Station:JR-East.Yamanote.Ueno');

        assert.ok(profile.core.identity.length > 0, 'Core tags should not be empty');
        assert.ok(profile.intent.capabilities.length > 0, 'Intent tags should not be empty');
        assert.ok(profile.vibe.visuals.length > 0, 'Vibe tags should not be empty');
        assert.strictEqual(profile.nodeId, 'odpt.Station:JR-East.Yamanote.Ueno');
    });

    it('should identify HUB stations (e.g. Shinjuku, Tokyo)', () => {
        const shinjuku = StationProfileGenerator.generate('odpt.Station:JR-East.Chuo.Shinjuku');
        const tokyo = StationProfileGenerator.generate('odpt.Station:JR-East.Yamanote.Tokyo');

        assert.ok(shinjuku.core.identity.includes('HUB'), 'Shinjuku should be a HUB');
        assert.ok(tokyo.core.identity.includes('HUB'), 'Tokyo should be a HUB');

        // Vibe checks for hubs
        assert.ok(shinjuku.vibe.visuals.includes('BUSY'), 'Hubs should be BUSY');
    });

    it('should identify Airport stations', () => {
        const narita = StationProfileGenerator.generate('odpt.Station:JR-East.NaritaExpress.NaritaAirportTerminal1');

        assert.ok(narita.core.identity.includes('AIRP'), 'Airport should have AIRP core tag');
        assert.ok(narita.intent.capabilities.includes('LUGGAGE'), 'Airport should have LUGGAGE capability');
        assert.ok(narita.intent.capabilities.includes('FLIGHT'), 'Airport should have FLIGHT capability');
    });

    it('should generate deterministic tags for obscure stations', () => {
        // "Higashi-Nakano" -> Length > 3 -> "HIGA"
        const obscure = StationProfileGenerator.generate('odpt.Station:JR-East.ChuoSobuLocal.HigashiNakano');

        // Verify deterministic name generation
        const hasNameTag = obscure.core.identity.some(tag => ['HIGA', 'NAKA'].includes(tag));
        assert.ok(hasNameTag, 'Should generate name-based tag for obscure station');

        // Verify non-hub status
        assert.ok(!obscure.core.identity.includes('HUB'), 'Higashi-Nakano is not a major Hub');
        assert.ok(obscure.vibe.visuals.includes('LOCAL'), 'Small stations should be LOCAL');
    });

    it('should handle invalid IDs gracefully', () => {
        const invalid = StationProfileGenerator.generate('invalid:station:id');
        assert.ok(invalid.core.identity.includes('UNKN'), 'Invalid station should have UNKN tag');
    });
});
