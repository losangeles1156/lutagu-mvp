
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plane, ArrowUpRight, ArrowDownLeft, RefreshCcw, Loader2, AlertCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

interface Flight {
    id: string;
    time: string;
    scheduledTime: string;
    flightNumber: string;
    airline: string;
    location: string;
    status: string;
    gate: string;
    terminal: string;
}

interface FlightData {
    airport: string;
    type: string;
    flights: Flight[];
    updated: string;
}

interface LiveFlightBoardProps {
    airportCode: 'HND' | 'NRT';
}

export function LiveFlightBoard({ airportCode }: LiveFlightBoardProps) {
    const locale = useLocale(); // 'zh-TW', 'ja', 'en'

    const [activeTab, setActiveTab] = useState<'departure' | 'arrival'>('departure');

    // SWR Fetcher
    const fetcher = (url: string) => fetch(url).then((res) => res.json());

    // Use SWR for smart polling (auto pauses when tab hidden)
    const { data, error, isLoading, mutate } = useSWR<FlightData>(
        `/api/odpt/flight?airport=${airportCode}&type=${activeTab}`,
        fetcher,
        {
            refreshInterval: 60000, // Poll every 60s
            revalidateOnFocus: true,
            dedupingInterval: 5000, // Client side deduping
        }
    );

    const loading = isLoading; // Alias for compatibility with existing render logic

    // Translation helpers
    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('cancel')) return 'text-rose-600 bg-rose-50';
        if (s.includes('delay')) return 'text-amber-600 bg-amber-50';
        if (s.includes('board') || s.includes('go to gate')) return 'text-emerald-600 bg-emerald-50 animate-pulse';
        if (s.includes('departed') || s.includes('arrived')) return 'text-slate-400 bg-slate-50';
        return 'text-indigo-600 bg-indigo-50';
    };

    const getStatusText = (status: string) => {
        // Simple mapping, can be expanded
        if (locale === 'ja') {
            if (status === 'CheckIn') return '搭乗手続中';
            if (status === 'NowBoarding') return '搭乗中';
            if (status === 'BoardingComplete') return '搭乗終了';
            if (status === 'Departed') return '出発済';
            if (status === 'Arrived') return '到着';
            if (status === 'Cancelled') return '欠航';
            if (status === 'Delayed') return '遅延';
        }
        if (locale.startsWith('zh')) {
            if (status === 'CheckIn') return '辦理登機';
            if (status === 'NowBoarding') return '登機中';
            if (status === 'BoardingComplete') return '登機結束';
            if (status === 'Departed') return '已出發';
            if (status === 'Arrived') return '已抵達';
            if (status === 'Cancelled') return '取消';
            if (status === 'Delayed') return '延誤';
        }
        return status; // Default EN or raw
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            {/* Header / Tabs */}
            <div className="flex border-b border-slate-100">
                <button
                    onClick={() => setActiveTab('departure')}
                    className={`flex-1 py-3 text-sm font-black flex items-center justify-center gap-2 transition-colors ${activeTab === 'departure'
                        ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <ArrowUpRight size={16} />
                    {locale.startsWith('zh') ? '出發' : locale === 'ja' ? '出発' : 'Departures'}
                </button>
                <button
                    onClick={() => setActiveTab('arrival')}
                    className={`flex-1 py-3 text-sm font-black flex items-center justify-center gap-2 transition-colors ${activeTab === 'arrival'
                        ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-600'
                        : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <ArrowDownLeft size={16} />
                    {locale.startsWith('zh') ? '抵達' : locale === 'ja' ? '到着' : 'Arrivals'}
                </button>
            </div>

            {/* Status Bar */}
            <div className="px-4 py-2 bg-slate-50 flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                <div className="flex items-center gap-1">
                    <Plane size={12} />
                    <span>{airportCode} International</span>
                </div>
                <div className="flex items-center gap-2">
                    {data?.updated && <span>Updated {new Date(data.updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                    <button onClick={() => mutate()} disabled={loading} className={`${loading ? 'animate-spin' : ''}`}>
                        <RefreshCcw size={12} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="max-h-[300px] overflow-y-auto scrollbar-hide relative min-h-[150px]">
                {loading && !data && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                        <Loader2 className="animate-spin text-indigo-600" />
                    </div>
                )}

                {error && (
                    <div className="p-8 text-center text-rose-500 text-xs font-bold flex flex-col items-center gap-2">
                        <AlertCircle size={24} />
                        Failed to load data
                        <button onClick={() => mutate()} className="px-3 py-1 bg-rose-100 rounded-full mt-2">Retry</button>
                    </div>
                )}

                {!loading && data?.flights.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold">
                        No flights found for this period.
                    </div>
                )}

                <div className="divide-y divide-slate-100">
                    {data?.flights.map((flight) => (
                        <div key={flight.id} className="p-3 hover:bg-slate-50 transition-colors flex items-center gap-3">
                            {/* Time */}
                            <div className="text-center min-w-[48px]">
                                <div className="text-sm font-black text-slate-800">{flight.time}</div>
                                {flight.time !== flight.scheduledTime && (
                                    <div className="text-[10px] text-slate-400 line-through">{flight.scheduledTime}</div>
                                )}
                            </div>

                            {/* Flight Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs font-bold text-indigo-900 truncate">{flight.location}</span>
                                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                        {flight.airline} {flight.flightNumber.split(',')[0]}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                                    <span>T{flight.terminal}</span>
                                    <span className="flex items-center gap-1">
                                        Gate <span className="text-slate-700">{flight.gate}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Status */}
                            <div className={`shrink-0 px-2 py-1 rounded text-[10px] font-black uppercase text-center min-w-[60px] ${getStatusColor(flight.status)}`}>
                                {getStatusText(flight.status)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
