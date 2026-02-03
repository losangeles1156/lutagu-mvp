'use client';

import { Clock, Train, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TimetableCardProps {
    data: {
        stationId: string;
        calendarType: 'Weekday' | 'SaturdayHoliday' | 'Holiday';
        timetables: Array<{
            '@id': string;
            'odpt:calendar': string;
            'odpt:railDirection': string;
            'odpt:stationTimetableObject': Array<{
                'odpt:departureTime': string;
                'odpt:trainType': string;
                'odpt:destinationStation': string[];
                'odpt:isLast'?: boolean;
            }>;
        }>;
    };
}

export function TimetableCard({ data }: TimetableCardProps) {
    const t = useTranslations('l4.timetable');
    const { stationId, calendarType, timetables } = data;

    // Extract station name from ID
    const stationName = stationId.split(':').pop()?.split('.').pop() || 'Unknown';

    // Get calendar label
    const calendarLabels = {
        'Weekday': '平日',
        'SaturdayHoliday': '週六',
        'Holiday': '週日/假日'
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Train className="w-5 h-5 text-white" />
                        <h3 className="font-bold text-white">{stationName} 站</h3>
                    </div>
                    <span className="text-xs font-semibold text-white/90 bg-white/20 px-2 py-1 rounded-full">
                        {calendarLabels[calendarType]}
                    </span>
                </div>
            </div>

            {/* Timetables */}
            <div className="p-4 space-y-4">
                {timetables.map((tt, idx) => {
                    const direction = tt['odpt:railDirection']?.split(':').pop() || 'Unknown';
                    const departures = tt['odpt:stationTimetableObject'] || [];

                    // Show first 10 departures
                    const displayDepartures = departures.slice(0, 10);

                    return (
                        <div key={idx} className="border-b border-slate-100 pb-3 last:border-0">
                            {/* Direction Header */}
                            <div className="flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-indigo-500" />
                                <span className="text-sm font-bold text-slate-700">
                                    {direction === 'Northbound' && '北行'}
                                    {direction === 'Southbound' && '南行'}
                                    {direction === 'Eastbound' && '東行'}
                                    {direction === 'Westbound' && '西行'}
                                    {!['Northbound', 'Southbound', 'Eastbound', 'Westbound'].includes(direction) && direction}
                                </span>
                            </div>

                            {/* Departure List */}
                            <div className="grid grid-cols-2 gap-2">
                                {displayDepartures.map((dep, depIdx) => {
                                    const time = dep['odpt:departureTime'];
                                    const trainType = dep['odpt:trainType']?.split(':').pop() || '';
                                    const destination = dep['odpt:destinationStation']?.[0]?.split(':').pop()?.split('.').pop() || '';
                                    const isLast = dep['odpt:isLast'];

                                    return (
                                        <div
                                            key={depIdx}
                                            className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${isLast
                                                    ? 'bg-red-50 border border-red-200'
                                                    : 'bg-slate-50 hover:bg-slate-100'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Clock className={`w-3.5 h-3.5 ${isLast ? 'text-red-500' : 'text-slate-400'}`} />
                                                <span className={`font-mono text-sm font-bold ${isLast ? 'text-red-600' : 'text-slate-900'}`}>
                                                    {time}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={`text-[10px] font-bold uppercase ${trainType.includes('Express') ? 'text-orange-600' :
                                                        trainType.includes('Rapid') ? 'text-blue-600' :
                                                            trainType.includes('Local') ? 'text-slate-500' :
                                                                'text-indigo-600'
                                                    }`}>
                                                    {trainType === 'Express' && '特急'}
                                                    {trainType === 'Rapid' && '快速'}
                                                    {trainType === 'Local' && '普通'}
                                                    {!['Express', 'Rapid', 'Local'].includes(trainType) && trainType}
                                                </span>
                                                <span className="text-[9px] text-slate-400 truncate max-w-[80px]">
                                                    {destination}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {departures.length > 10 && (
                                <p className="text-xs text-slate-400 mt-2 text-center">
                                    還有 {departures.length - 10} 班列車...
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-4 py-2 border-t border-slate-100">
                <p className="text-[10px] text-slate-500 text-center">
                    資料來源：ODPT 靜態時刻表
                </p>
            </div>
        </div>
    );
}
