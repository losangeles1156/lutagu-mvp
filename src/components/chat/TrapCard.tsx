import { AlertTriangle, XOctagon } from 'lucide-react';
import { Action } from './ActionCard';

interface TrapCardProps {
    action: Action;
    onClick: (action: Action) => void;
}

export function TrapCard({ action, onClick }: TrapCardProps) {
    const severity = action.severity || 'medium';

    const styles = {
        critical: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-800',
            icon: XOctagon,
            iconColor: 'text-red-600'
        },
        high: {
            bg: 'bg-orange-50',
            border: 'border-orange-200',
            text: 'text-orange-800',
            icon: AlertTriangle,
            iconColor: 'text-orange-600'
        },
        medium: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            text: 'text-yellow-800',
            icon: AlertTriangle,
            iconColor: 'text-yellow-600'
        }
    };

    const config = styles[severity] || styles.medium;
    const Icon = config.icon;

    return (
        <button
            onClick={() => onClick(action)}
            className={`w-full group relative overflow-hidden flex flex-col p-4 rounded-2xl border-2 transition-all duration-300 active:scale-95 text-left shadow-sm hover:shadow-md ${config.bg} ${config.border}`}
        >
            <div className="flex items-start gap-3">
                <div className={`p-2 bg-white rounded-lg shadow-sm shrink-0 ${config.iconColor}`}>
                    <Icon size={24} />
                </div>

                <div className="flex-1">
                    <h3 className={`font-bold text-base ${config.text} flex items-center gap-2`}>
                        {action.title || action.label}
                        <span className="text-[10px] uppercase border px-1.5 py-0.5 rounded-full font-black opacity-70 border-current">
                            {severity} Trap
                        </span>
                    </h3>

                    <p className={`text-sm mt-1 opacity-90 font-medium ${config.text}`}>
                        {action.content || action.description}
                    </p>

                    {action.metadata?.advice && (
                        <div className="mt-3 text-xs bg-white/60 p-2 rounded-lg font-mono leading-relaxed">
                            💡 建議：{action.metadata.advice}
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
}
