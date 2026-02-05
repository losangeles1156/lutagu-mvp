'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function BatchOperationsPage() {
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importData, setImportData] = useState('');
    const [result, setResult] = useState<{
        success: number;
        failed: number;
        errors: string[];
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Export places
    const handleExport = async (format: 'json' | 'csv') => {
        setExporting(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/l1/places/batch/export?format=${format}`);
            if (!res.ok) throw new Error('Export failed');

            if (format === 'csv') {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `places_export_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                const data = await res.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `places_export_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setExporting(false);
        }
    };

    // Import places
    const handleImport = async () => {
        setImporting(true);
        setError(null);
        setResult(null);

        try {
            const places = JSON.parse(importData);

            if (!Array.isArray(places)) {
                throw new Error('Import data must be an array of places');
            }

            const res = await fetch('/api/admin/l1/places/batch/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ places }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Import failed');
            }

            const data = await res.json();
            setResult(data.results);
            setImportData('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setImporting(false);
        }
    };

    const exampleImportData = JSON.stringify(
        [
            {
                station_id: "odpt.Station:JR-East.Yamanote.Ueno",
                name_i18n: { "ja": "上野アメ横商店", "en": "Ueno Ameyoko", "zh-TW": "上野阿美橫町" },
                description_i18n: { "ja": "アメ横の商店街", "en": "Ameyoko shopping street", "zh-TW": "阿美橫町商店街" },
                category: "shopping",
                subcategory: "market",
                address: "東京都台東区上野",
                location: { lat: 35.7147, lng: 139.7787 },
                is_partner: false,
                priority: 100,
                status: "draft"
            }
        ],
        null,
        2
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/l1-places" className="text-slate-600 hover:text-slate-900">
                    ← 返回
                </Link>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>
                    批次操作
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Export Section */}
                <div className="admin-card p-6">
                    <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-admin-display)' }}>匯出 Places</h2>
                    <p className="text-sm text-slate-600 mb-4">
                        Export all places to CSV or JSON format for backup or analysis.
                    </p>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl mb-4">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={() => handleExport('json')}
                            disabled={exporting}
                            className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50"
                        >
                            {exporting ? 'Exporting...' : 'Export as JSON'}
                        </button>
                        <button
                            onClick={() => handleExport('csv')}
                            disabled={exporting}
                            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-50"
                        >
                            {exporting ? 'Exporting...' : 'Export as CSV'}
                        </button>
                    </div>
                </div>

                {/* Import Section */}
                <div className="admin-card p-6">
                    <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-admin-display)' }}>匯入 Places</h2>
                    <p className="text-sm text-slate-600 mb-4">
                        Import places from JSON format. Each place must include station_id, name_i18n, and category.
                    </p>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl mb-4">
                            {error}
                        </div>
                    )}

                    {result && (
                        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 px-4 py-3 rounded-xl mb-4">
                            <div className="font-medium">Import completed!</div>
                            <div className="text-sm">
                                Success: {result.success} | Failed: {result.failed}
                            </div>
                            {result.errors.length > 0 && (
                                <details className="mt-2 text-sm">
                                    <summary>View errors</summary>
                                    <ul className="list-disc pl-4 mt-1">
                                        {result.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </details>
                            )}
                        </div>
                    )}

                    <div className="mb-4">
                        <textarea
                            value={importData}
                            onChange={(e) => setImportData(e.target.value)}
                            placeholder="Paste JSON array of places here..."
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400"
                            rows={10}
                        />
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setImportData(exampleImportData)}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                        >
                            Load Example
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={importing || !importData}
                            className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50"
                        >
                            {importing ? 'Importing...' : 'Import Places'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Import Format Guide */}
            <div className="admin-card p-6">
                <h3 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-admin-display)' }}>Import Format Guide</h3>
                <p className="text-sm text-slate-600 mb-4">
                    Each place object should have the following structure:
                </p>
                <pre className="bg-white p-4 rounded-xl border border-slate-200 overflow-x-auto text-sm">
{`{
  "station_id": "odpt.Station:JR-East.Yamanote.Ueno",
  "name_i18n": {
    "ja": "店名",
    "en": "Store Name",
    "zh-TW": "店家名稱"
  },
  "description_i18n": {
    "ja": "説明文",
    "en": "Description",
    "zh-TW": "描述文字"
  },
  "category": "shopping",  // shopping, dining, leisure, culture, nature, other
  "subcategory": "market",
  "address": "Full address",
  "location": { "lat": 35.7147, "lng": 139.7787 },
  "is_partner": false,
  "partner_id": "partner-uuid",
  "affiliate_url": "https://...",
  "priority": 100,
  "status": "draft"  // draft, pending, approved, rejected
}`}
                </pre>
            </div>
        </div>
    );
}
