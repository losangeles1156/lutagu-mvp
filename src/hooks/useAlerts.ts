'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

export interface TransitAlert {
    id: string;
    operator: string | null;
    railway: string;
    status: string;
    text_ja: string;
    text_en: string;
    severity: 'yellow' | 'orange' | 'red';
    updated_at: string;
}

export function useAlerts(favoriteNodeIds: string[]) {
    const [alerts, setAlerts] = useState<TransitAlert[]>([]);
    const [nodesMetadata, setNodesMetadata] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(true);

    // 1. Fetch node metadata (transit_lines) for favorite nodes
    useEffect(() => {
        if (favoriteNodeIds.length === 0) {
            setNodesMetadata({});
            setLoading(false);
            return;
        }

        const fetchNodeMetadata = async () => {
            try {
                const { data, error } = await supabase
                    .from('nodes')
                    .select('id, transit_lines')
                    .in('id', favoriteNodeIds);

                if (error) throw error;

                const metadata: Record<string, string[]> = {};
                data.forEach((node) => {
                    metadata[node.id] = (node.transit_lines as string[]) || [];
                });
                setNodesMetadata(metadata);
            } catch (e) {
                logger.error('Failed to fetch node metadata for alerts', e);
            }
        };

        fetchNodeMetadata();
    }, [JSON.stringify(favoriteNodeIds)]);

    // Derived unique railways to watch
    const targetRailways = useMemo(() => {
        const railways = new Set<string>();
        Object.values(nodesMetadata).forEach((lines) => {
            lines.forEach((line) => railways.add(line));
        });
        return Array.from(railways);
    }, [nodesMetadata]);

    // 2. Fetch initial alerts and subscribe to realtime
    useEffect(() => {
        if (targetRailways.length === 0) {
            setAlerts([]);
            setLoading(false);
            return;
        }

        const fetchAlerts = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('transit_alerts')
                    .select('*')
                    .in('railway', targetRailways)
                    .order('updated_at', { ascending: false });

                if (error) throw error;

                // Map status to severity (minimal logic for now, can be expanded)
                const mappedAlerts: TransitAlert[] = (data || []).map((alert) => ({
                    ...alert,
                    severity: mapStatusToSeverity(alert.status),
                }));

                setAlerts(mappedAlerts);
            } catch (e) {
                logger.error('Failed to fetch initial transit alerts', e);
            } finally {
                setLoading(false);
            }
        };

        fetchAlerts();

        // Subscribe to REALTIME updates
        const channel = supabase
            .channel('transit_alerts_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'transit_alerts',
                    filter: `railway=in.(${targetRailways.join(',')})`,
                },
                (payload) => {
                    logger.log('Realtime alert update:', payload);
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const newAlert = payload.new as any;
                        setAlerts((prev) => {
                            const filtered = prev.filter((a) => a.id !== newAlert.id);
                            return [
                                { ...newAlert, severity: mapStatusToSeverity(newAlert.status) },
                                ...filtered,
                            ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                        });
                    } else if (payload.eventType === 'DELETE') {
                        setAlerts((prev) => prev.filter((a) => a.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [JSON.stringify(targetRailways)]);

    return { alerts, nodesMetadata, loading };
}

// Helper: Simple status to severity mapper
function mapStatusToSeverity(status: string): 'yellow' | 'orange' | 'red' {
    const s = status.toLowerCase();
    if (s.includes('suspended') || s.includes('critical') || s.includes('見合わせ')) return 'red';
    if (s.includes('delay') || s.includes('major') || s.includes('遅延')) return 'orange';
    return 'yellow';
}
