'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Calendar, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

interface DateTimePickerProps {
    value: Date | null;
    onChange: (date: Date | null) => void;
    minDate?: Date;
    maxDate?: Date;
    placeholder?: string;
    showTime?: boolean;
    showDate?: boolean;
    className?: string;
}

export function DateTimePicker({
    value,
    onChange,
    minDate,
    maxDate,
    placeholder = '選擇日期時間',
    showTime = true,
    showDate = true,
    className = ''
}: DateTimePickerProps) {
    const locale = useLocale();
    const t = useTranslations('dateTimePicker');

    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState<Date>(value || new Date());
    const [viewMode, setViewMode] = useState<'date' | 'time'>('date');

    const containerRef = useRef<HTMLDivElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Calendar helpers
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const formatDate = (date: Date) => {
        if (locale === 'ja') {
            return date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
            });
        }
        if (locale === 'en') {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
            });
        }
        return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const formatDisplay = (date: Date | null) => {
        if (!date) return placeholder;
        if (showDate && showTime) {
            return `${formatDate(date)} ${formatTime(date)}`;
        }
        if (showDate) return formatDate(date);
        if (showTime) return formatTime(date);
        return formatDate(date);
    };

    const handleDateSelect = (day: number) => {
        const newDate = new Date(viewDate);
        newDate.setDate(day);

        // Reset time to current or preserve
        if (value) {
            newDate.setHours(value.getHours(), value.getMinutes());
        } else {
            const now = new Date();
            newDate.setHours(now.getHours(), now.getMinutes());
        }

        if (minDate && newDate < minDate) return;
        if (maxDate && newDate > maxDate) return;

        onChange(newDate);
        if (!showTime) {
            setIsOpen(false);
        } else {
            setViewMode('time');
        }
    };

    const handleTimeChange = (type: 'hour' | 'minute', delta: number) => {
        const newDate = value ? new Date(value) : new Date();
        const maxHours = 23;
        const maxMinutes = 59;

        if (type === 'hour') {
            newDate.setHours(Math.max(0, Math.min(maxHours, newDate.getHours() + delta)));
        } else {
            newDate.setMinutes(Math.max(0, Math.min(maxMinutes, newDate.getMinutes() + delta)));
        }

        onChange(newDate);
    };

    const handleQuickSelect = (type: 'now' | 'today18' | 'tomorrow10') => {
        const now = new Date();
        let newDate = new Date();

        switch (type) {
            case 'now':
                newDate = now;
                break;
            case 'today18':
                newDate.setHours(18, 0, 0, 0);
                break;
            case 'tomorrow10':
                newDate.setDate(newDate.getDate() + 1);
                newDate.setHours(10, 0, 0, 0);
                break;
        }

        onChange(newDate);
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange(null);
        setIsOpen(false);
    };

    const handleConfirm = () => {
        if (value) {
            setIsOpen(false);
        }
    };

    const prevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const isSelectedDate = (day: number) => {
        if (!value) return false;
        return value.getDate() === day &&
               value.getMonth() === viewDate.getMonth() &&
               value.getFullYear() === viewDate.getFullYear();
    };

    const isToday = (day: number) => {
        const today = new Date();
        return day === today.getDate() &&
               viewDate.getMonth() === today.getMonth() &&
               viewDate.getFullYear() === today.getFullYear();
    };

    const isDisabledDate = (day: number) => {
        const date = new Date(viewDate);
        date.setDate(day);
        if (minDate && date < minDate) return true;
        if (maxDate && date > maxDate) return true;
        return false;
    };

    // Generate calendar days
    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const weekDays = locale === 'ja'
        ? ['日', '月', '火', '水', '木', '金', '土']
        : locale === 'en'
            ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            : ['日', '一', '二', '三', '四', '五', '六'];

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!value) {
                        setViewDate(new Date());
                    }
                }}
                className={`
                    w-full flex items-center gap-3 px-4 py-4
                    bg-slate-50 border-0 rounded-xl
                    text-left transition-all
                    hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500
                    min-h-[52px]
                `}
            >
                <Calendar size={20} className="text-slate-400 shrink-0" />
                <span className={`text-sm font-bold ${value ? 'text-slate-900' : 'text-slate-400'}`}>
                    {formatDisplay(value)}
                </span>
            </button>

            {/* Picker Panel */}
            {isOpen && (
                <div
                    ref={pickerRef}
                    className="absolute top-full left-0 right-0 mt-2
                        bg-white rounded-2xl shadow-xl border border-slate-100
                        z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                >
                    {/* Tabs */}
                    {showDate && showTime && (
                        <div className="flex border-b border-slate-100">
                            <button
                                onClick={() => setViewMode('date')}
                                className={`flex-1 py-3 text-sm font-bold transition-colors
                                    ${viewMode === 'date'
                                        ? 'text-indigo-600 bg-indigo-50'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <Calendar size={16} className="inline mr-2" />
                                {t('date')}
                            </button>
                            <button
                                onClick={() => setViewMode('time')}
                                className={`flex-1 py-3 text-sm font-bold transition-colors
                                    ${viewMode === 'time'
                                        ? 'text-indigo-600 bg-indigo-50'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <Clock size={16} className="inline mr-2" />
                                {t('time')}
                            </button>
                        </div>
                    )}

                    {/* Date View */}
                    {viewMode === 'date' && showDate && (
                        <div className="p-4">
                            {/* Month Navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    onClick={prevMonth}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="text-sm font-bold text-slate-900">
                                    {viewDate.toLocaleDateString(locale, { year: 'numeric', month: 'long' })}
                                </div>
                                <button
                                    onClick={nextMonth}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            {/* Week Days */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {weekDays.map((day, idx) => (
                                    <div
                                        key={idx}
                                        className="text-center text-xs font-bold text-slate-400 py-2"
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {days.map((day, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => day && handleDateSelect(day)}
                                        disabled={!day || isDisabledDate(day)}
                                        className={`
                                            aspect-square flex items-center justify-center
                                            text-sm font-bold rounded-xl transition-all
                                            min-h-[44px]
                                            ${!day ? 'invisible' : ''}
                                            ${isSelectedDate(day!)
                                                ? 'bg-indigo-600 text-white'
                                                : isToday(day!)
                                                    ? 'bg-indigo-50 text-indigo-600'
                                                    : 'hover:bg-slate-100 text-slate-700'
                                            }
                                            ${isDisabledDate(day!) ? 'opacity-30 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>

                            {/* Quick Select */}
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleQuickSelect('now')}
                                        className="flex-1 py-2 px-3 text-xs font-bold
                                            bg-slate-100 text-slate-600 rounded-lg
                                            hover:bg-slate-200 transition-colors min-h-[40px]"
                                    >
                                        {t('now')}
                                    </button>
                                    <button
                                        onClick={() => handleQuickSelect('today18')}
                                        className="flex-1 py-2 px-3 text-xs font-bold
                                            bg-slate-100 text-slate-600 rounded-lg
                                            hover:bg-slate-200 transition-colors min-h-[40px]"
                                    >
                                        {t('today18')}
                                    </button>
                                    <button
                                        onClick={() => handleQuickSelect('tomorrow10')}
                                        className="flex-1 py-2 px-3 text-xs font-bold
                                            bg-slate-100 text-slate-600 rounded-lg
                                            hover:bg-slate-200 transition-colors min-h-[40px]"
                                    >
                                        {t('tomorrow10')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Time View */}
                    {viewMode === 'time' && showTime && (
                        <div className="p-4">
                            {/* Time Display */}
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center gap-4 text-3xl font-black text-slate-900">
                                    <button
                                        onClick={() => handleTimeChange('hour', -1)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                    >
                                        -
                                    </button>
                                    <span>{String(value?.getHours() || 0).padStart(2, '0')}</span>
                                    <span>:</span>
                                    <span>{String(value?.getMinutes() || 0).padStart(2, '0')}</span>
                                    <button
                                        onClick={() => handleTimeChange('hour', 1)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Quick Select */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleQuickSelect('now')}
                                    className="py-3 text-sm font-bold
                                        bg-slate-100 text-slate-600 rounded-xl
                                        hover:bg-slate-200 transition-colors min-h-[44px]"
                                >
                                    {t('now')}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!value}
                                    className="py-3 text-sm font-bold
                                        bg-indigo-600 text-white rounded-xl
                                        hover:bg-indigo-700 transition-colors
                                        disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                                >
                                    {t('confirm')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100 flex justify-between">
                        <button
                            onClick={handleClear}
                            className="py-2 px-4 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            {t('clear')}
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="py-2 px-4 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                            {t('close')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DateTimePicker;
