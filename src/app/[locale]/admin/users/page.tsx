'use client';

import { UserList } from '@/components/admin/UserList';

export default function AdminUsersPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>
                        會員管理
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">管理一般會員、客服人員與管理員帳號權限。</p>
                </div>
            </div>

            <UserList />
        </div>
    );
}
