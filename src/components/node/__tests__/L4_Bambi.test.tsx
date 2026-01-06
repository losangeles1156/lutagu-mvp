
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { L4_Bambi } from '../L4_Bambi';
import type { StationUIProfile } from '@/lib/types/stationStandard';

// Mock dependencies
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en'
}));

jest.mock('@/hooks/useZoneAwareness', () => ({
  useZoneAwareness: () => ({ zone: 'core' })
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    body: {
      getReader: () => ({
        read: jest.fn()
          .mockResolvedValueOnce({ 
            done: false, 
            value: new TextEncoder().encode('data: {"event":"message","answer":"Hello"}\n') 
          })
          .mockResolvedValueOnce({ done: true })
      })
    }
  })
) as jest.Mock;

describe('L4_Bambi Component', () => {
  const mockData: StationUIProfile = {
    id: 'test-station',
    tier: 'minor',
    name: { ja: 'テスト駅', en: 'Test Station', zh: '測試車站' },
    description: { ja: '', en: '', zh: '' },
    l1_dna: {
      categories: {},
      vibe_tags: [],
      last_updated: new Date().toISOString()
    },
    l2: {
      lines: [],
      weather: { temp: 0, condition: 'clear', windSpeed: 0 },
      crowd: { level: 1, trend: 'stable', userVotes: { total: 0, distribution: [0, 0, 0, 0, 0] } }
    },
    l3_facilities: [],
    l4_cards: []
  };

  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders correctly', () => {
    render(<L4_Bambi data={mockData} />);
    
    // Check for static elements (keys from translation mock)
    expect(screen.getByText('bambiStrategy')).toBeTruthy();
    expect(screen.getByText('subtitle')).toBeTruthy();
  });

  it('injects core params for Fastest Route quick button', async () => {
    render(<L4_Bambi data={mockData} />);

    fireEvent.click(screen.getByText('Fastest Route'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    const payload = JSON.parse(init.body);

    expect(payload.inputs.zone).toBe('core');
    expect(payload.inputs.current_station).toBe('test-station');
    expect(payload.inputs.station_name).toBe('測試車站');
    expect(payload.inputs.user_profile).toBe('general');
    expect(payload.inputs.user_context).toEqual(['rush']);
    expect(String(payload.query)).toContain('Task: Route planning');
  });

  it('injects accessibility params for Accessibility quick button', async () => {
    render(<L4_Bambi data={mockData} />);

    fireEvent.click(screen.getByText('Accessibility'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    const payload = JSON.parse(init.body);

    expect(payload.inputs.zone).toBe('core');
    expect(payload.inputs.current_station).toBe('test-station');
    expect(payload.inputs.user_profile).toBe('wheelchair');
    expect(payload.inputs.user_context).toEqual(['accessibility']);
    expect(String(payload.query)).toContain('Task: Accessibility guidance');
  });

  it('injects disruption params for Delays & Backup quick button', async () => {
    render(<L4_Bambi data={mockData} />);

    fireEvent.click(screen.getByText('Delays & Backup'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    const payload = JSON.parse(init.body);

    expect(payload.inputs.zone).toBe('core');
    expect(payload.inputs.current_station).toBe('test-station');
    expect(payload.inputs.user_profile).toBe('general');
    expect(payload.inputs.user_context).toEqual(['rush']);
    expect(String(payload.query)).toContain('Task: Live disruptions');
  });
});
