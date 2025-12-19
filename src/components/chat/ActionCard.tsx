import { MapPin, Info, CalendarPlus, Train, Car, Navigation, Zap, Banknote } from 'lucide-react';
import { TrapCard } from './TrapCard';
import { HackCard } from './HackCard';

export type ActionType = 'navigate' | 'details' | 'trip' | 'transit' | 'taxi' | 'discovery' | 'trap' | 'hack';

export interface Action {
    type: ActionType;
    label: string;
    target: string;
    description?: string;
    price?: string;
    timeSaved?: string;
    metadata?: any;
    // New fields for Wisdom Cards
    title?: string;
    content?: string;
    severity?: 'medium' | 'high' | 'critical';
}

interface ActionCardProps {
    action: Action;
    onClick: (action: Action) => void;
}

const CONFIG: Record<string, any> = {
    navigate: {
        icon: MapPin,
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-100',
        hoverColor: 'hover:bg-blue-100'
    },
    details: {
        icon: Info,
        bgColor: 'bg-indigo-50',
        textColor: 'text-indigo-700',
        borderColor: 'border-indigo-100',
        hoverColor: 'hover:bg-indigo-100'
    },
    trip: {
        icon: CalendarPlus,
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-100',
        hoverColor: 'hover:bg-green-100'
    },
    transit: {
        icon: Train,
        bgColor: 'bg-slate-50',
        textColor: 'text-slate-700',
        borderColor: 'border-slate-200',
        hoverColor: 'hover:bg-slate-100'
    },
    taxi: {
        icon: Car,
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-800',
        borderColor: 'border-amber-100',
        hoverColor: 'hover:bg-amber-100'
    },
    discovery: {
        icon: Navigation,
        bgColor: 'bg-rose-50',
        textColor: 'text-rose-700',
        borderColor: 'border-rose-100',
        hoverColor: 'hover:bg-rose-100'
    }
};

export function ActionCard({ action, onClick }: ActionCardProps) {
    // 1. Specialized Cards
    if (action.type === 'trap') {
        return <TrapCard action={action} onClick={onClick} />;
    }
    if (action.type === 'hack') {
        return <HackCard action={action} onClick={onClick} />;
    }

    // 2. Standard Cards (Legacy Logic)
    const config = CONFIG[action.type] || CONFIG.details;
    const Icon = config.icon;

    return (
        <button
            onClick={() => onClick(action)}
            className={`w-full group relative overflow-hidden flex flex-col p-4 rounded-2xl border transition-all duration-300 active:scale-95 text-left shadow-sm hover:shadow-md ${config.bgColor} ${config.borderColor} ${config.hoverColor}`}
        >
            <div className="flex items-start gap-4">
                <div className={`p-2.5 bg-white rounded-xl shadow-sm group-hover:shadow transition-shadow ${config.textColor}`}>
                    <Icon size={20} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className={`font-bold text-base ${config.textColor} truncate`}>
                            {action.label}
                        </div>
                        {action.timeSaved && (
                            <span className="flex items-center gap-1 text-[10px] font-black bg-white/80 px-2 py-0.5 rounded-full text-green-600 uppercase tracking-tighter shadow-sm whitespace-nowrap">
                                <Zap size={10} fill="currentColor" />
                                省下 {action.timeSaved}
                            </span>
                        )}
                    </div>

                    {action.description && (
                        <div className="text-xs text-black/50 mt-0.5 leading-relaxed font-medium">
                            {action.description}
                        </div>
                    )}

                    {(action.price) && (
                        <div className="flex items-center gap-1.5 mt-2">
                            {action.price && (
                                <div className="flex items-center gap-1 text-[11px] font-bold text-black/60 bg-white/40 px-2.5 py-1 rounded-lg border border-white/50">
                                    <Banknote size={12} className="opacity-50" />
                                    {action.price}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={`self-center text-lg ${config.textColor} opacity-10 group-hover:opacity-100 group-hover:translate-x-1 transition-all`}>
                    →
                </div>
            </div>
        </button>
    );
}
