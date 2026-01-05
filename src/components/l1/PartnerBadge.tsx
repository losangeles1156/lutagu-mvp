'use client';

import { Star, ExternalLink } from 'lucide-react';

interface DiscountInfo {
    type: 'percent' | 'fixed' | 'special';
    value: number;
    description?: string;
}

interface PartnerBadgeProps {
    isPartner?: boolean;
    affiliateUrl?: string;
    discountInfo?: DiscountInfo;
    navigationUrl?: string;
    size?: 'sm' | 'md' | 'lg';
    showButton?: boolean;
}

export function PartnerBadge({
    isPartner,
    affiliateUrl,
    discountInfo,
    navigationUrl,
    size = 'md',
    showButton = true
}: PartnerBadgeProps) {
    if (!isPartner) return null;

    const sizeClasses = {
        sm: { badge: 'px-1.5 py-0.5 text-[10px]', icon: 10, button: 'py-1 px-2 text-xs' },
        md: { badge: 'px-2 py-1 text-xs', icon: 12, button: 'py-1.5 px-3 text-sm' },
        lg: { badge: 'px-3 py-1.5 text-sm', icon: 14, button: 'py-2 px-4 text-base' }
    };

    const { badge, icon, button } = sizeClasses[size];

    return (
        <div className="space-y-2">
            {/* 合作店家標識 */}
            <div className={`flex items-center gap-1.5 ${badge} bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200`}>
                <Star size={icon} className="text-amber-500 fill-amber-500" />
                <span className="font-medium text-amber-700">合作店家</span>
            </div>

            {/* 優惠資訊 */}
            {discountInfo && (
                <div className={`${badge} bg-green-50 rounded-lg border border-green-200`}>
                    <div className="font-medium text-green-700">
                        {discountInfo.type === 'percent' 
                            ? `🎉 ${discountInfo.value}% OFF`
                            : discountInfo.type === 'fixed'
                            ? `💰 ¥${discountInfo.value} OFF`
                            : `🎁 ${discountInfo.value}`}
                    </div>
                    {discountInfo.description && (
                        <div className="text-[10px] text-green-600 mt-0.5 opacity-80">
                            {discountInfo.description}
                        </div>
                    )}
                </div>
            )}

            {/* 導流按鈕 */}
            {showButton && affiliateUrl && (
                <a 
                    href={affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-1 w-full ${button} bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors`}
                >
                    <span>前往預約</span>
                    <ExternalLink size={size === 'sm' ? 10 : 12} />
                </a>
            )}

            {/* 導航按鈕（無導流連結時） */}
            {showButton && !affiliateUrl && navigationUrl && (
                <a 
                    href={navigationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-1 w-full ${button} bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors`}
                >
                    <span>查看地圖</span>
                    <ExternalLink size={size === 'sm' ? 10 : 12} />
                </a>
            )}
        </div>
    );
}
