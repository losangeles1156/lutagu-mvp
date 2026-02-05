'use client';

import { useLocale } from 'next-intl';
import { NodeMerger } from '@/components/admin/NodeMerger';

export default function AdminNodesPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>
                        節點合併管理
                    </h1>
                    <p className="text-sm text-slate-500">
                        選擇行政區 → 指定主 Hub → 合併子節點以簡化前台顯示。
                    </p>
                </div>
            </div>

            <NodeMerger />
        </div>
    );
}
