'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = (newLocale: string) => {
        // Replace the locale segment in the pathname
        // Current pathname structure: /en/some/path or / some/path (if default hidden, but usually prefixed)
        // Simple regex replace for standard next-intl setup
        const segments = pathname.split('/');
        // Assuming segments[1] is the locale if it matches known locales
        if (['zh-TW', 'en', 'ja'].includes(segments[1])) {
            segments[1] = newLocale;
        } else {
            // If strictly using prefix-always strategy:
            segments.splice(1, 0, newLocale);
        }

        // Actually, cleaner way if using prefix-based routing:
        // /en/... -> /ja/...
        let newPath = pathname;
        if (pathname.startsWith('/' + locale)) {
            newPath = pathname.replace('/' + locale, '/' + newLocale);
        } else {
            newPath = '/' + newLocale + pathname;
        }

        router.push(newPath);
        setIsOpen(false);
    };

    const labels: Record<string, string> = {
        'zh-TW': '繁體中文',
        'en': 'English',
        'ja': '日本語'
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="glass-effect rounded-2xl p-3.5 hover:bg-white transition-all active:scale-90 shadow-xl shadow-black/5 flex items-center justify-center text-gray-500"
            >
                <Globe size={22} className={isOpen ? 'rotate-12 text-indigo-600' : ''} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-3 w-40 bg-white/90 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-black/[0.05] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 z-[300]">
                    <div className="p-1">
                        {['zh-TW', 'en', 'ja'].map((l) => (
                            <button
                                key={l}
                                onClick={() => handleChange(l)}
                                className={`w-full px-4 py-3 text-xs font-black text-left rounded-xl transition-all duration-300 flex items-center justify-between ${locale === l
                                    ? 'text-indigo-600 bg-indigo-50 shadow-inner'
                                    : 'text-gray-500 hover:bg-black/[0.03] hover:text-gray-900'
                                    }`}
                            >
                                <span>{labels[l]}</span>
                                {locale === l && <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.4)]" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
