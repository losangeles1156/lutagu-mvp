'use client';

import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '@/stores/appStore';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin } from 'lucide-react';

interface NodeMarkerProps {
    node: {
        id: string;
        name: any;
        location: { coordinates: [number, number] }; // GeoJSON Point [lon, lat]
        type: string;
        is_hub: boolean;
        vibe?: string | null;
    };
    zone: 'core' | 'buffer' | 'outer';
    locale?: string; // Added for i18n
}

const VIBE_STYLE: Record<string, { color: string; icon: string }> = {
    // Core Vibes
    culture: { color: 'bg-amber-500', icon: '🎨' },
    geek: { color: 'bg-indigo-500', icon: '🎮' },
    transit: { color: 'bg-blue-600', icon: '🚉' },
    luxury: { color: 'bg-rose-500', icon: '💎' },
    tourism: { color: 'bg-orange-500', icon: '⛩️' },

    // New Stations Vibes
    historic: { color: 'bg-stone-600', icon: '🏛️' }, // Tokyo
    art: { color: 'bg-purple-500', icon: '🖼️' }, // Kyobashi
    shopping: { color: 'bg-pink-500', icon: '🛍️' }, // Mitsukoshimae
    curry: { color: 'bg-yellow-600', icon: '🍛' }, // Kanda
    theater: { color: 'bg-red-600', icon: '🎭' }, // Higashi-ginza
    tradition: { color: 'bg-amber-700', icon: '🎎' }, // Nihombashi
    shitamachi: { color: 'bg-orange-700', icon: '🏮' }, // Ningyocho
    wholesale: { color: 'bg-slate-500', icon: '📦' }, // Higashi-nihombashi
    traditional: { color: 'bg-red-500', icon: '⛩️' }, // Asakusa
    craft: { color: 'bg-amber-600', icon: '🧶' }, // Kuramae
    market: { color: 'bg-cyan-600', icon: '🐟' }, // Tsukiji/Okachimachi
    retro: { color: 'bg-amber-900', icon: '📻' }, // Uguisudani
    wholesale_craft: { color: 'bg-teal-600', icon: '🧵' }, // Asakusabashi
    kitchen: { color: 'bg-yellow-500', icon: '🍳' }, // Tawaramachi
    quiet: { color: 'bg-emerald-500', icon: '🍃' }, // Iriya
    temple: { color: 'bg-red-700', icon: '🙏' }, // Inaricho
    tram: { color: 'bg-emerald-600', icon: '🚋' }, // Minowa
    arcade: { color: 'bg-orange-400', icon: '🛒' }, // Shin-Okachimachi
    scholar: { color: 'bg-violet-600', icon: '🎓' }, // Yushima
    academic: { color: 'bg-blue-500', icon: '📚' }, // Ochanomizu
    government: { color: 'bg-slate-600', icon: '⚖️' }, // Kasumigaseki
    hub: { color: 'bg-gray-800', icon: '🔄' }, // Iidabashi
    business: { color: 'bg-sky-700', icon: '💼' }, // Otemachi/Kayabacho
    me: { color: 'bg-indigo-600', icon: '😊' } // User
};

