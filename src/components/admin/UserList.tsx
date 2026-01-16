'use client';

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
            console.error(error);
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
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 min-h-[600px] flex flex-col">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6 gap-4">
                <div className="flex gap-4 items-center flex-1">
                    <h2 className="text-lg font-bold text-gray-800 whitespace-nowrap">會員列表</h2>

                    {/* Search Bar */}
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="搜尋名稱或 User ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    <div className="flex bg-gray-100 rounded-lg p-1 shrink-0">
                        <button
                            onClick={() => setRoleFilter('all')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${roleFilter === 'all' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            全部
                        </button>
                        <button
                            onClick={() => setRoleFilter('member')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${roleFilter === 'member' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            一般
                        </button>
                        <button
                            onClick={() => setRoleFilter('admin')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${roleFilter === 'admin' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            管理員
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={fetchMembers}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                        title="重新整理"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => { setEditingUser(null); setIsEditorOpen(true); }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus size={16} /> 新增
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用戶 (User)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">註冊時間</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading && members.length === 0 ? (
                            <tr><td colSpan={5} className="py-20 text-center text-gray-400">載入中...</td></tr>
                        ) : filteredMembers.length === 0 ? (
                            <tr><td colSpan={5} className="py-20 text-center text-gray-400">無符合資料</td></tr>
                        ) : filteredMembers.map(member => (
                            <tr key={member.user_id} className={`group transition-colors ${member.deleted_at ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${member.deleted_at ? 'bg-gray-200 text-gray-500' : 'bg-indigo-100 text-indigo-600'
                                            }`}>
                                            {(member.display_name?.[0] || 'U').toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">{member.display_name || '未命名'}</div>
                                            <div className="text-xs text-gray-400 font-mono text-[10px]">{member.user_id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${member.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            member.role === 'support' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {member.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                                        <span className="capitalize">{member.role}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    {new Date(member.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    {member.deleted_at ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                            已停用
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                            正常
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setEditingUser(member); setIsEditorOpen(true); }}
                                            className="p-1.5 hover:bg-indigo-100 text-indigo-600 rounded transition-colors"
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
            <div className="border-t border-gray-200 pt-4 mt-4 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                    顯示 20 筆 (Page {page + 1})
                </div>
                <div className="flex gap-2">
                    <button
                        disabled={page === 0}
                        onClick={() => setPage(page - 1)}
                        className="px-3 py-1 border rounded text-xs hover:bg-gray-50 disabled:opacity-50"
                    >
                        上一頁
                    </button>
                    <button
                        disabled={members.length < LIMIT}
                        onClick={() => setPage(page + 1)}
                        className="px-3 py-1 border rounded text-xs hover:bg-gray-50 disabled:opacity-50"
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
