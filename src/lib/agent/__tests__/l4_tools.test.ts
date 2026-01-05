
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { TOOL_HANDLERS } from '../toolDefinitions';
import { odptClient } from '@/lib/odpt/client';

// Save original methods
const originalGetFares = odptClient.getFares;
const originalGetStationTimetable = odptClient.getStationTimetable;

describe('L4 Tool Handlers', () => {
  const mockContext = {
    locale: 'zh-TW',
    userProfile: 'general'
  };

  beforeEach(() => {
    // Reset mocks
    odptClient.getFares = originalGetFares;
    odptClient.getStationTimetable = originalGetStationTimetable;
  });

  describe('get_fare', () => {
    it('should return fare information for valid stations', async () => {
      // Mock implementation
      odptClient.getFares = async () => ([
        {
          'odpt:fromStation': 'odpt.Station:TokyoMetro.Ginza.Ueno',
          'odpt:toStation': 'odpt.Station:TokyoMetro.Ginza.Asakusa',
          'odpt:ticketFare': 170,
          'odpt:icCardFare': 168
        }
      ]);

      const result = await TOOL_HANDLERS.get_fare({
        fromStation: 'odpt.Station:TokyoMetro.Ginza.Ueno',
        toStation: 'odpt.Station:TokyoMetro.Ginza.Asakusa'
      }, mockContext);

      assert.match(result, /168/);
      assert.match(result, /170/);
    });

    it('should handle API errors gracefully', async () => {
        odptClient.getFares = async () => { throw new Error('API Error'); };

      const result = await TOOL_HANDLERS.get_fare({
        fromStation: 'A',
        toStation: 'B'
      }, mockContext);

      assert.match(result, /⚠️/);
    });
  });

  describe('get_timetable', () => {
    it('should return timetable for a station', async () => {
      // Create trips for all hours to ensure coverage regardless of current time
      const trips = [];
      for (let h = 0; h < 24; h++) {
          trips.push({ 
              'odpt:departureTime': `${h.toString().padStart(2, '0')}:00`, 
              'odpt:destinationStation': ['odpt.Station:TokyoMetro.Ginza.Shibuya'] 
          });
          trips.push({ 
              'odpt:departureTime': `${h.toString().padStart(2, '0')}:30`, 
              'odpt:destinationStation': ['odpt.Station:TokyoMetro.Ginza.Shibuya'] 
          });
      }

      odptClient.getStationTimetable = async () => ([
        {
          'odpt:railway': 'odpt.Railway:TokyoMetro.Ginza',
          'odpt:railwayDirection': 'odpt.RailDirection:TokyoMetro.Shibuya',
          'odpt:calendar': 'odpt.Calendar:Weekday',
          'odpt:stationTimetableObject': trips
        },
        {
          'odpt:railway': 'odpt.Railway:TokyoMetro.Ginza',
          'odpt:railwayDirection': 'odpt.RailDirection:TokyoMetro.Shibuya',
          'odpt:calendar': 'odpt.Calendar:SaturdayHoliday',
          'odpt:stationTimetableObject': trips
        }
      ]);

      const result = await TOOL_HANDLERS.get_timetable({
        stationId: 'odpt.Station:TokyoMetro.Ginza.Ueno'
      }, mockContext);

      // Check for Shibuya direction or destination
      assert.match(result, /Shibuya/);
      // It should have some time, e.g. matching \d{2}:\d{2}
      assert.match(result, /\d{2}:\d{2}/);
    });
  });

  describe('get_route', () => {
    it('should suggest route based on simple logic', async () => {
      const result = await TOOL_HANDLERS.get_route({
        fromStation: 'odpt.Station:TokyoMetro.Ginza.Ueno',
        toStation: 'odpt.Station:JR-East.Yamanote.Shinjuku'
      }, mockContext);

      assert.match(result, /Ueno/);
      assert.match(result, /Shinjuku/);
    });
  });
});
