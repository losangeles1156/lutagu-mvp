import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

import { GET } from './route';

test('route API response includes label, duration, transfers, fare, steps', async () => {
    const req = new NextRequest(
        'http://localhost/api/odpt/route?from=odpt.Station:TokyoMetro.Ginza.Ueno&to=odpt.Station:TokyoMetro.Ginza.Shibuya&locale=en'
    );
    const res = await GET(req as any);
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;

    assert.ok(Array.isArray(body.routes));
    assert.ok(body.routes.length >= 2);

    const route = body.routes[0];
    assert.equal(typeof route.label, 'string');
    assert.ok(Array.isArray(route.steps));
    assert.equal(typeof route.transfers, 'number');
    assert.equal(typeof route.duration, 'number');
    assert.ok(route.fare && typeof route.fare.ic === 'number' && typeof route.fare.ticket === 'number');
    assert.ok(Array.isArray(route.sources));

    const labels = new Set(body.routes.map((r: any) => r.label));
    assert.ok(labels.has('Fastest'));
});

test('timetable API raw mode returns filtered ODPT tables', async () => {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.ODPT_API_KEY;
    process.env.ODPT_API_KEY = 'test-key';

    const mockTables = [
        {
            '@id': 'test:timetable:1',
            '@type': 'odpt:StationTimetable',
            'odpt:station': 'odpt.Station:TokyoMetro.Ginza.Ueno',
            'odpt:calendar': 'odpt.Calendar:Weekday',
            'odpt:railDirection': 'odpt.RailDirection:TokyoMetro.Shibuya',
            'odpt:stationTimetableObject': [
                {
                    'odpt:departureTime': '12:34',
                    'odpt:destinationStation': ['odpt.Station:TokyoMetro.Ginza.Shibuya'],
                    'odpt:train': 'odpt.Train:TokyoMetro.Ginza.1',
                    'odpt:trainType': 'odpt.TrainType:TokyoMetro.Local',
                    'odpt:trainNumber': '1'
                }
            ]
        }
    ];

    globalThis.fetch = (async () => {
        return new Response(JSON.stringify(mockTables), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }) as any;

    try {
        const mod = await import('../timetable/route');
        const req = new NextRequest(
            'http://localhost/api/odpt/timetable?station=odpt.Station:TokyoMetro.Ginza.Ueno&raw=1'
        );
        const res = await mod.GET(req as any);
        assert.equal(res.status, 200);
        const body = (await res.json()) as any;
        assert.ok(Array.isArray(body));
        assert.equal(body[0]['@type'], 'odpt:StationTimetable');
        assert.equal(body[0]['odpt:station'], 'odpt.Station:TokyoMetro.Ginza.Ueno');
    } finally {
        globalThis.fetch = originalFetch;
        if (typeof originalKey === 'string') process.env.ODPT_API_KEY = originalKey;
        else delete process.env.ODPT_API_KEY;
    }
});
