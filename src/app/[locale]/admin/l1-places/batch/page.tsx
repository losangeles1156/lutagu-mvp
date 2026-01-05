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
        <div className="container mx-auto py-8 px-4">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/l1-places" className="text-blue-600 hover:text-blue-800">
                    ← Back
                </Link>
                <h1 className="text-2xl font-bold">Batch Operations</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Export Section */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">Export Places</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Export all places to CSV or JSON format for backup or analysis.
                    </p>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={() => handleExport('json')}
                            disabled={exporting}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {exporting ? 'Exporting...' : 'Export as JSON'}
                        </button>
                        <button
                            onClick={() => handleExport('csv')}
                            disabled={exporting}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                            {exporting ? 'Exporting...' : 'Export as CSV'}
                        </button>
                    </div>
                </div>

                {/* Import Section */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">Import Places</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Import places from JSON format. Each place must include station_id, name_i18n, and category.
                    </p>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {result && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
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
                            className="w-full border rounded px-3 py-2 font-mono text-sm"
                            rows={10}
                        />
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setImportData(exampleImportData)}
                            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                            Load Example
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={importing || !importData}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {importing ? 'Importing...' : 'Import Places'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Import Format Guide */}
            <div className="mt-8 bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold mb-2">Import Format Guide</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Each place object should have the following structure:
                </p>
                <pre className="bg-white p-4 rounded border overflow-x-auto text-sm">
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
