import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getNodeDisplayTier, getNameOnly, MapDisplayTier } from './MapDisplayPolicy';

describe('MapDisplayPolicy', () => {
    describe('getNodeDisplayTier', () => {
        // Tier 1 Tests
        it('should identify Tier 1 Super Hubs including Ginza and Akihabara', () => {
            assert.strictEqual(getNodeDisplayTier('odpt:Station:JR-East.Tokyo'), MapDisplayTier.SUPER_HUB);
            assert.strictEqual(getNodeDisplayTier('odpt:Station:JR-East.Shinjuku'), MapDisplayTier.SUPER_HUB);
            assert.strictEqual(getNodeDisplayTier('odpt:Station:TokyoMetro.Ginza.Ginza'), MapDisplayTier.SUPER_HUB);
            assert.strictEqual(getNodeDisplayTier('odpt:Station:JR-East.Yamanote.Akihabara'), MapDisplayTier.SUPER_HUB);
        });

        it('should properly handle Tier 1 Exclusions by falling through to next tier', () => {
            // UenoOkachimachi is excluded from Tier 1 (Ueno) but is in Tier 2
            assert.strictEqual(getNodeDisplayTier('odpt:Station:Toei.Oedo.UenoOkachimachi'), MapDisplayTier.MAJOR_HUB);
            // SeibuShinjuku is excluded from Tier 1 but should fall back to REGULAR if it's a major operator
            assert.strictEqual(getNodeDisplayTier('odpt:Station:Seibu.Shinjuku.SeibuShinjuku'), MapDisplayTier.REGULAR);
        });

        // Tier 2 Tests
        it('should identify Tier 2 Major Hubs', () => {
            assert.strictEqual(getNodeDisplayTier('odpt:Station:TokyoMetro.Otemachi'), MapDisplayTier.MAJOR_HUB);
            assert.strictEqual(getNodeDisplayTier('odpt:Station:Toei.Daimon'), MapDisplayTier.MAJOR_HUB);
        });

        // Tier 3 Tests
        it('should identify Tier 3 Minor Hubs', () => {
            assert.strictEqual(getNodeDisplayTier('odpt:Station:TokyoMetro.Hibiya.Kayabacho'), MapDisplayTier.MINOR_HUB);
            assert.strictEqual(getNodeDisplayTier('odpt:Station:TokyoMetro.Tozai.MonzenNakacho'), MapDisplayTier.MINOR_HUB);
        });

        // Tier 4 Tests
        it('should identify Tier 4 REGULAR stations based on operator', () => {
            assert.strictEqual(getNodeDisplayTier('odpt:Station:TokyoMetro.Marunouchi.Myogadani'), MapDisplayTier.REGULAR);
            assert.strictEqual(getNodeDisplayTier('odpt:Station:JR-East.Chuo.ShinOkubo'), MapDisplayTier.REGULAR);
        });

        // Case/Suffix Testing
        it('should not misidentify TokyoBay as Tokyo Tier 1', () => {
            // TokyoBay is not in Tier 1 list, should fall back to REGULAR if it's a major operator or LOCAL
            assert.notStrictEqual(getNodeDisplayTier('odpt:Station:Custom.TokyoBay'), MapDisplayTier.SUPER_HUB);
        });

        // Default Case
        it('should default to LOCAL for unknown small stations', () => {
            assert.strictEqual(getNodeDisplayTier('odpt:Station:Custom.SmallStation'), MapDisplayTier.LOCAL);
        });
    });

    describe('getNameOnly', () => {
        it('should remove operator prefixes', () => {
            assert.strictEqual(getNameOnly('Toei Shinjuku'), 'Shinjuku');
            assert.strictEqual(getNameOnly('Tokyo Metro Ginza'), 'Ginza');
            assert.strictEqual(getNameOnly('JR Tokyo'), 'Tokyo');
        });

        it('should remove station suffixes', () => {
            assert.strictEqual(getNameOnly('Shinjuku Station'), 'Shinjuku');
            assert.strictEqual(getNameOnly('Ueno Station'), 'Ueno');
            assert.strictEqual(getNameOnly('Tokyo Terminal'), 'Tokyo');
            assert.strictEqual(getNameOnly('新宿駅', 'ja'), '新宿');
            assert.strictEqual(getNameOnly('新宿站', 'zh-TW'), '新宿');
        });

        it('should remove parentheses', () => {
            assert.strictEqual(getNameOnly('Ueno (JR)'), 'Ueno');
            assert.strictEqual(getNameOnly('上野 (JR)', 'zh-TW'), '上野');
        });

        it('should handle complex cases', () => {
            assert.strictEqual(getNameOnly('Tokyo Metro Ginza Station'), 'Ginza');
        });
    });
});
