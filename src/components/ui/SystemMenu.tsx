'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { 
    Globe, 
    User, 
    Settings, 
    LogOut, 
    Star, 
    CalendarDays, 
    MessageSquare,
    ChevronDown,
    X
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

interface SystemMenuProps {
    variant?: 'header' | 'floating';
}

const LANGUAGES = [
    { code: 'zh-TW', name: '繁體中文', iso: 'ZH' },
    { code: 'ja', name: '日本語', iso: 'JA' },
    { code: 'en', name: 'English', iso: 'EN' },
] as const;

export function SystemMenu({ variant = 'header' }: SystemMenuProps) {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations('systemMenu');
    const tCommon = useTranslations('common');
    
    const [session, setSession] = useState<Session | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isLoginPanelOpen, setIsLoginPanelOpen] = useState(false);
    
    const menuRef = useRef<HTMLDivElement>(null);
    const langRef = useRef<HTMLDivElement>(null);

    // Load session
    useEffect(() => {
        const supabase = getSupabase();
        if (!supabase) return;

        const client = supabase;
        let cancelled = false;

        async function load() {
            const { data } = await client.auth.getSession();
            if (cancelled) return;
            setSession(data.session || null);
        }

        void load();
        const { data } = client.auth.onAuthStateChange((_event, session) => {
            setSession(session || null);
        });

        return () => {
            cancelled = true;
            if (data?.subscription) {
                data.subscription.unsubscribe();
            }
        };
    }, []);

    // Close menus on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
                setIsLangOpen(false);
            }
            if (langRef.current && !langRef.current.contains(event.target as Node)) {
                setIsLangOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageChange = useCallback((newLocale: string) => {
        const currentPath = pathname;
        const segments = currentPath.split('/');
        segments[1] = newLocale;
        const newPath = segments.join('/');
        router.replace(newPath);
        setIsLangOpen(false);
    }, [pathname, router]);

    const handleLogout = useCallback(async () => {
        const supabase = getSupabase();
        if (supabase) {
            await supabase.auth.signOut();
        }
        setSession(null);
        setIsMenuOpen(false);
    }, []);

    const handleMenuItemClick = useCallback((action: () => void) => {
        action();
        setIsMenuOpen(false);
    }, []);

    const currentLang = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];

    return (
        <div className="relative" ref={menuRef}>
            {/* Main Menu Button */}
            <div className="flex items-center gap-1">
                {/* Language Switcher */}
                <div className="relative" ref={langRef}>
                    <button
                        onClick={() => setIsLangOpen(!isLangOpen)}
                        className={`
                            flex items-center gap-1.5 px-3 py-2 rounded-xl
                            text-slate-600 hover:text-slate-900 hover:bg-slate-100
                            transition-all active:scale-95
                            min-h-[44px] min-w-[44px]
                        `}
                        aria-label={t('language')}
                        title={t('language')}
                    >
                        <Globe size={20} />
                        <span className="text-xs font-bold hidden sm:inline bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{currentLang.iso}</span>
                        <ChevronDown size={14} className={`transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Language Dropdown */}
                    {isLangOpen && (
                        <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => handleLanguageChange(lang.code)}
                                    className={`
                                        w-full px-4 py-3 flex items-center gap-3 text-left
                                        hover:bg-slate-50 transition-colors
                                        ${locale === lang.code ? 'text-indigo-600 bg-indigo-50' : 'text-slate-700'}
                                        min-h-[44px]
                                    `}
                                >
                                    <span className="text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 w-8 h-6 flex items-center justify-center">{lang.iso}</span>
                                    <span className="text-sm font-bold">{lang.name}</span>
                                    {locale === lang.code && (
                                        <span className="ml-auto w-2 h-2 bg-indigo-600 rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* User/Settings Button */}
                {session ? (
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`
                            flex items-center gap-2 px-3 py-2 rounded-xl
                            text-slate-600 hover:text-slate-900 hover:bg-slate-100
                            transition-all active:scale-95
                            min-h-[44px] min-w-[44px]
                        `}
                        aria-label={t('account')}
                    >
                        <User size={20} />
                        <span className="text-sm font-bold hidden sm:inline truncate max-w-[100px]">
                            {session.user?.email?.split('@')[0] || t('me')}
                        </span>
                        <ChevronDown size={14} className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                ) : (
                    <button
                        onClick={() => setIsLoginPanelOpen(true)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-xl
                            bg-indigo-600 text-white font-bold text-sm
                            hover:bg-indigo-700 transition-all active:scale-95
                            shadow-lg shadow-indigo-200
                            min-h-[44px]
                        `}
                    >
                        <User size={18} />
                        <span className="hidden sm:inline">{t('login')}</span>
                    </button>
                )}
            </div>

            {/* User Dropdown Menu */}
            {isMenuOpen && session && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                                <User size={20} className="text-indigo-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-900 truncate">
                                    {session.user?.email?.split('@')[0] || t('me')}
                                </div>
                                <div className="text-xs text-slate-500 truncate">
                                    {session.user?.email}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                        <MenuItem 
                            icon={<MessageSquare size={18} />} 
                            label={t('myConversations')}
                            onClick={() => handleMenuItemClick(() => router.push(`/${locale}/?tab=conversations`))}
                        />
                        <MenuItem 
                            icon={<Star size={18} />} 
                            label={t('myFavorites')}
                            onClick={() => handleMenuItemClick(() => router.push(`/${locale}/?tab=favorites`))}
                        />
                        <MenuItem 
                            icon={<CalendarDays size={18} />} 
                            label={t('myTrips')}
                            onClick={() => handleMenuItemClick(() => router.push(`/${locale}/?tab=trips`))}
                        />
                        <MenuItem 
                            icon={<Settings size={18} />} 
                            label={t('settings')}
                            onClick={() => handleMenuItemClick(() => router.push(`/${locale}/?tab=settings`))}
                        />
                    </div>

                    {/* Logout */}
                    <div className="border-t border-slate-100 py-2">
                        <button
                            onClick={handleLogout}
                            className="w-full px-4 py-3 flex items-center gap-3 text-left
                                text-rose-600 hover:bg-rose-50 transition-colors
                                min-h-[44px]"
                        >
                            <LogOut size={18} />
                            <span className="text-sm font-bold">{t('logout')}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Login Panel Overlay */}
            {isLoginPanelOpen && (
                <LoginPanel onClose={() => setIsLoginPanelOpen(false)} />
            )}

            {/* Backdrop */}
            {isMenuOpen && (
                <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsMenuOpen(false)}
                />
            )}
        </div>
    );
}

