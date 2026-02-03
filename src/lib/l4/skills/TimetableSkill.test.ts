import test from 'node:test';
import assert from 'node:assert/strict';
import { TimetableSkill } from './implementations';
import type { RequestContext } from '../HybridEngine';

// Mock Supabase data for testing
const mockTimetableData = {
    'odpt.Station:JR-East.Yamanote.Shinjuku': [
        {
            '@id': 'odpt.StationTimetable:JR-East.Yamanote.Shinjuku.Southbound.Weekday',
            'odpt:calendar': 'odpt.Calendar:Weekday',
            'odpt:railDirection': 'odpt.RailDirection:Southbound',
            'odpt:stationTimetableObject': [
                {
                    'odpt:departureTime': '05:30',
                    'odpt:trainType': 'odpt.TrainType:JR-East.Local',
                    'odpt:destinationStation': ['odpt.Station:JR-East.Yamanote.Shibuya']
                },
                {
                    'odpt:departureTime': '05:45',
                    'odpt:trainType': 'odpt.TrainType:JR-East.Express',
                    'odpt:destinationStation': ['odpt.Station:JR-East.Yamanote.Tokyo'],
                    'odpt:isLast': false
                },
                {
                    'odpt:departureTime': '23:59',
                    'odpt:trainType': 'odpt.TrainType:JR-East.Local',
                    'odpt:destinationStation': ['odpt.Station:JR-East.Yamanote.Shibuya'],
                    'odpt:isLast': true
                }
            ]
        },
        {
            '@id': 'odpt.StationTimetable:JR-East.Yamanote.Shinjuku.Northbound.Weekday',
            'odpt:calendar': 'odpt.Calendar:Weekday',
            'odpt:railDirection': 'odpt.RailDirection:Northbound',
            'odpt:stationTimetableObject': [
                {
                    'odpt:departureTime': '05:35',
                    'odpt:trainType': 'odpt.TrainType:JR-East.Rapid',
                    'odpt:destinationStation': ['odpt.Station:JR-East.Yamanote.Ikebukuro']
                }
            ]
        },
        {
            '@id': 'odpt.StationTimetable:JR-East.Yamanote.Shinjuku.Southbound.SaturdayHoliday',
            'odpt:calendar': 'odpt.Calendar:SaturdayHoliday',
            'odpt:railDirection': 'odpt.RailDirection:Southbound',
            'odpt:stationTimetableObject': [
                {
                    'odpt:departureTime': '06:00',
                    'odpt:trainType': 'odpt.TrainType:JR-East.Local',
                    'odpt:destinationStation': ['odpt.Station:JR-East.Yamanote.Shibuya']
                }
            ]
        }
    ]
};

// Mock Supabase client factory
function createMockSupabaseClient(mockData: Record<string, any> = {}) {
    return {
        from: (table: string) => ({
            select: (columns: string) => ({
                eq: (column: string, value: string) => ({
                    single: async () => {
                        if (table === 'static_timetables') {
                            const data = mockData[value];
                            if (!data) {
                                return { data: null, error: { message: 'No data found' } };
                            }
                            return { data: { data }, error: null };
                        }
                        return { data: null, error: { message: 'Unknown table' } };
                    }
                })
            })
        })
    };
}

// Helper to create mock context
function createMockContext(stationId?: string, intent?: string): RequestContext {
    return {
        currentStation: stationId,
        nodeContext: {
            primaryNodeId: stationId,
            intent: intent as any
        }
    } as RequestContext;
}

// Helper to mock Date for calendar tests
function mockDate(dayOfWeek: number) {
    const mockDate = new Date();
    // Set to specific day (0=Sunday, 6=Saturday)
    mockDate.setDate(mockDate.getDate() + ((dayOfWeek - mockDate.getDay() + 7) % 7));
    const originalDate = global.Date;
    (global as any).Date = class extends Date {
        constructor() {
            super();
            return mockDate;
        }
        static now() {
            return mockDate.getTime();
        }
    };
    return () => { global.Date = originalDate; };
}

