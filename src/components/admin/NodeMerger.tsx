'use client';

import { logger } from '@/lib/utils/logger';

import { useState, useMemo, useEffect } from 'react';
import { useWardStore } from '@/lib/stores/wardStore';
import { NodeDatum, fetchNearbyNodes } from '@/lib/api/nodes';
import { ChevronRight, ArrowRight, Merge, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getDistanceKm, getNodeCoordinates } from '@/lib/utils/geoUtils';

export function NodeMerger() {
    const { wards, fetchWards, getNodesByWard } = useWardStore();
    const [selectedWard, setSelectedWard] = useState<string>('');
    const [nodes, setNodes] = useState<NodeDatum[]>([]);
    const [loading, setLoading] = useState(false);

    // Merge State
    const [targetHubId, setTargetHubId] = useState<string | null>(null);
    const [selectedChildren, setSelectedChildren] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Candidate Fetching State
    const [candidates, setCandidates] = useState<NodeDatum[]>([]);
    const [isFetchingCandidates, setIsFetchingCandidates] = useState(false);
    const [candidateRefreshTrigger, setCandidateRefreshTrigger] = useState(0);

    // Init Wards
    useEffect(() => {
        if (wards.length === 0) fetchWards();
    }, [wards.length, fetchWards]);

    // Fetch Nodes when ward changes
    useEffect(() => {
        if (!selectedWard) return;
        setLoading(true);
        getNodesByWard(selectedWard)
            .then(data => {
                setNodes(data);
                // Reset selection
                setTargetHubId(null);
                setSelectedChildren(new Set());
            })
            .catch(err => {
                logger.error('Failed to fetch nodes', err);
                toast.error('無法載入節點');
            })
            .finally(() => setLoading(false));
    }, [selectedWard, getNodesByWard]);

    // Categorize Nodes & Map Children
    const { hubs, independentNodes, hubChildrenMap } = useMemo(() => {
        const hubs: NodeDatum[] = [];
        const independentNodes: NodeDatum[] = [];
        const hubChildrenMap = new Map<string, NodeDatum[]>();

        // First pass: ID to Node map for easy lookup
        const nodeMap = new Map<string, NodeDatum>();
        nodes.forEach(n => nodeMap.set(n.id, n));

        // Second pass: Categorize
        nodes.forEach(n => {
            if (n.parent_hub_id) {
                // It's a child
                if (!hubChildrenMap.has(n.parent_hub_id)) {
                    hubChildrenMap.set(n.parent_hub_id, []);
                }
                hubChildrenMap.get(n.parent_hub_id)?.push(n);
            } else {
                // It's a Hub or Independent
                hubs.push(n);
                independentNodes.push(n);
            }
        });

        // Sort by name (ja)
        hubs.sort((a, b) => (a.name.ja || '').localeCompare(b.name.ja || ''));
        return { hubs, independentNodes, hubChildrenMap };
    }, [nodes]);

    // Candidates for merging (Fetched via Spatial API)
    useEffect(() => {
        if (!targetHubId) {
            setCandidates([]);
            return;
        }

        const targetNode = nodes.find(n => n.id === targetHubId);
        if (!targetNode) return;

        const targetCoords = getNodeCoordinates(targetNode);
        if (!targetCoords) return;

        const loadCandidates = async () => {
            setIsFetchingCandidates(true);
            try {
                // Fetch 1km radius
                const results = await fetchNearbyNodes(targetCoords[0], targetCoords[1], 1000);

                // Filter and Enhance
                const filtered = results.filter((n: NodeDatum) => {
                    if (n.id === targetHubId) return false;
                    if (n.parent_hub_id) return false; // Already merged (independent only)
                    if (n.type === 'bus_stop') return false;
                    return true;
                }).map((n: NodeDatum) => {
                    const c = getNodeCoordinates(n);
                    let dist = 0;
                    if (c) {
                        dist = getDistanceKm(targetCoords[0], targetCoords[1], c[0], c[1]);
                    }
                    return { ...n, _distance: dist };
                }).sort((a: any, b: any) => a._distance - b._distance);

                setCandidates(filtered);
            } catch (error) {
                logger.error('Failed to fetch nearby candidates', error);
                toast.error('無法載入附近節點');
            } finally {
                setIsFetchingCandidates(false);
            }
        };

        loadCandidates();
    }, [targetHubId, nodes, candidateRefreshTrigger]);

    const handleMerge = async () => {
        if (!targetHubId || selectedChildren.size === 0) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/nodes/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hub_node_id: targetHubId,
                    child_node_ids: Array.from(selectedChildren),
                    action: 'merge'
                })
            });

            if (!res.ok) throw new Error('Merge API Failed');

            toast.success(`成功合併 ${selectedChildren.size} 個節點`, {
                description: '頁面已刷新，Hub 狀態已更新',
                duration: 4000,
            });

            // Refresh
            const data = await getNodesByWard(selectedWard);
            setNodes(data);
            setSelectedChildren(new Set());
            // Trigger candidate list refresh
            setCandidateRefreshTrigger(prev => prev + 1);

        } catch (error) {
            logger.error(error);
            toast.error('合併失敗');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUnmerge = async (childId: string, hubId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selecting the hub
        if (!confirm('確定要將此節點移出 Hub 嗎？')) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/nodes/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hub_node_id: hubId,
                    child_node_ids: [childId],
                    action: 'unmerge'
                })
            });

            if (!res.ok) throw new Error('Unmerge API Failed');

            toast.success('已移除節點');
            const data = await getNodesByWard(selectedWard);
            setNodes(data);
            // Trigger candidate list refresh (unmerged node may become available)
            setCandidateRefreshTrigger(prev => prev + 1);
        } catch (error) {
            toast.error('移除失敗');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="admin-card p-6 min-h-[600px] flex flex-col">
            {/* Header / Ward Selector */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">選擇行政區</label>
                    <select
                        value={selectedWard}
                        onChange={(e) => setSelectedWard(e.target.value)}
                        className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400"
                    >
                        <option value="">-- 請選擇 --</option>
                        {wards.map(w => (
                            <option key={w.id} value={w.id}>{w.name.ja} ({w.name.en})</option>
                        ))}
                    </select>
                </div>
                {loading && <RefreshCw className="animate-spin text-slate-400" />}
            </div>

            {/* Main Workspace */}
            <div className="flex-1 grid grid-cols-[1fr,auto,1fr] gap-6">

                {/* Left: Target Hub Selection */}
                <div className="border border-slate-200 rounded-2xl p-4 flex flex-col bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">1</div>
                        選擇主節點 (Target Hub)
                    </h3>
                    <div className="flex-1 overflow-y-auto max-h-[500px] space-y-2 pr-2 custom-scrollbar">
                        {hubs.map(node => {
                            const children = hubChildrenMap.get(node.id) || [];
                            const isSelected = targetHubId === node.id;

                            return (
                                <div
                                    key={node.id}
                                    onClick={() => {
                                        setTargetHubId(node.id);
                                        setSelectedChildren(new Set());
                                    }}
                                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer group ${isSelected
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-200'
                                        : 'bg-white border-slate-200 hover:border-slate-400'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-sm">{node.name.ja}</div>
                                            <div className={`text-xs truncate ${isSelected ? 'text-slate-200' : 'opacity-70'}`}>{node.id}</div>
                                        </div>
                                        {children.length > 0 && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                {children.length} 成員
                                            </span>
                                        )}
                                    </div>

                                    {/* Children List */}
                                    {children.length > 0 && (
                                        <div className={`mt-3 pt-2 border-t ${isSelected ? 'border-white/20' : 'border-slate-100'} space-y-1`}>
                                            <div className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>已合併成員</div>
                                            {children.map(child => (
                                                <div key={child.id} className={`flex justify-between items-center text-xs p-1.5 rounded ${isSelected ? 'bg-black/20' : 'bg-slate-50'
                                                    }`}>
                                                    <span>{child.name.ja}</span>
                                                    <button
                                                        onClick={(e) => handleUnmerge(child.id, node.id, e)}
                                                        className={`p-1 rounded hover:bg-red-500 hover:text-white transition ${isSelected ? 'text-slate-200' : 'text-slate-400'
                                                            }`}
                                                        title="移除此節點 (Unmerge)"
                                                    >
                                                        <span className="sr-only">移除</span>
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {hubs.length === 0 && !loading && (
                            <div className="text-slate-400 text-center py-10 text-sm">請先選擇行政區</div>
                        )}
                    </div>
                </div>

                {/* Center: Action */}
                <div className="flex flex-col justify-center items-center gap-4">
                    <ArrowRight className="text-slate-300" />
                    <button
                        onClick={handleMerge}
                        disabled={!targetHubId || selectedChildren.size === 0 || isSubmitting}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
                    >
                        {isSubmitting ? <RefreshCw className="animate-spin w-4 h-4" /> : <Merge className="w-4 h-4" />}
                        合併 ({selectedChildren.size})
                    </button>
                    {targetHubId && (
                        <div className="text-xs text-center text-slate-500 max-w-[120px]">
                            將選定的子節點合併至左側 Hub
                        </div>
                    )}
                </div>

                {/* Right: Child Selection */}
                <div className="border border-slate-200 rounded-2xl p-4 flex flex-col bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">2</div>
                        選擇子節點 (Candidates)
                    </h3>

                    {!targetHubId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm">
                            <AlertCircle className="mb-2 opacity-50" />
                            請先選擇左側主 Hub
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto max-h-[500px] space-y-2 pr-2 custom-scrollbar">
                            <div className="text-xs text-slate-500 mb-2 px-1">
                                顯示可合併至 <b>{nodes.find(n => n.id === targetHubId)?.name.ja}</b> 的節點:
                            </div>
                            {isFetchingCandidates && (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                    <RefreshCw className="animate-spin w-6 h-6 mb-2" />
                                    <div className="text-xs">正在搜尋附近 1km 內的節點...</div>
                                </div>
                            )}
                            {!isFetchingCandidates && candidates.length === 0 && (
                                <div className="text-center py-10 text-slate-400 text-sm">
                                    沒有符合條件的節點
                                    <div className="text-xs mt-2 opacity-70">
                                        (僅顯示主 Hub 1公里內的獨立節點)
                                    </div>
                                </div>
                            )}
                            {!isFetchingCandidates && candidates.map(node => (
                                <div key={node.id} className="relative group">
                                    <button
                                        onClick={() => {
                                            const newSet = new Set(selectedChildren);
                                            if (newSet.has(node.id)) newSet.delete(node.id);
                                            else newSet.add(node.id);
                                            setSelectedChildren(newSet);
                                        }}
                                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${selectedChildren.has(node.id)
                                            ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                                            : 'bg-white border-slate-200 hover:border-emerald-300'
                                            }`}
                                    >
                                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center ${selectedChildren.has(node.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                                            }`}>
                                            {selectedChildren.has(node.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-sm text-slate-800">{node.name.ja}</div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-xs text-slate-500 truncate max-w-[120px]">{node.id}</div>
                                                {(node as any)._distance !== undefined && (
                                                    <div className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full whitespace-nowrap">
                                                        {(node as any)._distance < 0.1
                                                            ? '<100m'
                                                            : `${((node as any)._distance).toFixed(1)}km`}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
