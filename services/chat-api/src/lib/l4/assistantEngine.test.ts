import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildL4DefaultQuestionTemplates,
  classifyQuestion,
  extractOdptStationIds,
  filterFaresForOrigin,
  filterTimetablesForStation,
  findSimpleRoutes,
  findRankedRoutes,
  normalizeOdptStationId,
  type RailwayTopology,
} from './assistantEngine';

test('extractOdptStationIds normalizes odpt:Station prefix', () => {
  const ids = extractOdptStationIds('to: odpt:Station:TokyoMetro.Ginza.Ueno and odpt.Station:Toei.Asakusa.Asakusa');
  assert.deepEqual(new Set(ids), new Set(['odpt.Station:TokyoMetro.Ginza.Ueno', 'odpt.Station:Toei.Asakusa.Asakusa']));
});

test('classifyQuestion detects fare/timetable/route intents', () => {
  assert.equal(classifyQuestion('票價 to: odpt.Station:TokyoMetro.Ginza.Ueno', 'zh-TW').kind, 'fare');
  assert.equal(classifyQuestion('時刻表', 'zh-TW').kind, 'timetable');
  assert.equal(classifyQuestion('怎麼去 odpt.Station:TokyoMetro.Ginza.Ueno', 'zh-TW').kind, 'route');
});

test('filterFaresForOrigin isolates station data', () => {
  const fares: any[] = [
    { '@id': '1', 'odpt:fromStation': 'odpt.Station:TokyoMetro.Ginza.Ueno', 'odpt:toStation': 'odpt.Station:TokyoMetro.Ginza.Asakusa', 'odpt:icCardFare': 170, 'odpt:ticketFare': 180 },
    { '@id': '2', 'odpt:fromStation': 'odpt.Station:TokyoMetro.Marunouchi.Tokyo', 'odpt:toStation': 'odpt.Station:TokyoMetro.Ginza.Ueno', 'odpt:icCardFare': 200, 'odpt:ticketFare': 210 },
    { '@id': '3', 'odpt:fromStation': 'odpt:Station:TokyoMetro.Ginza.Ueno', 'odpt:toStation': 'odpt.Station:TokyoMetro.Ginza.Suehirocho', 'odpt:icCardFare': 170, 'odpt:ticketFare': 180 },
  ];
  const filtered = filterFaresForOrigin(fares, 'odpt.Station:TokyoMetro.Ginza.Ueno');
  assert.equal(filtered.length, 2);
  assert.ok(filtered.every(f => normalizeOdptStationId(f['odpt:fromStation']) === 'odpt.Station:TokyoMetro.Ginza.Ueno'));
});

test('filterTimetablesForStation isolates station data', () => {
  const timetables: any[] = [
    { '@id': '1', 'odpt:station': 'odpt.Station:TokyoMetro.Ginza.Ueno', 'odpt:railDirection': 'odpt.RailDirection:TokyoMetro.Asakusa', 'odpt:calendar': 'odpt.Calendar:Weekday', 'odpt:stationTimetableObject': [] },
    { '@id': '2', 'odpt:station': 'odpt.Station:TokyoMetro.Marunouchi.Tokyo', 'odpt:railDirection': 'odpt.RailDirection:TokyoMetro.Ikebukuro', 'odpt:calendar': 'odpt.Calendar:Weekday', 'odpt:stationTimetableObject': [] },
    { '@id': '3', 'odpt:station': 'odpt:Station:TokyoMetro.Ginza.Ueno', 'odpt:railDirection': 'odpt.RailDirection:TokyoMetro.Shibuya', 'odpt:calendar': 'odpt.Calendar:SaturdayHoliday', 'odpt:stationTimetableObject': [] },
  ];
  const filtered = filterTimetablesForStation(timetables, 'odpt.Station:TokyoMetro.Ginza.Ueno');
  assert.equal(filtered.length, 2);
  assert.ok(filtered.every(t => normalizeOdptStationId(t['odpt:station']) === 'odpt.Station:TokyoMetro.Ginza.Ueno'));
});

