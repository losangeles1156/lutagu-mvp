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
                className="glass-effect rounded-full p-3 hover:bg-white transition-all active:scale-90 shadow-xl shadow-black/5 flex items-center justify-center text-gray-600"
            >
                <Globe size={22} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    {['zh-TW', 'en', 'ja'].map((l) => (
                        <button
                            key={l}
                            onClick={() => handleChange(l)}
                            className={`w-full px-4 py-3 text-sm font-bold text-left hover:bg-gray-50 transition-colors ${locale === l ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600'
                                }`}
                        >
                            {labels[l]}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
