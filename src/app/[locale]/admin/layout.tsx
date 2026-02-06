'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import { MapPin, FileCheck, Shield, Users, LayoutDashboard, MessageSquare, Activity, HeartPulse, ArrowLeft, Gauge, Sparkles, LineChart } from 'lucide-react';
import { Toaster } from 'sonner';

const adminSans = IBM_Plex_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-admin-sans'
});

const adminDisplay = Space_Grotesk({
    subsets: ['latin'],
    weight: ['500', '600', '700'],
    variable: '--font-admin-display'
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const locale = useLocale();
    const pathname = usePathname();

    const navSections = [
        {
            title: '總覽',
            items: [
                { href: `/${locale}/admin`, label: '儀表板', icon: LayoutDashboard },
                { href: `/${locale}/admin/metrics`, label: '效能指標', icon: Gauge },
                { href: `/${locale}/admin/health`, label: '健康檢查', icon: HeartPulse },
            ]
        },
        {
            title: '運營管理',
            items: [
                { href: `/${locale}/admin/users`, label: '會員管理', icon: Users },
                { href: `/${locale}/admin/partners`, label: '合作夥伴', icon: Sparkles },
                { href: `/${locale}/admin/feedback`, label: '用戶反饋', icon: MessageSquare },
                { href: `/${locale}/admin/agent-feedback`, label: 'Agent 權重', icon: LineChart },
            ]
        },
        {
            title: '內容與風控',
            items: [
                { href: `/${locale}/admin/nodes`, label: '節點合併', icon: MapPin },
                { href: `/${locale}/admin/l1-audit`, label: 'L1 審核', icon: FileCheck },
                { href: `/${locale}/admin/security`, label: '安全監控', icon: Shield },
            ]
        }
    ];

    return (
        <div className={`${adminSans.variable} ${adminDisplay.variable} admin-shell min-h-screen flex text-slate-900`}>
            <Toaster position="top-right" />

            {/* Sidebar */}
            <aside className="w-72 bg-white/90 backdrop-blur border-r border-slate-200 flex-shrink-0 fixed h-full z-10">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-lg shadow-md">
                            ✨
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'var(--font-admin-display)' }}>LUTAGU</h1>
                            <p className="text-xs text-slate-500">營運管理中心</p>
                        </div>
                    </div>
                </div>
                <nav className="p-5 space-y-6">
                    {navSections.map((section) => (
                        <div key={section.title} className="space-y-2">
                            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-semibold">
                                {section.title}
                            </div>
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const isActive = pathname === item.href ||
                                        (item.href !== `/${locale}/admin` && pathname?.startsWith(`${item.href}/`));
                                    const isExactDashboard = item.href === `/${locale}/admin` && pathname === `/${locale}/admin`;
                                    const shouldHighlight = isExactDashboard || isActive;
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${shouldHighlight
                                                ? 'bg-slate-900 text-white shadow-sm'
                                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                                }`}
                                        >
                                            <Icon size={18} />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
                <div className="absolute bottom-0 w-full p-4 border-t border-slate-100 bg-white/80">
                    <Link
                        href={`/${locale}`}
                        className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft size={14} />
                        返回應用
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-72 p-8 min-h-screen">
                <div className="admin-fade-in">{children}</div>
            </main>
        </div>
    );
}
