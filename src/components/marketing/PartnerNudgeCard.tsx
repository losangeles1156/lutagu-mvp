'use client';

import { PartnerOffer, getPartnerUrl } from '@/config/partners';
import { trackFunnelEvent } from '@/lib/tracking';
import { useLocale } from 'next-intl';
import { Users, Package, Bike, Wifi, ExternalLink, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocaleString } from '@/lib/utils/localeUtils';

const ICON_MAP = {
    Users,
    Package,
    Bike,
    Wifi,
    ExternalLink
};

const COLOR_MAP = {
    orange: {
        bg: 'bg-orange-100',
        text: 'text-orange-600',
        border: 'border-orange-100',
        badge: 'bg-orange-50',
        gradient: 'from-orange-100'
    },
    blue: {
        bg: 'bg-blue-100',
        text: 'text-blue-600',
        border: 'border-blue-100',
        badge: 'bg-blue-50',
        gradient: 'from-blue-100'
    },
    emerald: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-600',
        border: 'border-emerald-100',
        badge: 'bg-emerald-50',
        gradient: 'from-emerald-100'
    },
    indigo: {
        bg: 'bg-indigo-100',
        text: 'text-indigo-600',
        border: 'border-indigo-100',
        badge: 'bg-indigo-50',
        gradient: 'from-indigo-100'
    },
    slate: {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-slate-100',
        badge: 'bg-slate-50',
        gradient: 'from-slate-100'
    }
};

interface PartnerNudgeCardProps {
    offer: PartnerOffer;
    dynamicParams?: Record<string, string>;
    referralSource?: string;
    className?: string;
}

export function PartnerNudgeCard({ offer, dynamicParams, referralSource = '/l2', className }: PartnerNudgeCardProps) {
    const locale = useLocale();
    const Icon = ICON_MAP[offer.ui.icon] || ExternalLink;
    const styles = COLOR_MAP[offer.ui.color] || COLOR_MAP.slate;
    const finalUrl = getPartnerUrl(offer.id, dynamicParams);

    const handleClick = () => {
        trackFunnelEvent({
            step_name: 'external_link_click',
            step_number: 5,
            path: referralSource,
            metadata: {
                target_url: finalUrl,
                link_type: `${offer.category}_${offer.id}`, // e.g. crowd_vacan
                partner_id: offer.id,
                ...dynamicParams
            }
        });
    };

    return (
        <a
            href={finalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className={cn(
                "block relative bg-white rounded-2xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group overflow-hidden touch-manipulation min-h-[100px]",
                className
            )}
        >
            <div className={cn("absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl via-transparent to-transparent opacity-50 rounded-tr-2xl", styles.gradient)}></div>

            <div className="flex items-center gap-2 mb-2 relative z-10">
                <div className={cn("p-1.5 rounded-lg", styles.bg, styles.text)}>
                    <Icon size={14} />
                </div>
                <div>
                    <h4 className="text-xs font-black text-gray-900 leading-none">
                        {getLocaleString(offer.name, locale)}
                    </h4>
                    <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded mt-0.5 inline-block border", styles.text, styles.badge, styles.border)}>
                        {getLocaleString(offer.ui.label, locale)}
                    </span>
                </div>
            </div>

            <p className="text-[10px] text-gray-500 font-medium leading-tight mb-3 relative z-10">
                {getLocaleString(offer.ui.description, locale)}
            </p>

            <div className="flex items-center justify-between mt-auto">
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-600 transition-colors flex items-center gap-1">
                    {getLocaleString(offer.ui.cta, locale)}
                    <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
                {/* Optional Status Indicator (Green Dot) - could be dynamic later */}
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-sm"></div>
            </div>
        </a>
    );
}
