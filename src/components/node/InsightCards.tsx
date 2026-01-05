import type { L4Suggestion, SupportedLocale } from '@/lib/l4/assistantEngine';

export function InsightCards({ suggestion, locale, visible }: { suggestion: L4Suggestion; locale: SupportedLocale; visible: boolean }) {
    if (!visible) return null;

    const allSteps = suggestion.options.flatMap(opt => opt.steps);
    const expertTips = allSteps.filter(s =>
        s.kind === 'info' && (['💡', '⚠️', '🎍', '🛗', '📦', '✈️', '⏰'].includes(s.icon || '') || s.text.includes('💡'))
    );
    const passKnowledge = allSteps.filter(s =>
        s.kind === 'info' && (s.text.includes('Tokyo Subway Ticket') || s.text.includes('JR 都區內') ||
            s.text.includes('Greater Tokyo Pass') || s.icon === '🎫')
    );

    if (expertTips.length === 0 && passKnowledge.length === 0) return null;

    return (
        <div className="space-y-4 mb-4">
            {/* Expert Tips Card - Amber */}
            {expertTips.length > 0 && (
                <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-200">
                            <span className="text-xl">💡</span>
                        </div>
                        <div>
                            <div className="text-sm font-black text-amber-800">
                                {locale.startsWith('zh') ? '專家建議' : locale === 'ja' ? 'プロのアドバイス' : 'Pro Tips'}
                            </div>
                            <div className="text-[11px] font-bold text-amber-600">
                                {locale.startsWith('zh') ? '內行人才知道的重要資訊' : locale === 'ja' ? '地元民だけが知る重要情報' : 'Insider knowledge'}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {expertTips.map((tip, idx) => (
                            <div key={idx} className="flex items-start gap-2 bg-white/60 rounded-xl p-3 hover:bg-white transition-colors">
                                <span className="text-amber-500 mt-0.5">●</span>
                                <span className="text-sm font-bold text-slate-700 leading-relaxed">{tip.text.replace(/^[\s\S]*?[：:]/, '')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pass Knowledge Card - Emerald */}
            {passKnowledge.length > 0 && (
                <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                            <span className="text-xl">🎫</span>
                        </div>
                        <div>
                            <div className="text-sm font-black text-emerald-800">
                                {locale.startsWith('zh') ? '省錢通行證' : locale === 'ja' ? 'お得な切符' : 'Save Money'}
                            </div>
                            <div className="text-[11px] font-bold text-emerald-600">
                                {locale.startsWith('zh') ? '聰明搭車省更多' : locale === 'ja' ? '賢く利用して節約' : 'Smart savings'}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {passKnowledge.map((pass, idx) => {
                            const nameMatch = pass.text.match(/🎫\s*([^\(]+)/);
                            const priceMatch = pass.text.match(/\((¥[\d,]+)/);
                            const adviceMatch = pass.text.match(/-\s*(.+)/);

                            return (
                                <div key={idx} className="bg-white/80 rounded-xl p-3 border border-emerald-100 hover:border-emerald-300 transition-colors">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs">
                                                {idx + 1}
                                            </span>
                                            {nameMatch ? nameMatch[1].trim() : pass.text}
                                        </span>
                                        {priceMatch && (
                                            <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg">
                                                {priceMatch[1]}
                                            </span>
                                        )}
                                    </div>
                                    {adviceMatch && (
                                        <div className="mt-1.5 ml-8 text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                            <span className="text-emerald-400">✓</span>
                                            {adviceMatch[1].trim()}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
