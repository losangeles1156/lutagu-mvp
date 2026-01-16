'use client';

import { UserList } from '@/components/admin/UserList';

export default function AdminUsersPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">會員管理 (Member Management)</h1>
                    <p className="text-gray-500 mt-1">管理一般會員、客服人員與管理員帳號權限。</p>
                </div>
            </div>

            <UserList />
        </div>
    );
}
