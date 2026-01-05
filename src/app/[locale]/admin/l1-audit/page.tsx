'use client';

import { L1AuditList } from '@/components/admin/L1AuditList';

export default function AdminL1AuditPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">L1 內容審核 (POI Audit)</h1>
                    <p className="text-gray-500">
                        管理各分類顯示的 POI，新增外部連結與短評。
                    </p>
                </div>
            </div>

            <L1AuditList />
        </div>
    );
}