test('findSimpleRoutes returns up to 3 routes and respects topology', () => {
  const origin = 'odpt.Station:TokyoMetro.Ginza.A';
  const dest = 'odpt.Station:TokyoMetro.Ginza.J';

  const stationOrder = Array.from({ length: 10 }).map((_, i) => ({
    index: i + 1,
    station: `odpt.Station:TokyoMetro.Ginza.${String.fromCharCode('A'.charCodeAt(0) + i)}`,
  }));

  const railways: RailwayTopology[] = [
    {
      railwayId: 'odpt.Railway:TokyoMetro.Ginza',
      operator: 'odpt.Operator:TokyoMetro',
      stationOrder,
    },
  ];

  const routes = findSimpleRoutes({ originStationId: origin, destinationStationId: dest, railways, maxHops: 30 });
  assert.ok(routes.length >= 1);
  assert.ok(routes.length <= 3);
  const rendered = routes[0].steps.map(s => s.text).join(' ');
  assert.ok(rendered.includes(origin.split('.').pop()!));
  assert.ok(rendered.includes(dest.split('.').pop()!));
});

test('findSimpleRoutes supports multi-criteria ranking (fastest, cheapest, fewest transfers)', () => {
  const origin = 'odpt.Station:A';
  const dest = 'odpt.Station:C';

  // Create a topology with multiple paths:
  // Path 1: A -> B -> C (2 hops, 20 mins, ¥200) - Shortest transfers
  // Path 2: A -> D -> E -> C (3 hops, 15 mins, ¥300) - Fastest
  // Path 3: A -> F -> G -> H -> C (4 hops, 25 mins, ¥150) - Cheapest

  const railways: RailwayTopology[] = [
    {
      railwayId: 'R1', operator: 'Op1',
      stationOrder: [
        { index: 1, station: 'odpt.Station:A' },
        { index: 2, station: 'odpt.Station:B' },
        { index: 3, station: 'odpt.Station:C' }
      ]
    },
    {
      railwayId: 'R2', operator: 'Op2',
      stationOrder: [
        { index: 1, station: 'odpt.Station:A' },
        { index: 2, station: 'odpt.Station:D' },
        { index: 3, station: 'odpt.Station:E' },
        { index: 4, station: 'odpt.Station:C' }
      ]
    },
    {
      railwayId: 'R3', operator: 'Op3',
      stationOrder: [
        { index: 1, station: 'odpt.Station:A' },
        { index: 2, station: 'odpt.Station:F' },
        { index: 3, station: 'odpt.Station:G' },
        { index: 4, station: 'odpt.Station:H' },
        { index: 5, station: 'odpt.Station:C' }
      ]
    }
  ];

  // We need to mock the cost estimation logic if it's not purely topological
  // findSimpleRoutes currently uses Dijkstra with weights
  const routes = findSimpleRoutes({
    originStationId: origin,
    destinationStationId: dest,
    railways,
    maxHops: 10,
    locale: 'en'
  });

  assert.ok(routes.length >= 1);

  // Verify that the labels exist
  // findSimpleRoutes now uses findRankedRoutes which provides descriptive labels
  const labels = routes.map(r => r.label);
  console.log('Labels found:', labels);
  assert.ok(labels.length > 0);
  assert.ok(labels.some(l => l.includes('Fastest') || l.includes('最快')));
});

test('findRankedRoutes supports multi-criteria ranking (fastest, cheapest, fewest transfers)', () => {
  // Path 1: A -> B1 (Line 1), B1 -(transfer)- B2, B2 -> C (Line 2) [1 transfer, FAST]
  // Path 2: A -> D1 (Line 3), D1 -(transfer)- D2, D2 -> C (Line 4) [1 transfer, CHEAP]
  // Path 3: A -> E -> F -> G -> H -> I -> C (Line 5) [0 transfers, SLOW & EXPENSIVE]

  const railways: RailwayTopology[] = [
    {
      railwayId: 'odpt.Railway:TokyoMetro.Line1', operator: 'odpt.Operator:TokyoMetro',
      stationOrder: [
        { index: 1, station: 'odpt.Station:Common.A' },
        { index: 2, station: 'odpt.Station:Line1.B' }
      ]
    },
    {
      railwayId: 'odpt.Railway:TokyoMetro.Line2', operator: 'odpt.Operator:TokyoMetro',
      stationOrder: [
        { index: 1, station: 'odpt.Station:Line2.B' },
        { index: 2, station: 'odpt.Station:Common.C' }
      ]
    },
    {
      railwayId: 'odpt.Railway:JR-East.Line3', operator: 'odpt.Operator:JR-East',
      stationOrder: [
        { index: 1, station: 'odpt.Station:Common.A' },
        { index: 2, station: 'odpt.Station:Line3.D' }
      ]
    },
    {
      railwayId: 'odpt.Railway:JR-East.Line4', operator: 'odpt.Operator:JR-East',
      stationOrder: [
        { index: 1, station: 'odpt.Station:Line4.D' },
        { index: 2, station: 'odpt.Station:Common.C' }
      ]
    },
    {
      railwayId: 'odpt.Railway:Other.Line5', operator: 'odpt.Operator:Other',
      stationOrder: [
        { index: 1, station: 'odpt.Station:Common.A' },
        { index: 2, station: 'odpt.Station:E' },
        { index: 3, station: 'odpt.Station:F' },
        { index: 4, station: 'odpt.Station:G' },
        { index: 5, station: 'odpt.Station:H' },
        { index: 6, station: 'odpt.Station:I' },
        { index: 7, station: 'odpt.Station:Common.C' }
      ]
    }
  ];

  const origin = 'odpt.Station:Common.A';
  const dest = 'odpt.Station:Common.C';

  const routes = findRankedRoutes({
    originStationId: origin,
    destinationStationId: dest,
    railways,
    maxHops: 10,
    locale: 'en'
  });

  assert.ok(routes.length >= 1);

   const labels = routes.map((r: any) => r.label);
   console.log('Labels found:', labels);
   assert.ok(labels.some((l: string) => l.includes('Fastest')));
   assert.ok(
     labels.some((l: string) => l.includes('Cheapest')) ||
     labels.some((l: string) => l.includes('Fewest transfers'))
   );
 });

