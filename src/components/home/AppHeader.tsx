import { getTranslations } from 'next-intl/server';
import { SystemMenu } from '@/components/ui/SystemMenu';

export async function AppHeader() {
    const tCommon = await getTranslations('common');

    return (
        <header className="px-4 py-3 flex items-center justify-between bg-white/95 backdrop-blur-sm" role="banner">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-200" aria-hidden="true">🦌</div>
                <div className="hidden sm:block">
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">LUTAGU</h1>
                    <p className="text-[10px] font-bold text-slate-400">{tCommon('aiGuideSubtitle')}</p>
                </div>
            </div>
            <SystemMenu />
        </header>
    );
}
