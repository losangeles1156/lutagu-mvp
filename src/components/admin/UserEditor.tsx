'use client';

import { logger } from '@/lib/utils/logger';

import { useState } from 'react';
import { X, Save, User, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface UserEditorProps {
    user?: any | null; // If null, create mode
    onClose: () => void;
    onSave: () => void;
}

export function UserEditor({ user, onClose, onSave }: UserEditorProps) {
    const isEdit = !!user;
    const [loading, setLoading] = useState(false);

    // Form State
    const [userId, setUserId] = useState(user?.user_id || ''); // For manual input in create mode (rare but possible to link auth)
    const [displayName, setDisplayName] = useState(user?.display_name || '');
    const [role, setRole] = useState(user?.role || 'member');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const body = {
                // In create mode, if we wanted to support manual user_id input, we'd include it. 
                // But typically user_id comes from Auth. For simple "profile" management, we might assume user exists.
                // However, the POST /api/members schema allows creating a profile with a specific userId.
                userId: isEdit ? undefined : userId,
                displayName,
                role
            };

            const endpoint = isEdit
                ? `/api/members/${user.user_id}`
                : '/api/members';

            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Save failed');
            }

            toast.success(isEdit ? '已更新會員資料' : '已建立會員資料');
            onSave();
            onClose();

        } catch (error: any) {
            logger.error(error);
            toast.error(error.message || '儲存失敗');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        {isEdit ? <User size={24} className="text-indigo-600" /> : <User size={24} className="text-green-600" />}
                        {isEdit ? '編輯會員' : '新增會員'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {!isEdit && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">User ID (UUID)</label>
                            <input
                                value={userId}
                                onChange={e => setUserId(e.target.value)}
                                placeholder="例如: 550e8400-e29b..."
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                                required
                            />
                            <p className="text-xs text-gray-400 mt-1">請輸入對應 Auth 系統的 User ID</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">顯示名稱</label>
                        <input
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            placeholder="例如: Alex Chen"
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">角色權限</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                            <select
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                className="w-full pl-9 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white"
                            >
                                <option value="member">一般會員 (Member)</option>
                                <option value="support">客服人員 (Support)</option>
                                <option value="admin">管理員 (Admin)</option>
                            </select>
                        </div>
                        {role === 'admin' && (
                            <p className="text-xs text-red-500 mt-1 font-medium">⚠️ 注意：管理員擁有系統完整控制權</p>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (!isEdit && !userId)}
                            className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors"
                        >
                            <Save size={16} />
                            {loading ? '儲存中...' : '儲存變更'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
