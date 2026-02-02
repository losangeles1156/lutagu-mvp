import { generateText } from 'ai';
import { AIRouter, TaskType } from '@/lib/agent/AIRouter';
import { L1NodeProfile } from '../types/L1Profile';
import { getDefaultTopology } from '../assistantEngine';
import { StationDNAStore } from './StationDNAStore';

/**
 * L1 Node Profile Generator
 */
export class StationProfileGenerator {
    private static stationMap: Map<string, any> | null = null;
    private static stationLinesMap: Map<string, number> | null = null;

    private static initialize() {
        if (this.stationMap) return;

        this.stationMap = new Map();
        this.stationLinesMap = new Map();

        // Ensure getDefaultTopology exists in assistantEngine
        // If imports fail, this code will need update
        const topology = getDefaultTopology();

        topology.forEach((railway: any) => {
            const operatorId = railway.operator;
            railway.stationOrder.forEach((s: any) => {
                const id = s.station;

                // Track station metadata
                if (!this.stationMap!.has(id)) {
                    this.stationMap!.set(id, {
                        title: s.title,
                        operator: operatorId
                    });
                }

                // Count lines by Station Name (Suffix) to aggregate Hubs
                // e.g. odpt.Station:JR-East.Chuo.Shinjuku -> Shinjuku
                const nameKey = id.split('.').pop();
                const currentCount = this.stationLinesMap!.get(nameKey) || 0;
                this.stationLinesMap!.set(nameKey, currentCount + 1);
            });
        });
    }

    static generate(nodeId: string): L1NodeProfile {
        this.initialize();

        const id = nodeId.replace('odpt:Station:', 'odpt.Station:');
        const meta = this.stationMap?.get(id);
        const nameKey = id.split('.').pop() || '';
        const lineCount = this.stationLinesMap?.get(nameKey) || 1;
        const isHub = lineCount >= 3; // 3+ lines = Hub

        const coreTags: string[] = [];
        const intentTags: string[] = ["TRANSIT"];
        const vibeTags: string[] = [];

        // 1. Core Tags (3-4 chars identity)
        if (meta) {
            // Operator Tag (Generic)
            // e.g. "JR-East" -> "JR", "TokyoMetro" -> "TOKY", "OsakaMetro" -> "OSAK"
            const opPrefix = meta.operator.split(/[-.]/)[0].toUpperCase(); // JR-East -> JR, TokyoMetro -> TOKY
            if (opPrefix === 'JR') coreTags.push("JR");
            else if (opPrefix === 'TOKYOMETRO') coreTags.push("METR");
            else if (opPrefix === 'TOEI') coreTags.push("TOEI");
            else coreTags.push(opPrefix.substring(0, 4)); // Fallback generic (e.g. SEIB -> SEIB)

            // Name Abbreviation (e.g. UENO -> UENO, SHINJUKU -> SHIN)
            const nameEn = (meta.title?.en || '').toUpperCase().replace(/[^A-Z]/g, '');
            if (nameEn.length >= 3) {
                coreTags.push(nameEn.substring(0, 4));
            }
        } else {
            // Fallback for unknown stations
            coreTags.push("UNKN");
        }

        if (isHub) {
            coreTags.push("HUB");
        }

        // 2. Intent Tags (5-8 chars capabilities)
        if (isHub) {
            intentTags.push("TRANSFER");
            intentTags.push("SHOPPING"); // Assumption for hubs
            // Core Facilities for Hubs
            intentTags.push("ELEVATOR");
            intentTags.push("RESTROOM");
            intentTags.push("ATM");
        } else {
            intentTags.push("COMMUTE");
        }

        // Detect Airport
        if (id.includes('Airport') || (meta?.title?.en?.includes('Airport'))) {
            intentTags.push("FLIGHT");
            intentTags.push("LUGGAGE");
            coreTags.push("AIRP");
        }

        // 3. Vibe Tags (Visuals)
        if (isHub) {
            vibeTags.push("BUSY");
            vibeTags.push("RUSH");
            vibeTags.push("MULTI_LEVEL");
        } else {
            vibeTags.push("LOCAL");
            vibeTags.push("QUIET");
        }

        // 4. Station Heuristics (Area Character)
        const heuristic = this.getHeuristics(nameKey);
        if (heuristic) {
            if (heuristic.intent) intentTags.push(...heuristic.intent);
            if (heuristic.vibe) vibeTags.push(...heuristic.vibe);
        }

        // 5. Integrate Station DNA
        const dna = this.getStationDNA(nodeId);

        return {
            nodeId: id,
            core: { identity: Array.from(new Set(coreTags)) },
            intent: { capabilities: Array.from(new Set(intentTags)) },
            vibe: { visuals: Array.from(new Set(vibeTags)) },
            weights: {
                transfer_ease: isHub ? 0.7 : 0.9, // Hubs are harder to transfer
                tourism_value: isHub ? 0.8 : 0.3,
                crowd_level: isHub ? 0.9 : 0.4
            },
            dna: dna || undefined
        };
    }

    private static getHeuristics(name: string): { intent?: string[], vibe?: string[] } | null {
        // Simple manual mapping for Major Tourist Areas
        // This simulates L2 Knowledge without DB lookup
        const map: Record<string, { intent?: string[], vibe?: string[] }> = {
            'Ginza': { intent: ['SHOPPING', 'DINING'], vibe: ['LUXURY', 'MODERN'] },
            'Asakusa': { intent: ['SIGHTSEEING', 'CULTURE'], vibe: ['TRADITIONAL', 'TEMPLE'] },
            'Akihabara': { intent: ['SHOPPING', 'GAME'], vibe: ['ANIME', 'ELECTRIC'] },
            'Shinjuku': { intent: ['SHOPPING', 'DINING'], vibe: ['BUSY', 'NIGHT'] },
            'Shibuya': { intent: ['SHOPPING', 'FASHION'], vibe: ['YOUTH', 'TRENDY'] },
            'Harajuku': { intent: ['SHOPPING', 'FASHION'], vibe: ['CUTE', 'YOUTH'] },
            'Ueno': { intent: ['SIGHTSEEING', 'CULTURE'], vibe: ['PARK', 'MUSEUM'] },
            'Roppongi': { intent: ['DINING', 'ART'], vibe: ['MODERN', 'NIGHT'] },
            'Maihama': { intent: ['THEMEPARK', 'FAMILY'], vibe: ['DREAM', 'HAPPY'] },
            'Oshiage': { intent: ['SIGHTSEEING', 'SHOPPING'], vibe: ['SKYTREE', 'MODERN'] },
            'Tsukiji': { intent: ['DINING', 'FOOD'], vibe: ['MARKET', 'BUSY'] }
        };

        // Fuzzy match or exact match on suffix
        // e.g. "Ginza-Itchome" -> contains Ginza? maybe too risky.
        // using exact suffix match from nameKey
        return map[name] || null;
    }

    /**
     * 獲取預先生成的車站性格描述 (Station DNA)
     * 從 StationDNAStore 讀取，不執行 Runtime AI 生成
     */
    static getStationDNA(nodeId: string): string | null {
        // Normalize ID
        const cleanId = nodeId.replace('odpt:Station:', 'odpt.Station:');

        // Read from Offline Store
        const dna = StationDNAStore.getDNA(cleanId);

        return dna || null;
    }
}
