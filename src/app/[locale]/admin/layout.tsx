'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, FileCheck, Shield, Users, LayoutDashboard, MessageSquare, Activity, HeartPulse, ArrowLeft } from 'lucide-react';
import { Toaster } from 'sonner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const locale = useLocale();
    const pathname = usePathname();

    const navItems = [
        { href: `/${locale}/admin`, label: '儀表板', icon: LayoutDashboard },
        { href: `/${locale}/admin/nodes`, label: '節點合併', icon: MapPin },
        { href: `/${locale}/admin/l1-audit`, label: 'L1 審核', icon: FileCheck },
        { href: `/${locale}/admin/users`, label: '會員管理', icon: Users },
        { href: `/${locale}/admin/partners`, label: '合作夥伴', icon: Users },
        { href: `/${locale}/admin/security`, label: '安全監控', icon: Shield },
        { href: `/${locale}/admin/feedback`, label: '用戶反饋', icon: MessageSquare },
        { href: `/${locale}/admin/metrics`, label: '效能指標', icon: Activity },
        { href: `/${locale}/admin/health`, label: '健康檢查', icon: HeartPulse },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Toaster position="top-right" />

            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 fixed h-full z-10">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white text-lg shadow-md">
                            ✨
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-800">LUTAGU</h1>
                            <p className="text-xs text-gray-500">管理後台</p>
                        </div>
                    </div>
                </div>
                <nav className="p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== `/${locale}/admin` && pathname?.startsWith(`${item.href}/`));
                        const isExactDashboard = item.href === `/${locale}/admin` && pathname === `/${locale}/admin`;
                        const shouldHighlight = isExactDashboard || isActive;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${shouldHighlight
                                    ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-500'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <Icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="absolute bottom-0 w-full p-4 border-t border-gray-100">
                    <Link
                        href={`/${locale}`}
                        className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        <ArrowLeft size={14} />
                        返回應用
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8 min-h-screen">
                {children}
            </main>
        </div>
    );
}

