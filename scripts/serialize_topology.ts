
import fs from 'fs';
import path from 'path';
import CORE_TOPOLOGY from '../src/lib/l4/generated/coreTopology.json';

// --- Utilities from assistantEngine.ts ---

const SAME_STATION_MAP: Record<string, string> = {
    'hamamatsucho': 'daimon',
    'daimon': 'hamamatsucho',
    'kasuga': 'korakuen',
    'korakuen': 'kasuga',
    'tameikesanno': 'kokkaigijidomae',
    'kokkaigijidomae': 'tameikesanno',
    'ueno okachimachi': 'ueno',
    'ueno': 'ueno okachimachi',
    'shin okachimachi': 'okachimachi',
    'okachimachi': 'shin okachimachi',
    'naka okachimachi': 'ueno okachimachi',
    'awajicho': 'ogawamachi',
    'ogawamachi': 'awajicho',
    'mitsukoshimae': 'nihombashi',
    'nihombashi': 'mitsukoshimae',
    'shimbashi': 'shiodome',
    'shiodome': 'shimbashi',
    'yurakucho': 'hibiya',
    'hibiya': 'yurakucho',
    'meiji jingumae': 'harajuku',
    'harajuku': 'meiji jingumae',
    'suidobashi': 'kasuga',
    'roppongi itchome': 'roppongi',
    'sanjugonme': 'tokyo'
};

function normalizeStationName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/藏/g, '蔵')
        .replace(/澀/g, '渋')
        .replace(/涩/g, '渋')
        .replace(/澁/g, '渋')
        .replace(/廣/g, '広')
        .replace(/广/g, '広')
        .replace(/邊/g, '辺')
        .replace(/樂/g, '楽')
        .replace(/澤/g, '沢')
        .replace(/濱/g, '浜')
        .replace(/關/g, '関')
        .replace(/鐵/g, '鉄')
        .replace(/驛/g, '駅')
        .replace(/區/g, '区')
        .replace(/圖/g, '図')
        .replace(/淺/g, '浅')
        .replace(/線/g, '')
        .replace(/站/g, '')
        .replace(/駅/g, '')
        .replace(/jr/g, '')
        .replace(/都營/g, '')
        .replace(/都営/g, '')
        .replace(/東京地下鐵/g, '')
        .replace(/東京メトロ/g, '')
        .replace(/地下鐵/g, '')
        .replace(/地下鉄/g, '')
        .replace(/大江戸/g, '')
        .replace(/大江戶/g, '');
}

function normalizeOdptStationId(input: string): string {
    return input.replace(/^odpt:Station:/, 'odpt.Station:').trim();
}

// --- Graph Builder ---

type AdjacencyList = Record<string, Record<string, { cost: number; railwayId: string }>>;

function buildGraph(): AdjacencyList {
    const adj: AdjacencyList = {};

    const addEdge = (from: string, to: string, cost: number, railwayId: string) => {
        if (!adj[from]) adj[from] = {};
        // Keep lowest cost if multiple edges exist
        if (!adj[from][to] || adj[from][to].cost > cost) {
            adj[from][to] = { cost, railwayId };
        }
    };

    const stationGroups = new Map<string, string[]>();

    // 1. Line Connections
    (CORE_TOPOLOGY as any[]).forEach(railway => {
        if (!railway.stationOrder) return;

        const stations = railway.stationOrder
            .slice()
            .sort((a: any, b: any) => a.index - b.index)
            .map((s: any) => normalizeOdptStationId(s.station));

        for (let i = 0; i < stations.length; i++) {
            const s = stations[i];
            const baseName = normalizeStationName(s.split('.').pop()!);

            // Grouping Logic
            if (!stationGroups.has(baseName)) stationGroups.set(baseName, []);
            if (!stationGroups.get(baseName)!.includes(s)) stationGroups.get(baseName)!.push(s);

            if (SAME_STATION_MAP[baseName]) {
                const targetBase = SAME_STATION_MAP[baseName];
                if (!stationGroups.has(targetBase)) stationGroups.set(targetBase, []);
                if (!stationGroups.get(targetBase)!.includes(s)) stationGroups.get(targetBase)!.push(s);
            }

            // Edges (Physical Rail)
            if (i < stations.length - 1) {
                const next = stations[i + 1];
                // Assume 2 mins per station average for now
                addEdge(s, next, 2, railway.railwayId);
                addEdge(next, s, 2, railway.railwayId);
            }
        }
    });

    // 2. Transfer Connections (Hubs)
    stationGroups.forEach((group) => {
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                // Assume 5 mins transfer penalty
                addEdge(group[i], group[j], 5, 'transfer');
                addEdge(group[j], group[i], 5, 'transfer');
            }
        }
    });

    return adj;
}

// --- Main Execution ---

async function main() {
    console.log('[Serializer] Building Weighted Graph...');

    const graph = buildGraph();
    const nodeCount = Object.keys(graph).length;
    let edgeCount = 0;
    Object.values(graph).forEach(neighbors => edgeCount += Object.keys(neighbors).length);

    const output = {
        meta: {
            generated_at: new Date().toISOString(),
            node_count: nodeCount,
            edge_count: edgeCount,
            version: 'v2-weighted'
        },
        adj: graph
    };

    const targetDir = path.join(process.cwd(), 'public', 'data');
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, 'routing_graph.json');
    fs.writeFileSync(targetPath, JSON.stringify(output));

    console.log(`[Serializer] Graph saved to ${targetPath}`);
    console.log(`[Serializer] Stats: ${nodeCount} nodes, ${edgeCount} edges`);
}

main();
