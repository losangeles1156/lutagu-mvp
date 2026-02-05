'use client';

import { logger } from '@/lib/utils/logger';

import { useState, useEffect, useCallback } from 'react';
import { UserEditor } from './UserEditor';
import { Search, Plus, Edit, Trash2, Shield, User, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Member {
    user_id: string;
    display_name: string | null;
    role: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export function UserList() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const LIMIT = 20;

    // Filters
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'support' | 'member'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal
    const [editingUser, setEditingUser] = useState<Member | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('limit', String(LIMIT));
            params.set('offset', String(page * LIMIT));

            const res = await fetch(`/api/members?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch members');

            const data = await res.json();
            setMembers(data.items || []);
        } catch (error) {
            logger.error(error);
            toast.error('無法載入會員列表');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const handleDelete = async (userId: string) => {
        if (!confirm('確定要停用此會員嗎？(Soft Delete)')) return;
        try {
            const res = await fetch(`/api/members/${userId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            toast.success('已停用會員');
            fetchMembers();
        } catch {
            toast.error('操作失敗');
        }
    };

    // Client-side filtering
    const filteredMembers = members.filter(m => {
        // Role Filter
        if (roleFilter !== 'all' && m.role !== roleFilter) return false;

        // Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const name = (m.display_name || '').toLowerCase();
            const id = m.user_id.toLowerCase();
            return name.includes(q) || id.includes(q);
        }
        return true;
    });

    return (
        <div className="admin-card p-6 min-h-[600px] flex flex-col">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6 gap-4">
                <div className="flex gap-4 items-center flex-1">
                    <h2 className="text-lg font-semibold text-slate-900 whitespace-nowrap" style={{ fontFamily: 'var(--font-admin-display)' }}>會員列表</h2>

                    {/* Search Bar */}
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="搜尋名稱或 User ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400"
                        />
                    </div>

                    <div className="flex bg-slate-100 rounded-xl p-1 shrink-0">
                        <button
                            onClick={() => setRoleFilter('all')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${roleFilter === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            全部
                        </button>
                        <button
                            onClick={() => setRoleFilter('member')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${roleFilter === 'member' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            一般
                        </button>
                        <button
                            onClick={() => setRoleFilter('admin')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${roleFilter === 'admin' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            管理員
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={fetchMembers}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        title="重新整理"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => { setEditingUser(null); setIsEditorOpen(true); }}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl flex items-center gap-2 text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
                    >
                        <Plus size={16} /> 新增
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-x-auto rounded-xl border border-slate-200">
                <table className="admin-table">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-left">用戶 (User)</th>
                            <th className="px-6 py-3 text-left">角色</th>
                            <th className="px-6 py-3 text-left">註冊時間</th>
                            <th className="px-6 py-3 text-left">狀態</th>
                            <th className="px-6 py-3 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {loading && members.length === 0 ? (
                            <tr><td colSpan={5} className="py-20 text-center text-slate-400">載入中...</td></tr>
                        ) : filteredMembers.length === 0 ? (
                            <tr><td colSpan={5} className="py-20 text-center text-slate-400">無符合資料</td></tr>
                        ) : filteredMembers.map(member => (
                            <tr key={member.user_id} className={`group transition-colors ${member.deleted_at ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'}`}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${member.deleted_at ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white'
                                            }`}>
                                            {(member.display_name?.[0] || 'U').toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900">{member.display_name || '未命名'}</div>
                                            <div className="text-xs text-slate-400 font-mono text-[10px]">{member.user_id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${member.role === 'admin' ? 'bg-slate-900 text-white' :
                                            member.role === 'support' ? 'bg-indigo-100 text-indigo-700' :
                                                'bg-slate-100 text-slate-700'
                                        }`}>
                                        {member.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                                        <span className="capitalize">{member.role}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    {new Date(member.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    {member.deleted_at ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                            已停用
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                                            正常
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setEditingUser(member); setIsEditorOpen(true); }}
                                            className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition-colors"
                                            title={member.deleted_at ? '檢視' : '編輯'}
                                        >
                                            <Edit size={16} />
                                        </button>

                                        {!member.deleted_at && (
                                            <button
                                                onClick={() => handleDelete(member.user_id)}
                                                className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors"
                                                title="停用"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Simple Pagination */}
            <div className="border-t border-slate-200 pt-4 mt-4 flex justify-between items-center">
                <div className="text-xs text-slate-500">
                    顯示 20 筆 (Page {page + 1})
                </div>
                <div className="flex gap-2">
                    <button
                        disabled={page === 0}
                        onClick={() => setPage(page - 1)}
                        className="px-3 py-1 border border-slate-200 rounded text-xs hover:bg-slate-50 disabled:opacity-50"
                    >
                        上一頁
                    </button>
                    <button
                        disabled={members.length < LIMIT}
                        onClick={() => setPage(page + 1)}
                        className="px-3 py-1 border border-slate-200 rounded text-xs hover:bg-slate-50 disabled:opacity-50"
                    >
                        下一頁
                    </button>
                </div>
            </div>

            {/* Modal */}
            {isEditorOpen && (
                <UserEditor
                    user={editingUser}
                    onClose={() => setIsEditorOpen(false)}
                    onSave={fetchMembers}
                />
            )}
        </div>
    );
}