// Mock TimetableSkill for testing (overrides getSupabase for DI)
class MockTimetableSkill extends TimetableSkill {
    private mockSupabase: any;

    constructor(mockSupabase: any) {
        super();
        this.mockSupabase = mockSupabase;
    }

    protected getSupabase() {
        return this.mockSupabase;
    }
}

test('[TimetableSkill] should successfully query and return timetable for valid station', async () => {
    const stationId = 'odpt.Station:JR-East.Yamanote.Shinjuku';

    // Mock Supabase client
    const mockSupabase = createMockSupabaseClient({ [stationId]: mockTimetableData[stationId] });
    const skill = new MockTimetableSkill(mockSupabase);

    // Mock weekday
    const restoreDate = mockDate(1); // Monday

    const context = createMockContext(stationId, 'timetable');
    const result = await skill.execute('新宿站時刻表', context);

    restoreDate();

    assert.ok(result, 'Should return a result');
    assert.equal(result!.source, 'algorithm');
    assert.equal(result!.type, 'card');
    assert.equal(result!.data.strategy, 'timetable_skill');
    assert.equal(result!.data.stationId, stationId);
    assert.equal(result!.data.calendarType, 'Weekday');
    assert.ok(Array.isArray(result!.data.timetables), 'Should have timetables array');
    assert.equal(result!.data.timetables.length, 2, 'Should have 2 Weekday timetables');
    assert.equal(result!.confidence, 0.98);
});

test('[TimetableSkill] should return error message for non-existent station', async () => {
    const stationId = 'odpt.Station:Invalid.Station';

    // Mock Supabase client with no data
    const mockSupabase = createMockSupabaseClient({});
    const skill = new MockTimetableSkill(mockSupabase);

    const context = createMockContext(stationId, 'timetable');
    const result = await skill.execute('無效站時刻表', context);

    assert.ok(result, 'Should return a result');
    assert.equal(result!.type, 'text');
    assert.ok(result!.content.includes('無法取得'), 'Should mention data unavailable');
    assert.equal(result!.confidence, 0.5);
});

test('[TimetableSkill] should return error when station ID is missing', async () => {
    const skill = new TimetableSkill();

    const context = createMockContext(undefined, 'timetable');
    const result = await skill.execute('時刻表', context);

    assert.ok(result, 'Should return a result');
    assert.equal(result!.type, 'text');
    assert.ok(result!.content.includes('請指定車站名稱'), 'Should ask for station name');
    assert.equal(result!.confidence, 1.0);
});

test('[TimetableSkill] should correctly determine Weekday calendar type', async () => {
    const skill = new TimetableSkill();
    const restoreDate = mockDate(2); // Tuesday (weekday)

    const calendarType = (skill as any).getCurrentCalendarType();
    restoreDate();

    assert.equal(calendarType, 'Weekday');
});

test('[TimetableSkill] should correctly determine SaturdayHoliday calendar type', async () => {
    const skill = new TimetableSkill();
    const restoreDate = mockDate(6); // Saturday

    const calendarType = (skill as any).getCurrentCalendarType();
    restoreDate();

    assert.equal(calendarType, 'SaturdayHoliday');
});

test('[TimetableSkill] should correctly determine Holiday calendar type', async () => {
    const skill = new TimetableSkill();
    const restoreDate = mockDate(0); // Sunday

    const calendarType = (skill as any).getCurrentCalendarType();
    restoreDate();

    assert.equal(calendarType, 'Holiday');
});

test('[TimetableSkill] should filter timetables by calendar type correctly', async () => {
    const stationId = 'odpt.Station:JR-East.Yamanote.Shinjuku';

    const mockSupabase = createMockSupabaseClient({ [stationId]: mockTimetableData[stationId] });
    const skill = new MockTimetableSkill(mockSupabase);

    // Mock Saturday
    const restoreDate = mockDate(6);

    const context = createMockContext(stationId, 'timetable');
    const result = await skill.execute('新宿站時刻表', context);

    restoreDate();

    assert.ok(result);
    assert.equal(result!.data.calendarType, 'SaturdayHoliday');
    assert.equal(result!.data.timetables.length, 1, 'Should only have SaturdayHoliday timetable');
    assert.ok(result!.data.timetables[0]['odpt:calendar'].includes('SaturdayHoliday'));
});

