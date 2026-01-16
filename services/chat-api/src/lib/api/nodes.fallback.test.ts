import test from 'node:test';
import assert from 'node:assert/strict';

import { findFallbackNodeForId } from './nodes';
import { resolveRepresentativeOdptStationId } from './nodes';
import { buildStationIdSearchCandidates } from './nodes';
import { guessPhysicalOdptStationIds } from '../constants/stationLines';
import { getStationIdVariants, resolveHubStationMembers } from '../constants/stationLines';

test('fallback node resolves by station slug, not substring', () => {
    const node = findFallbackNodeForId('odpt:Station:TokyoMetro.Kyobashi');
    assert.equal(node?.id, 'odpt:Station:TokyoMetro.Kyobashi');
});

test('fallback node does not incorrectly return Tokyo for arbitrary TokyoMetro stations', () => {
    const node = findFallbackNodeForId('odpt:Station:TokyoMetro.DoesNotExist');
    assert.equal(node, null);
});

test('fallback node resolves line-qualified ODPT station id to matching seed station', () => {
    const node = findFallbackNodeForId('odpt.Station:TokyoMetro.Ginza.Ueno');
    assert.equal(node?.id, 'odpt:Station:TokyoMetro.Ueno');
});

test('guessPhysicalOdptStationIds derives line-qualified ODPT station ids from logical node id', () => {
    const ids = guessPhysicalOdptStationIds('odpt:Station:TokyoMetro.Tawaramachi');
    assert.deepEqual(ids, ['odpt.Station:TokyoMetro.Ginza.Tawaramachi']);
});

test('resolveRepresentativeOdptStationId resolves dot-format non-line-qualified station ids', () => {
    const id = resolveRepresentativeOdptStationId('odpt.Station:TokyoMetro.Tawaramachi');
    assert.equal(id, 'odpt.Station:TokyoMetro.Ginza.Tawaramachi');
});

test('getStationIdVariants maps between colon and dot station prefixes', () => {
    const a = getStationIdVariants('odpt:Station:TokyoMetro.Ueno');
    assert.ok(a.includes('odpt:Station:TokyoMetro.Ueno'));
    assert.ok(a.includes('odpt.Station:TokyoMetro.Ueno'));

    const b = getStationIdVariants('odpt.Station:TokyoMetro.Ginza.Ueno');
    assert.ok(b.includes('odpt.Station:TokyoMetro.Ginza.Ueno'));
    assert.ok(b.includes('odpt:Station:TokyoMetro.Ginza.Ueno'));
});

test('resolveHubStationMembers returns hub members for known hubs', () => {
    const members = resolveHubStationMembers('odpt:Station:TokyoMetro.Ueno');
    assert.ok(members.includes('odpt:Station:JR-East.Ueno'));
    assert.ok(members.includes('odpt.Station:TokyoMetro.Ginza.Ueno'));
});

test('buildStationIdSearchCandidates covers hub members, physical guesses, and representative ids', () => {
    const ids = buildStationIdSearchCandidates('odpt:Station:TokyoMetro.Ueno');
    assert.ok(ids.includes('odpt:Station:TokyoMetro.Ueno'));
    assert.ok(ids.includes('odpt.Station:TokyoMetro.Ueno'));
    assert.ok(ids.includes('odpt:Station:JR-East.Ueno'));
    assert.ok(ids.includes('odpt.Station:TokyoMetro.Ginza.Ueno'));
    assert.ok(ids.includes('odpt.Station:TokyoMetro.Hibiya.Ueno'));
});
