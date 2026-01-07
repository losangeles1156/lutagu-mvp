
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { L4_Chat } from '../L4_Chat';
import type { StationUIProfile } from '@/lib/types/stationStandard';

// Mock dependencies
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'zh-TW'
}));

jest.mock('@/hooks/useZoneAwareness', () => ({
  useZoneAwareness: () => ({ zone: 'core' })
}));

// Mock useDifyChat hook
jest.mock('@/hooks/useDifyChat', () => ({
  useDifyChat: jest.fn(() => ({
    messages: [
      { role: 'assistant', content: 'initialMessage' }
    ],
    setMessages: jest.fn(),
    isLoading: false,
    isOffline: false,
    thinkingStep: '',
    sendMessage: jest.fn(),
    quickButtons: () => [
      { id: 'route', label: 'Fastest Route', prompt: 'Task: Route planning', profile: 'general', demands: ['speed'] },
      { id: 'accessibility', label: 'Accessibility', prompt: 'Task: Accessibility guidance', profile: 'wheelchair', demands: ['accessibility'] },
      { id: 'disruption', label: 'Delays & Backup', prompt: 'Task: Live disruptions', profile: 'general', demands: ['speed'] }
    ],
    messagesEndRef: { current: null }
  })),
}));

// Mock fetch for Dify API
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

describe('L4_Chat Component (Bambi Variant)', () => {
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

  it('renders correctly with bambi variant', () => {
    render(
      <L4_Chat 
        data={mockData} 
        variant="bambi"
      />
    );
    
    // Check for static elements (keys from translation mock)
    expect(screen.getByText('bambiStrategy')).toBeTruthy();
    expect(screen.getByText('subtitle')).toBeTruthy();
  });

  it('renders correctly with strategy variant', () => {
    render(
      <L4_Chat 
        data={mockData} 
        variant="strategy"
      />
    );
    
    // Strategy variant should show station name instead
    expect(screen.getByText('測試車站')).toBeTruthy();
  });

  it('injects core params for Fastest Route quick button', async () => {
    const { useDifyChat } = require('@/hooks/useDifyChat');
    const mockSendMessage = jest.fn();
    (useDifyChat as jest.Mock).mockReturnValue({
      messages: [{ role: 'assistant', content: 'initialMessage' }],
      setMessages: jest.fn(),
      isLoading: false,
      isOffline: false,
      thinkingStep: '',
      sendMessage: mockSendMessage,
      quickButtons: () => [
        { id: 'route', label: 'Fastest Route', prompt: 'Task: Route planning', profile: 'general', demands: ['speed'] }
      ],
      messagesEndRef: { current: null }
    });

    render(
      <L4_Chat 
        data={mockData} 
        variant="bambi"
      />
    );

    fireEvent.click(screen.getByText('Fastest Route'));

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Task: Route planning', 'general');
    });
  });

  it('injects accessibility params for Accessibility quick button', async () => {
    const { useDifyChat } = require('@/hooks/useDifyChat');
    const mockSendMessage = jest.fn();
    (useDifyChat as jest.Mock).mockReturnValue({
      messages: [{ role: 'assistant', content: 'initialMessage' }],
      setMessages: jest.fn(),
      isLoading: false,
      isOffline: false,
      thinkingStep: '',
      sendMessage: mockSendMessage,
      quickButtons: () => [
        { id: 'accessibility', label: 'Accessibility', prompt: 'Task: Accessibility guidance', profile: 'wheelchair', demands: ['accessibility'] }
      ],
      messagesEndRef: { current: null }
    });

    render(
      <L4_Chat 
        data={mockData} 
        variant="bambi"
      />
    );

    fireEvent.click(screen.getByText('Accessibility'));

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Task: Accessibility guidance', 'wheelchair');
    });
  });

  it('injects disruption params for Delays & Backup quick button', async () => {
    const { useDifyChat } = require('@/hooks/useDifyChat');
    const mockSendMessage = jest.fn();
    (useDifyChat as jest.Mock).mockReturnValue({
      messages: [{ role: 'assistant', content: 'initialMessage' }],
      setMessages: jest.fn(),
      isLoading: false,
      isOffline: false,
      thinkingStep: '',
      sendMessage: mockSendMessage,
      quickButtons: () => [
        { id: 'disruption', label: 'Delays & Backup', prompt: 'Task: Live disruptions', profile: 'general', demands: ['speed'] }
      ],
      messagesEndRef: { current: null }
    });

    render(
      <L4_Chat 
        data={mockData} 
        variant="bambi"
      />
    );

    fireEvent.click(screen.getByText('Delays & Backup'));

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Task: Live disruptions', 'general');
    });
  });

  it('shows loading state when sending message', () => {
    const { useDifyChat } = require('@/hooks/useDifyChat');
    (useDifyChat as jest.Mock).mockReturnValue({
      messages: [{ role: 'assistant', content: 'initialMessage' }],
      setMessages: jest.fn(),
      isLoading: true,
      isOffline: false,
      thinkingStep: 'thinking',
      sendMessage: jest.fn(),
      quickButtons: () => [],
      messagesEndRef: { current: null }
    });

    render(
      <L4_Chat 
        data={mockData} 
        variant="bambi"
      />
    );

    // Should show loading indicator
    expect(screen.getByText('loading')).toBeTruthy();
  });

  it('handles offline state gracefully', () => {
    const { useDifyChat } = require('@/hooks/useDifyChat');
    (useDifyChat as jest.Mock).mockReturnValue({
      messages: [{ role: 'assistant', content: 'initialMessage' }],
      setMessages: jest.fn(),
      isLoading: false,
      isOffline: true,
      thinkingStep: '',
      sendMessage: jest.fn(),
      quickButtons: () => [],
      messagesEndRef: { current: null }
    });

    render(
      <L4_Chat 
        data={mockData} 
        variant="bambi"
      />
    );

    // Should show offline indicator
    expect(screen.getByText('離線')).toBeTruthy();
  });

  it('handles seed question prop', () => {
    const { useDifyChat } = require('@/hooks/useDifyChat');
    const mockSendMessage = jest.fn();
    (useDifyChat as jest.Mock).mockReturnValue({
      messages: [{ role: 'assistant', content: 'initialMessage' }],
      setMessages: jest.fn(),
      isLoading: false,
      isOffline: false,
      thinkingStep: '',
      sendMessage: mockSendMessage,
      quickButtons: () => [],
      messagesEndRef: { current: null }
    });

    render(
      <L4_Chat 
        data={mockData} 
        variant="strategy"
        seedQuestion="Test question"
        seedUserProfile="general"
      />
    );

    // Should send the seed question
    expect(mockSendMessage).toHaveBeenCalledWith('Test question', 'general');
  });
});