export function NodeMarker({ node, zone, locale = 'zh-TW' }: NodeMarkerProps) {
    const { setCurrentNode, setBottomSheetOpen, currentNodeId } = useAppStore();

    // Robust coordinate extraction
    let lon = 0, lat = 0;
    if (Array.isArray(node.location.coordinates)) {
        [lon, lat] = node.location.coordinates;
    } else if (node.location.coordinates && typeof node.location.coordinates === 'object') {
        const coords = node.location.coordinates as any;
        lon = coords.lon || coords.x || 0;
        lat = coords.lat || coords.y || 0;
    }

    const isSelected = currentNodeId === node.id;

    const handleClick = () => {
        setCurrentNode(node.id);
        setBottomSheetOpen(true);
    };

    // Use node's own zone for styling
    const nodeZone = node.is_hub ? 'core' : 'buffer';
    const vibe = node.vibe || (node.is_hub ? 'transit' : null);
    const vibeConfig = vibe ? VIBE_STYLE[vibe] : null; // Fallback to basic color if vibe missing

    // --- SMART TAG LOGIC (AI Tag Visualization) ---
    // Select the most interesting stat to display based on the vibe
    let badgeLabel = null;
    let badgeIcon = null;
    const cats = (node as any).category_counts || {};

    // Define relevant stats per vibe key
    if (vibe) {
        if (['coffee', 'cafe', 'retro', 'quiet'].includes(vibe)) {
            if (cats.cafe_count > 0) { badgeLabel = cats.cafe_count; badgeIcon = '☕'; }
        } else if (['dining', 'curry', 'ramen', 'izakaya', 'kitchen', 'market', 'sushi', 'meat'].includes(vibe)) {
            if (cats.restaurant_count > 0) { badgeLabel = cats.restaurant_count; badgeIcon = '🍴'; }
        } else if (['temple', 'shrine', 'tradition', 'history', 'religion', 'culture'].includes(vibe)) {
            const godCount = (cats.shrine_count || 0) + (cats.temple_count || 0);
            if (godCount > 0) { badgeLabel = godCount; badgeIcon = '⛩️'; }
        } else if (['shopping', 'fashion', 'luxury', 'wholesale', 'craft', 'electronics'].includes(vibe)) {
            if (cats.shopping > 0) { badgeLabel = cats.shopping; badgeIcon = '🛍️'; }
        } else if (['art', 'museum', 'theater'].includes(vibe)) {
            if (cats.museum_count > 0) { badgeLabel = cats.museum_count; badgeIcon = '🎨'; }
        } else if (['business', 'finance', 'government'].includes(vibe)) {
            if (cats.workspace > 0) { badgeLabel = cats.workspace; badgeIcon = '💼'; }
        }
    }

    // Fallback logic if specific vibe match failed but data exists
    if (!badgeLabel) {
        if (node.is_hub) {
            const shopCount = cats.shopping || 0;
            const dineCount = cats.dining || 0;
            if (shopCount + dineCount > 0) {
                badgeLabel = shopCount + dineCount;
                badgeIcon = '🏙️';
            }
        }
    }

    // Gradient generation based on vibe color
    const baseColor = vibeConfig?.color.replace('bg-', '') || 'indigo-500';
    // Mapping Tailwind colors to approximate hex/gradients for inline styles if needed, 
    // but here we stick to Tailwind classes for simplicity first.

    const iconMarkup = renderToStaticMarkup(
        <div className={`relative flex items-center justify-center transition-all duration-500 group ${isSelected ? 'z-50 scale-125' : 'z-10 hover:scale-110 hover:z-40'}`}>

            {/* 1. Pulse Layer */}
            {(isSelected || node.is_hub) && (
                <>
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${isSelected ? 'bg-indigo-500' : (vibeConfig?.color || 'bg-rose-400')}`} style={{ animationDuration: '3s' }} />
                </>
            )}

            {/* 2. Primary Marker Shape (Teardrop / Pin) */}
            <div className="relative drop-shadow-2xl filter">
                {/* Pin Body */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-[3px] shadow-inner
                    ${isSelected
                        ? 'bg-gray-900 border-white text-white'
                        : `${vibeConfig?.color || 'bg-white'} border-white text-white`
                    }
                `}>
                    {/* Inner Content */}
                    <div className="text-xl filter drop-shadow-md transform transition-transform group-hover:scale-110">
                        {vibeConfig?.icon || <MapPin size={20} />}
                    </div>
                </div>

                {/* Pin Point (Triangle at bottom) */}
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-r-[3px] border-b-[3px] border-white rounded-br-sm -z-10 -mt-2
                     ${isSelected ? 'bg-gray-900' : (vibeConfig?.color || 'bg-gray-400')}
                 `}></div>
            </div>

            {/* 3. Data Pill (Smart Tag) - Shows ONLY if space permits or hovered/selected/hub */}
            {badgeLabel && (
                <div className={`absolute -top-3 -right-3 px-2 py-0.5 rounded-full shadow-lg border border-white/20 backdrop-blur-md flex items-center gap-1 min-w-[36px] justify-center transition-all duration-300
                    ${isSelected || node.is_hub ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'}
                    ${isSelected ? 'bg-indigo-600' : 'bg-black/70'} text-white text-[10px] font-bold z-50
                `}>
                    <span className="opacity-80 text-[8px]">{badgeIcon}</span>
                    <span>{badgeLabel}</span>
                </div>
            )}

            {/* 4. Label (Name) */}
            {(isSelected || node.is_hub) && (
                <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg font-bold whitespace-nowrap shadow-xl border border-white/40 backdrop-blur-md transition-all duration-300
                    ${isSelected
                        ? 'bg-gray-900 text-white scale-100 opacity-100 translate-y-0'
                        : 'bg-white/90 text-gray-800 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 -translate-y-2'
                    }
                    ${node.is_hub ? '!opacity-100 !scale-90 !translate-y-0' : ''} 
                `}>
                    <div className="flex items-center gap-1.5 text-xs">
                        <span>{node.name?.[locale] || node.name?.['zh-TW'] || node.name?.['en']}</span>
                    </div>
                </div>
            )}
        </div>
    );

    const customIcon = L.divIcon({
        html: iconMarkup,
        className: 'custom-node-icon',
        iconSize: [48, 48],
        iconAnchor: [24, 48], // Tip at bottom center
    });

    if (!lat || !lon) return null;

    return (
        <Marker
            position={[lat, lon]}
            icon={customIcon}
            eventHandlers={{
                click: handleClick,
            }}
        />
    );
}
