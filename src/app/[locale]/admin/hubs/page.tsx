import React from 'react';

export default function HubsAdminPage() {
    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>
                    Hub 管理中心
                </h1>
                <p className="text-sm text-slate-500">
                    選擇行政區後即可管理 Hub（此頁面仍在擴充中）。
                </p>
            </div>
            <div className="admin-card p-6">
                <div className="text-sm text-slate-600">此功能頁即將上線，可先使用「節點合併」頁面進行管理。</div>
            </div>
        </div>
    );
}
