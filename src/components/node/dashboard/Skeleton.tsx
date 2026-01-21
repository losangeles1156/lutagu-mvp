'use client';

export function RecommendationSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl bg-slate-50 border border-slate-100 p-4 flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-200" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-3/4" />
                        <div className="h-3 bg-slate-200 rounded w-full" />
                        <div className="h-3 bg-slate-200 rounded w-5/6" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function SuggestionModule({ suggestion }: { suggestion: any }) {
    return (
        <div className="space-y-3">
            {suggestion.options.map((opt: any, i: number) => (
                <div key={i} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                    <div className="font-black text-slate-900 mb-2">{opt.label}</div>
                    <div className="space-y-2">
                        {opt.steps.map((step: any, j: number) => (
                            <div key={j} className="flex gap-3 text-sm font-bold text-slate-600">
                                <div className="w-6 text-center">{step.icon || '•'}</div>
                                <div className="flex-1">{step.text}</div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