// Menu Item Component
interface MenuItemProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    badge?: string;
}

function MenuItem({ icon, label, onClick, badge }: MenuItemProps) {
    return (
        <button
            onClick={onClick}
            className="w-full px-4 py-3 flex items-center gap-3 text-left
                text-slate-700 hover:bg-slate-50 transition-colors
                min-h-[44px] group"
        >
            <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                {icon}
            </span>
            <span className="text-sm font-bold flex-1">{label}</span>
            {badge && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-xs font-bold rounded-full">
                    {badge}
                </span>
            )}
            <ChevronDown size={14} className="rotate-[-90deg] text-slate-300" />
        </button>
    );
}

// Login Panel Component
interface LoginPanelProps {
    onClose: () => void;
}

function LoginPanel({ onClose }: LoginPanelProps) {
    const locale = useLocale();
    const router = useRouter();
    const t = useTranslations('login');
    const tOnboarding = useTranslations('onboarding');
    
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [sentMagicLink, setSentMagicLink] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = useMemo<SupabaseClient | null>(() => {
        try {
            return getSupabase();
        } catch {
            return null;
        }
    }, []);

    const handleGoogleLogin = async () => {
        setError(null);
        if (!supabase) {
            setError(t('supabaseNotConfigured'));
            return;
        }

        setBusy(true);
        try {
            const origin = window.location.origin;
            const redirectTo = `${origin}/${locale}/login?next=${encodeURIComponent(`/${locale}`)}`;
            const { error: authError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo }
            });
            if (authError) {
                setError(authError.message);
            }
        } finally {
            setBusy(false);
        }
    };

    const handleMagicLink = async () => {
        setError(null);
        setSentMagicLink(false);

        if (!supabase) {
            setError(t('supabaseNotConfigured'));
            return;
        }
        if (!email.trim()) {
            setError(t('enterEmail'));
            return;
        }

        setBusy(true);
        try {
            const origin = window.location.origin;
            const emailRedirectTo = `${origin}/${locale}/login?next=${encodeURIComponent(`/${locale}`)}`;
            const { error: authError } = await supabase.auth.signInWithOtp({
                email: email.trim(),
                options: { emailRedirectTo }
            });
            if (authError) {
                setError(authError.message);
                return;
            }
            setSentMagicLink(true);
        } finally {
            setBusy(false);
        }
    };

    const handleSkip = () => {
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl shadow-indigo-100/50 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <span className="text-xl text-white">🦌</span>
                        </div>
                        <div>
                            <div className="text-lg font-black text-slate-900 tracking-tight">LUTAGU</div>
                            <div className="text-xs font-bold text-slate-400">{tOnboarding('tagline')}</div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label={tOnboarding('skip')}
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Title */}
                    <div className="text-center mb-6">
                        <h2 className="text-lg font-black text-slate-900">{t('title')}</h2>
                        <p className="text-xs text-slate-500 mt-1">{t('subtitle')}</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-xs font-bold text-rose-600 animate-in shake-1">
                            {error}
                        </div>
                    )}

                    {/* Google Login */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={busy}
                        className="w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-sm font-black hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] min-h-[52px]"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        {t('googleLogin')}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-4 py-2">
                        <div className="h-px flex-1 bg-slate-100" />
                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('or')}</div>
                        <div className="h-px flex-1 bg-slate-100" />
                    </div>

                    {/* Email Login */}
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('emailPlaceholder')}
                                className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl text-sm font-bold transition-all outline-none min-h-[52px]"
                            />
                        </div>
                        <button
                            onClick={handleMagicLink}
                            disabled={busy || !email.trim()}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 transition-all disabled:opacity-50 active:scale-[0.98] min-h-[52px]"
                        >
                            {busy ? '...' : t('sendMagicLink')}
                        </button>
                        {sentMagicLink && (
                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs font-bold text-emerald-600 animate-in fade-in slide-in-from-top-2">
                                {t('magicLinkSent')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={handleSkip}
                        className="w-full py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        {tOnboarding('browseFirst')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SystemMenu;
