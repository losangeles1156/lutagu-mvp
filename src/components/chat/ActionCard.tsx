import { MapPin, Info, CalendarPlus } from 'lucide-react';

export type ActionType = 'navigate' | 'details' | 'trip';

export interface Action {
    type: ActionType;
    label: string;
    target: string; // nodeId or location alias
    metadata?: any; // Extra data like coords or full node object
}

interface ActionCardProps {
    action: Action;
    onClick: (action: Action) => void;
}

const CONFIG = {
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
    }
};

export function ActionCard({ action, onClick }: ActionCardProps) {
    const config = CONFIG[action.type] || CONFIG.details;
    const Icon = config.icon;

    return (
        <button
            onClick={() => onClick(action)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 active:scale-95 text-left group ${config.bgColor} ${config.borderColor} ${config.hoverColor}`}
        >
            <div className={`p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow ${config.textColor}`}>
                <Icon size={18} />
            </div>
            <div className="flex-1">
                <div className={`font-semibold text-sm ${config.textColor}`}>
                    {action.label}
                </div>
                {action.type === 'navigate' && (
                    <div className="text-xs text-gray-500 mt-0.5">
                        點擊飛往地點
                    </div>
                )}
            </div>
            <div className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                →
            </div>
        </button>
    );
}
