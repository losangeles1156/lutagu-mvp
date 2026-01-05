'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, FileCheck, Shield, Users, LayoutDashboard } from 'lucide-react';
import { Toaster } from 'sonner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const locale = useLocale();
    const pathname = usePathname();

    const navItems = [
        // { href: `/${locale}/admin`, label: 'Dashboard', icon: LayoutDashboard },
        { href: `/${locale}/admin/nodes`, label: 'Nodes (Hubs)', icon: MapPin },
        { href: `/${locale}/admin/l1-audit`, label: 'L1 Audit', icon: FileCheck },
        { href: `/${locale}/admin/partners`, label: 'Partners', icon: Users },
        { href: `/${locale}/admin/security`, label: 'Security', icon: Shield },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Toaster position="top-right" />

            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 fixed h-full z-10">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-gray-800">BambiGO Admin</h1>
                    <p className="text-xs text-gray-500 mt-1">Management Console</p>
                </div>
                <nav className="p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-blue-50 text-blue-700'
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
                    <Link href={`/${locale}`} className="block text-center text-sm text-gray-500 hover:text-gray-800">
                        Back to App
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
