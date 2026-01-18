'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
    LayoutDashboard, Users, TrendingUp, ThumbsUp,
    MousePointer, RefreshCw, ArrowRight, Activity
} from 'lucide-react';

interface DailyStats {
    date: string;
    total_sessions: number;
    engaged_sessions: number;
    conversion_sessions: number;
    positive_feedback_sessions: number;
    negative_feedback_sessions: number;
    conversion_rate_pct: number;
    problem_solution_rate_pct: number;
}

interface SessionJourney {
    session_id: string;
    visitor_id: string;
    session_start: string;
    funnel_steps_completed: number;
    max_step_reached: number;
    reached_conversion_step: boolean;
    feedback_score_sum: number;
    partner_clicks: number;
}

export default function AdminDashboardPage() {
    const locale = useLocale();
    const t = useTranslations('admin.dashboard');
    const tQuickLinks = useTranslations('admin.quickLinks');
    const [loading, setLoading] = useState(true);
    const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
    const [recentSessions, setRecentSessions] = useState<SessionJourney[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/dashboard');
            if (!res.ok) throw new Error('Failed to fetch dashboard data');
            const data = await res.json();
            setDailyStats(data.dailyStats);
            setRecentSessions(data.recentSessions || []);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const statCards = dailyStats ? [
        {
            label: t('stats.todaySessions'),
            value: dailyStats.total_sessions,
            icon: Users,
            color: 'bg-blue-500',
        },
        {
            label: t('stats.engagedSessions'),
            value: dailyStats.engaged_sessions,
            icon: Activity,
            color: 'bg-emerald-500',
            subtext: `${dailyStats.problem_solution_rate_pct}% ${t('stats.problemSolutionRate')}`
        },
        {
            label: t('stats.conversion'),
            value: dailyStats.conversion_sessions,
            icon: MousePointer,
            color: 'bg-amber-500',
            subtext: `${dailyStats.conversion_rate_pct}% ${t('stats.conversionRate')}`
        },
        {
            label: t('stats.positiveFeedback'),
            value: dailyStats.positive_feedback_sessions,
            icon: ThumbsUp,
            color: 'bg-indigo-500',
            subtext: `${dailyStats.negative_feedback_sessions} ${t('stats.negativeFeedback')}`
        },
    ] : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {t('overview')} • {new Date().toLocaleDateString(locale)}
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    {t('refresh')}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            {/* Stats Grid */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {statCards.map((stat, idx) => {
                        const Icon = stat.icon;
                        return (
                            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-lg ${stat.color} text-white`}>
                                        <Icon size={18} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                        {stat.label}
                                    </span>
                                </div>
                                <div className="text-3xl font-bold text-gray-900">
                                    {stat.value}
                                </div>
                                {stat.subtext && (
                                    <div className="text-xs text-gray-500 mt-1">{stat.subtext}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Recent Sessions Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-bold text-gray-900">{t('table.recentSessions')}</h2>
                    <Link
                        href={`/${locale}/admin/metrics`}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                        {t('viewDetails')} <ArrowRight size={14} />
                    </Link>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                        {t('loading')}
                    </div>
                ) : recentSessions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <LayoutDashboard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <div className="font-medium">{t('noData')}</div>
                        <div className="text-sm">{t('userActivity')}</div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('table.session')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('table.startTime')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('table.steps')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('table.conversion')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('table.feedback')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('table.partnerClicks')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {recentSessions.map((session) => (
                                    <tr key={session.session_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                {session.session_id.substring(0, 8)}...
                                            </code>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(session.session_start).toLocaleString(locale)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map((step) => (
                                                    <div
                                                        key={step}
                                                        className={`w-2 h-2 rounded-full ${step <= session.max_step_reached
                                                                ? 'bg-emerald-500'
                                                                : 'bg-gray-200'
                                                            }`}
                                                    />
                                                ))}
                                                <span className="ml-2 text-xs text-gray-500">
                                                    {session.funnel_steps_completed} {t('table.stepsUnit')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {session.reached_conversion_step ? (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                    {t('table.converted')}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {session.feedback_score_sum > 0 ? (
                                                <span className="text-emerald-600 font-bold">+{session.feedback_score_sum}</span>
                                            ) : session.feedback_score_sum < 0 ? (
                                                <span className="text-red-600 font-bold">{session.feedback_score_sum}</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {session.partner_clicks > 0 ? (
                                                <span className="font-bold text-amber-600">{session.partner_clicks}</span>
                                            ) : (
                                                <span className="text-gray-400">0</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { labelKey: 'feedback', href: `/${locale}/admin/feedback`, icon: ThumbsUp },
                    { labelKey: 'metrics', href: `/${locale}/admin/metrics`, icon: TrendingUp },
                    { labelKey: 'security', href: `/${locale}/admin/security`, icon: Activity },
                    { labelKey: 'partners', href: `/${locale}/admin/partners`, icon: Users },
                ].map((link) => {
                    const Icon = link.icon;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                        >
                            <Icon size={18} className="text-gray-400" />
                            <span className="font-medium text-gray-700">{tQuickLinks(link.labelKey)}</span>
                            <ArrowRight size={14} className="ml-auto text-gray-300" />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