test('[TimetableSkill] should return error when no matching calendar type found', async () => {
    const stationId = 'odpt.Station:JR-East.Yamanote.Shinjuku';

    // Mock data with only Weekday timetables
    const weekdayOnlyData = mockTimetableData[stationId].filter(tt =>
        tt['odpt:calendar'].includes('Weekday')
    );

    const mockSupabase = createMockSupabaseClient({ [stationId]: weekdayOnlyData });
    const skill = new MockTimetableSkill(mockSupabase);

    // Mock Sunday (Holiday)
    const restoreDate = mockDate(0);

    const context = createMockContext(stationId, 'timetable');
    const result = await skill.execute('新宿站時刻表', context);

    restoreDate();

    assert.ok(result);
    assert.equal(result!.type, 'text');
    assert.ok(result!.content.includes('未找到'), 'Should mention no matching calendar data');
    assert.equal(result!.confidence, 0.6);
});

test('[TimetableSkill] should calculate relevance based on keywords', () => {
    const skill = new TimetableSkill();
    const context = createMockContext('odpt.Station:JR-East.Yamanote.Shinjuku');

    const score1 = skill.calculateRelevance('時刻表', context);
    assert.ok(score1 >= 0.5, 'Should have high relevance for timetable keyword');

    const score2 = skill.calculateRelevance('random query', context);
    assert.equal(score2, 0.0, 'Should have zero relevance for non-timetable query');
});

test('[TimetableSkill] should boost relevance for timetable intent', () => {
    const skill = new TimetableSkill();
    const contextWithIntent = createMockContext('odpt.Station:JR-East.Yamanote.Shinjuku', 'timetable');
    const contextWithoutIntent = createMockContext('odpt.Station:JR-East.Yamanote.Shinjuku');

    const score1 = skill.calculateRelevance('時刻表', contextWithIntent);
    const score2 = skill.calculateRelevance('時刻表', contextWithoutIntent);

    assert.ok(score1 > score2, 'Intent boost should increase relevance');
    assert.ok(score1 <= 1.0, 'Score should not exceed 1.0');
});

test('[TimetableSkill] should preserve ODPT data structure in response', async () => {
    const stationId = 'odpt.Station:JR-East.Yamanote.Shinjuku';

    const mockSupabase = createMockSupabaseClient({ [stationId]: mockTimetableData[stationId] });
    const skill = new MockTimetableSkill(mockSupabase);

    const restoreDate = mockDate(1); // Weekday

    const context = createMockContext(stationId, 'timetable');
    const result = await skill.execute('時刻表', context);

    restoreDate();

    assert.ok(result);
    const timetable = result!.data.timetables[0];

    // Verify ODPT structure
    assert.ok(timetable['@id'], 'Should have @id');
    assert.ok(timetable['odpt:calendar'], 'Should have calendar');
    assert.ok(timetable['odpt:railDirection'], 'Should have rail direction');
    assert.ok(Array.isArray(timetable['odpt:stationTimetableObject']), 'Should have departure array');

    const departure = timetable['odpt:stationTimetableObject'][0];
    assert.ok(departure['odpt:departureTime'], 'Departure should have time');
    assert.ok(departure['odpt:trainType'], 'Departure should have train type');
    assert.ok(departure['odpt:destinationStation'], 'Departure should have destination');
});

test('[TimetableSkill] should include calendar label in content', async () => {
    const stationId = 'odpt.Station:JR-East.Yamanote.Shinjuku';

    const mockSupabase = createMockSupabaseClient({ [stationId]: mockTimetableData[stationId] });
    const skill = new MockTimetableSkill(mockSupabase);

    const restoreDate = mockDate(1); // Weekday

    const context = createMockContext(stationId, 'timetable');
    const result = await skill.execute('時刻表', context);

    restoreDate();

    assert.ok(result);
    assert.ok(result!.content.includes('平日'), 'Content should include calendar label');
});

console.log('✅ All TimetableSkill unit tests completed');
