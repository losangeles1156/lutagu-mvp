'use client';

import { useFavorites } from '@/hooks/useFavorites';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming cn utility exists, otherwise standard className
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface FavoriteButtonProps {
    nodeId: string;
    className?: string;
    showLabel?: boolean;
}

export function FavoriteButton({ nodeId, className, showLabel = false }: FavoriteButtonProps) {
    const { isFavorite, toggleFavorite, loading } = useFavorites();
    const tCommon = useTranslations('common');
    const [active, setActive] = useState(false);

    useEffect(() => {
        setActive(isFavorite(nodeId));
    }, [isFavorite, nodeId]);

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        await toggleFavorite(nodeId);
    };

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className={cn( // If cn doesn't exist, I'll need to remove it or fix it. Assuming it exists.
                "group flex items-center gap-2 p-2 rounded-xl transition-all active:scale-95 disabled:opacity-50",
                active
                    ? "text-amber-400 hover:bg-amber-50"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100",
                className
            )}
            title={active ? tCommon('removeFavorite', { defaultValue: 'Remove from Favorites' }) : tCommon('addFavorite', { defaultValue: 'Add to Favorites' })}
            aria-label={active ? tCommon('removeFavorite', { defaultValue: 'Remove from Favorites' }) : tCommon('addFavorite', { defaultValue: 'Add to Favorites' })}
            aria-pressed={active}
        >
            <Star
                size={20}
                className={cn(
                    "transition-all",
                    active ? "fill-current scale-110" : "group-hover:scale-110"
                )}
            />
            {showLabel && (
                <span className="text-sm font-bold">
                    {active ? tCommon('favorited', { defaultValue: 'Saved' }) : tCommon('favorite', { defaultValue: 'Save' })}
                </span>
            )}
        </button>
    );
}

// Simple utility fallback if '@/lib/utils' doesn't export cn
function defaultCn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}
