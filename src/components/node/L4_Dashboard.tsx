'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserPreferences } from '@/types/lutagu_l4';

import { useAppStore } from '@/stores/appStore';

// Types for Card response (Mirroring API response)
interface ActionCard {
    id: string;
    type: 'primary' | 'warning' | 'info' | 'secondary' | 'ai_suggestion';
    icon: string;
    title: string;
    description: string;
    priority: number;
    actionLabel?: string;
    actionUrl?: string;
}

interface L4DashboardProps {
    currentNodeId: string;
    locale?: 'zh-TW' | 'ja' | 'en';
}

export default function L4_Dashboard({ currentNodeId, locale = 'zh-TW' }: L4DashboardProps) {
    // 1. State Management
    const [preferences, setPreferences] = useState<UserPreferences>({
        accessibility: { wheelchair: false, stroller: false, visual_impairment: false, elderly: false },
        luggage: { large_luggage: false, multiple_bags: false },
        travel_style: { rushing: false, budget: false, comfort: false, avoid_crowd: false, avoid_rain: false },
        companions: { with_children: false, family_trip: false }
    });

    const [cards, setCards] = useState<ActionCard[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [destination, setDestination] = useState('');

    // 2. Fetch Logic
    const fetchRecommendations = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/l4/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stationId: currentNodeId,
                    userPreferences: preferences,
                    locale
                })
            });
            const data = await res.json();
            if (data.cards) {
                setCards(data.cards);
            }
        } catch (error) {
            console.error('Failed to fetch recommendations:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentNodeId, preferences, locale]);

    // Initial fetch and fetch on preference change
    useEffect(() => {
        fetchRecommendations();
    }, [fetchRecommendations]);


    // 3. UI Helpers
    const togglePreference = <C extends keyof UserPreferences>(category: C, key: keyof UserPreferences[C]) => {
        setPreferences(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: !prev[category][key]
            }
        }));
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-y-auto pb-24">

            {/* Block 1: User State Selector */}
            <div className="bg-white p-4 shadow-sm mb-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    {locale === 'zh-TW' ? '您的狀態' : 'Your Status'}
                </h3>
                <div className="flex flex-wrap gap-2">
                    {/* Luggage Group */}
                    <Chip
                        label="🧳 大行李"
                        active={preferences.luggage.large_luggage}
                        onClick={() => togglePreference('luggage', 'large_luggage')}
                    />
                    <Chip
                        label="👶 嬰兒車"
                        active={preferences.accessibility.stroller}
                        onClick={() => togglePreference('accessibility', 'stroller')}
                    />
                    <Chip
                        label="🦽 輪椅"
                        active={preferences.accessibility.wheelchair}
                        onClick={() => togglePreference('accessibility', 'wheelchair')}
                    />
                    <Chip
                        label="⏰ 趕時間"
                        active={preferences.travel_style.rushing}
                        onClick={() => togglePreference('travel_style', 'rushing')}
                    />
                    <Chip
                        label="💰 省錢"
                        active={preferences.travel_style.budget}
                        onClick={() => togglePreference('travel_style', 'budget')}
                    />
                </div>
            </div>

            {/* Block 2 (Optional): Destination Input */}
            {/* <div className="bg-white p-4 shadow-sm mb-2"> ... </div> */}

            {/* Block 4: Result Cards */}
            <div className="flex-1 p-4 space-y-4">
                {isLoading ? (
                    <div className="text-center py-8 text-gray-500">
                        Thinking...
                    </div>
                ) : (
                    cards.map(card => (
                        <CardItem key={card.id} card={card} />
                    ))
                )}
            </div>

        </div>
    );
}

// --- Sub Components ---

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${active
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
        >
            {label}
        </button>
    );
}

function CardItem({ card }: { card: ActionCard }) {
    const getBorderColor = (type: string) => {
        switch (type) {
            case 'warning': return 'border-l-4 border-l-red-500';
            case 'info': return 'border-l-4 border-l-blue-400';
            case 'ai_suggestion': return 'border-l-4 border-l-purple-500 bg-purple-50/10';
            default: return 'border-l-4 border-l-green-500';
        }
    };

    return (
        <div className={`bg-white rounded-lg shadow-sm p-4 border border-gray-100 ${getBorderColor(card.type)}`}>
            <div className="flex items-start gap-3">
                <div className="text-2xl">{card.icon}</div>
                <div className="flex-1">
                    <h4 className="font-bold text-gray-800 mb-1">{card.title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {card.description}
                    </p>

                    {card.actionLabel && (
                        <button className="mt-3 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors">
                            {card.actionLabel} →
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
