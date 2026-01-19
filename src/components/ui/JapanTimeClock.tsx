
'use client';

import { useEffect, useState } from 'react';
import { getJSTTime } from '@/lib/utils/timeUtils';
import { Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export function JapanTimeClock({ className }: { className?: string }) {
    const [time, setTime] = useState(getJSTTime());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(getJSTTime());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const getTimeStyle = (hour: number) => {
        if (hour >= 5 && hour < 11) return 'from-amber-50/50 to-orange-50/30 border-orange-100/50'; // Morning
        if (hour >= 11 && hour < 16) return 'from-sky-50/50 to-indigo-50/30 border-indigo-100/50'; // Day
        if (hour >= 16 && hour < 19) return 'from-orange-50/50 to-rose-50/30 border-rose-100/50'; // Evening
        return 'from-slate-900/5 to-indigo-900/10 border-indigo-900/5'; // Night
    };

    const formatTime = (h: number, m: number) => {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    return (
        <div className={cn(
            "glass-effect rounded-2xl p-3 shadow-xl shadow-black/5 flex flex-col items-center justify-center min-w-[100px] border transition-all duration-1000 bg-gradient-to-br",
            getTimeStyle(time.hour),
            className
        )}>
            <div className="flex items-center gap-2 text-indigo-600 font-black text-sm mb-0.5">
                <Clock size={14} className={cn(time.hour >= 19 || time.hour < 5 ? "text-indigo-400" : "text-indigo-600")} />
                <span className={cn(time.hour >= 19 || time.hour < 5 ? "text-indigo-900" : "text-indigo-600")}>
                    {formatTime(time.hour, time.minute)}
                </span>
                <span className="text-[10px] opacity-40 font-medium">JST</span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold">
                <Calendar size={12} className="opacity-50" />
                <span>{time.date.getMonth() + 1}/{time.date.getDate()}</span>
                {time.isHoliday && (
                    <span className="ml-1 px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[8px] font-black tracking-tighter animate-pulse shadow-sm shadow-rose-200">
                        {time.holidayName?.split('(')[0].trim() || 'HOLIDAY'}
                    </span>
                )}
            </div>
        </div>
    );
}
