import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildL4DefaultQuestionTemplates,
  classifyQuestion,
  extractOdptStationIds,
  filterFaresForOrigin,
  filterTimetablesForStation,
  normalizeOdptStationId,
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
