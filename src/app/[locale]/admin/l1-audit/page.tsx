'use client';

import { L1AuditList } from '@/components/admin/L1AuditList';

export default function AdminL1AuditPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>
                        L1 內容審核
                    </h1>
                    <p className="text-sm text-slate-500">
                        管理各分類顯示的 POI，新增外部連結與短評。
                    </p>
                </div>
            </div>

            <L1AuditList />
        </div>
    );
}
