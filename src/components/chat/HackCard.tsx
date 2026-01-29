import { Lightbulb, Sparkles } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Action } from './ActionCard';

import { resolveText } from '@/lib/i18n/utils';

interface HackCardProps {
    action: Action;
    onClick: (action: Action) => void;
}

export function HackCard({ action, onClick }: HackCardProps) {
    // TODO: Move to shared hook (DRY) -> DONE
    const t = useTranslations('chat');
    const currentLocale = useLocale();

    const effectiveTitle = resolveText(action.title, currentLocale) || resolveText(action.label, currentLocale);
    const effectiveContent = resolveText(action.content, currentLocale) || resolveText(action.description, currentLocale);

    return (
        <button
            onClick={() => onClick(action)}
            className="w-full group relative overflow-hidden flex flex-col p-4 rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50 to-emerald-50 transition-all duration-300 active:scale-95 text-left shadow-sm hover:shadow-md"
        >
            <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-full shadow-sm shrink-0 text-teal-600">
                    <Lightbulb size={20} />
                </div>

                <div className="flex-1">
                    <h3 className="font-bold text-base text-teal-900 flex items-center gap-2">
                        {effectiveTitle}
                    </h3>

                    <p className="text-sm mt-1 text-teal-800/80 leading-relaxed">
                        {effectiveContent}
                    </p>
                </div>

                <div className="absolute top-2 right-2 opacity-10 text-teal-600 rotate-12">
                    <Sparkles size={40} />
                </div>
            </div>
        </button>
    );
}
