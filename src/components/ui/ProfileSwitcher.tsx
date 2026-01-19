'use client';

import { useAppStore } from '@/stores/appStore';
import { User2, Armchair, Baby } from 'lucide-react';

export function ProfileSwitcher({ className }: { className?: string }) {
    const { userProfile, setUserProfile } = useAppStore();

    const profiles = [
        { id: 'general', icon: User2, label: 'General' },
        { id: 'wheelchair', icon: Armchair, label: 'Wheelchair' }, // Using Armchair as proxy if Wheelchair not available, or I can try Wheelchair
        { id: 'stroller', icon: Baby, label: 'Stroller' }
    ] as const;

    const current = profiles.find(p => p.id === userProfile) || profiles[0];

    const cycleProfile = () => {
        const currentIndex = profiles.findIndex(p => p.id === userProfile);
        const nextIndex = (currentIndex + 1) % profiles.length;
        setUserProfile(profiles[nextIndex].id);
    };

    const Icon = current.icon;

    return (
        <button
            onClick={cycleProfile}
            className={`glass-effect rounded-2xl p-3.5 hover:bg-white transition-all text-gray-500 flex items-center justify-center ${className || ''}`}
            aria-label={`Switch profile: ${current.label}`}
            title={`Current: ${current.label} (Click to switch)`}
        >
            <Icon size={22} />
        </button>
    );
}