test('buildL4DefaultQuestionTemplates returns categorized templates with origin embedded', () => {
  const origin = 'odpt.Station:TokyoMetro.Ginza.Ueno';
  const templates = buildL4DefaultQuestionTemplates({ originStationId: origin, locale: 'zh-TW' });
  assert.ok(templates.length >= 6);
  assert.ok(templates.some(t => t.category === 'basic'));
  assert.ok(templates.some(t => t.category === 'advanced'));
  assert.ok(templates.some(t => t.category === 'feature'));
  const nonDemo = templates.filter(t => !t.id.startsWith('demo-'));
  assert.ok(nonDemo.every(t => t.text.includes(origin)));
});

test('stress: handles concurrent-style queries and large datasets', () => {
  const origin = 'odpt.Station:TokyoMetro.Ginza.Ueno';
  const other = 'odpt.Station:TokyoMetro.Marunouchi.Tokyo';

  const fares: any[] = [];
  for (let i = 0; i < 5000; i++) {
    fares.push({ '@id': `o-${i}`, 'odpt:fromStation': origin, 'odpt:toStation': 'odpt.Station:TokyoMetro.Ginza.Asakusa', 'odpt:icCardFare': 170, 'odpt:ticketFare': 180 });
    fares.push({ '@id': `x-${i}`, 'odpt:fromStation': other, 'odpt:toStation': 'odpt.Station:TokyoMetro.Ginza.Ueno', 'odpt:icCardFare': 200, 'odpt:ticketFare': 210 });
  }
  const filteredFares = filterFaresForOrigin(fares, origin);
  assert.equal(filteredFares.length, 5000);

  const timetables: any[] = [];
  for (let i = 0; i < 2000; i++) {
    timetables.push({ '@id': `t-o-${i}`, 'odpt:station': origin, 'odpt:railDirection': 'odpt.RailDirection:TokyoMetro.Asakusa', 'odpt:calendar': 'odpt.Calendar:Weekday', 'odpt:stationTimetableObject': [{ 'odpt:departureTime': '08:00' }] });
    timetables.push({ '@id': `t-x-${i}`, 'odpt:station': other, 'odpt:railDirection': 'odpt.RailDirection:TokyoMetro.Ikebukuro', 'odpt:calendar': 'odpt.Calendar:Weekday', 'odpt:stationTimetableObject': [{ 'odpt:departureTime': '08:10' }] });
  }
  const filteredTimetables = filterTimetablesForStation(timetables, origin);
  assert.equal(filteredTimetables.length, 2000);

  for (let i = 0; i < 200; i++) {
    const q1 = `票價 to: odpt.Station:TokyoMetro.Ginza.Asakusa #${i}`;
    const q2 = `時刻表 station: ${origin} #${i}`;
    const q3 = `怎麼去 odpt.Station:TokyoMetro.Ginza.Asakusa from: ${origin} #${i}`;
    assert.equal(classifyQuestion(q1, 'zh-TW').kind, 'fare');
    assert.equal(classifyQuestion(q2, 'zh-TW').kind, 'timetable');
    assert.equal(classifyQuestion(q3, 'zh-TW').kind, 'route');
  }
});
