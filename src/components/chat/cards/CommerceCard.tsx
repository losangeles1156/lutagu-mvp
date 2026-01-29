'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink, Tag } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * CommerceCard (V2)
 * 
 * Radical Design:
 * - Asymmetric Tension: 3:7 Split (Image : Info)
 * - Micro-Interactions: GPU accelerated hover lift
 * - Click Tracking: Integrated
 */

interface CommerceCardProps {
    type: 'skyliner' | 'ecbo' | 'hotel' | 'generic';
    title: string;
    description: string;
    actionLabel: string;
    url: string;
    imageUrl?: string;
    price?: string;
    onClick?: () => void;
}

export function CommerceCard({ type, title, description, actionLabel, url, imageUrl, price, onClick }: CommerceCardProps) {
    const handleClick = () => {
        if (onClick) onClick();
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full max-w-sm mx-auto mb-4 cursor-pointer group"
            onClick={handleClick}
        >
            <div className="relative overflow-hidden bg-white rounded-2xl shadow-xl border border-indigo-50 flex h-32">
                {/* Visual Section (Left 30% or Right 30%? Asymmetric) */}
                {/* Let's do Left 35% Image/Color Block */}
                <div className="w-[35%] h-full relative overflow-hidden bg-slate-100">
                    {imageUrl ? (
                        <div
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                            style={{ backgroundImage: `url(${imageUrl})` }}
                        />
                    ) : (
                        <div className={`absolute inset-0 ${type === 'skyliner' ? 'bg-[#00539B]' : 'bg-indigo-600'} flex items-center justify-center`}>
                            <Tag className="text-white opacity-50 w-8 h-8" />
                        </div>
                    )}

                    {/* Price Badge */}
                    {price && (
                        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded-md">
                            {price}
                        </div>
                    )}
                </div>

                {/* Content Section (Right 65%) */}
                <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider bg-indigo-50 px-1.5 py-0.5 rounded-sm">
                                {type.toUpperCase()}
                            </span>
                        </div>
                        <h3 className="font-bold text-slate-900 leading-tight mb-1 line-clamp-2">
                            {title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 font-medium">
                            {description}
                        </p>
                    </div>

                    <div className="flex items-center gap-1 text-indigo-600 text-xs font-black group-hover:underline decoration-2 underline-offset-2">
                        {actionLabel}
                        <ExternalLink size={12} strokeWidth={3} />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
