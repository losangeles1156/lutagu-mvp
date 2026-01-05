'use client';

import { useL1Places, L1Place } from '@/hooks/useL1Places';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { ShoppingBag, Utensils, Coffee, MapPin, Stethoscope, Star, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCategoryTranslation } from '@/hooks/useCategoryTranslation';

const CATEGORY_COLOR = {
    shopping: '#F472B6', // Pink
    dining: '#F59E0B',   // Amber
    convenience: '#EF4444', // Red
    medical: '#10B981',   // Emerald
    default: '#6B7280'    // Gray
};

// 合作店家標識圖標
const PARTNER_ICON = L.divIcon({
    className: 'partner-marker',
    html: `<div style="
        width: 24px; 
        height: 24px; 
        background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
        border: 2px solid white; 
        border-radius: 50%; 
        box-shadow: 0 2px 8px rgba(255, 165, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
    ">⭐</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

export function L1Layer() {
    const { places } = useL1Places();
    const map = useMap();
    const [visible, setVisible] = useState(false);
    const { getCategoryLabel } = useCategoryTranslation();

    // Only show when zoomed in
    useEffect(() => {
        const checkZoom = () => setVisible(map.getZoom() >= 16);
        map.on('zoomend', checkZoom);
        checkZoom();
        return () => { map.off('zoomend', checkZoom); };
    }, [map]);

    if (!visible) return null;

    return (
        <>
            {places.map(place => {
                const color = (CATEGORY_COLOR as any)[place.category] || CATEGORY_COLOR.default;

                // 合作店家使用特殊標識
                const isPartner = place.isPartner || place.isCustom;
                const icon = isPartner ? PARTNER_ICON : L.divIcon({
                    className: 'l1-marker',
                    html: `<div style="
                        width: 10px; 
                        height: 10px; 
                        background-color: ${color}; 
                        border: 2px solid white; 
                        border-radius: 50%; 
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    "></div>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                });

                return (
                    <Marker
                        key={place.id}
                        position={[place.location.coordinates[1], place.location.coordinates[0]]}
                        icon={icon}
                    >
                        <Popup className="l1-popup">
                            <div className="min-w-[200px] p-1">
                                {/* 店名 */}
                                <div className="font-bold text-sm mb-1">{place.name}</div>

                                {/* 分類標籤 */}
                                <div className="text-[10px] text-gray-500 capitalize mb-2">
                                    {getCategoryLabel(place.category)}
                                </div>

                                {/* 短評 (Review) */}
                                {place.description && (
                                    <div className="text-xs text-gray-600 mb-2 leading-relaxed bg-gray-50 p-1.5 rounded border border-gray-100 italic">
                                        &ldquo;{place.description}&rdquo;
                                    </div>
                                )}

                                {/* 合作店家標識 */}
                                {isPartner && (
                                    <div className="flex items-center gap-1 mb-2 px-2 py-1 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                                        <Star size={12} className="text-amber-500 fill-amber-500" />
                                        <span className="text-xs font-medium text-amber-700">合作店家</span>
                                    </div>
                                )}

                                {/* 優惠資訊 */}
                                {place.discountInfo && (
                                    <div className="mb-2 px-2 py-1 bg-green-50 rounded-lg border border-green-200">
                                        <div className="text-xs font-medium text-green-700">
                                            {place.discountInfo.type === 'percent'
                                                ? `🎉 ${place.discountInfo.value}% OFF`
                                                : place.discountInfo.type === 'fixed'
                                                    ? `💰 ¥${place.discountInfo.value} OFF`
                                                    : `🎁 ${place.discountInfo.value}`}
                                        </div>
                                        {place.discountInfo.description && (
                                            <div className="text-[10px] text-green-600 mt-0.5">
                                                {place.discountInfo.description}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 導流連結 */}
                                {place.affiliateUrl && (
                                    <a
                                        href={place.affiliateUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-1 w-full py-1.5 px-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
                                    >
                                        <span>前往預約</span>
                                        <ExternalLink size={10} />
                                    </a>
                                )}

                                {/* 導航連結 */}
                                {place.navigation_url && !place.affiliateUrl && (
                                    <a
                                        href={place.navigation_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-1 w-full py-1 px-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors mt-1"
                                    >
                                        <span>查看地圖</span>
                                        <ExternalLink size={10} />
                                    </a>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </>
    );
}
