'use client';

import { useLocale } from 'next-intl';
import { NodeMerger } from '@/components/admin/NodeMerger';

export default function AdminNodesPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">節點合併管理 (Node Hubs)</h1>
                    <p className="text-gray-500">
                        選擇行政區 → 指定主 Hub → 合併子節點以簡化前台顯示。
                    </p>
                </div>
            </div>

            <NodeMerger />
        </div>
    );
}
