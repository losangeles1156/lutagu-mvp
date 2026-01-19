import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import AdmZip from 'adm-zip';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// Dataset configuration - ODPT & Hokonavi URLs
const DATASETS = [
    // Previous ODPT datasets
    {
        name: 'Toei Oedo Line Yoyogi Station',
        station_id: 'odpt:Station:Toei.Oedo.Yoyogi',
        source: 'odpt_hokonavi_yoyogi',
        zip_url: 'https://api-public.odpt.org/api/v4/files/hokonavi/data/nwd_oedo_yoyogi_geojson.zip'
    },
    {
        name: 'Toei Oedo Line Roppongi Station',
        station_id: 'odpt:Station:Toei.Oedo.Roppongi',
        source: 'odpt_hokonavi_roppongi',
        zip_url: 'https://api-public.odpt.org/api/v4/files/hokonavi/data/nwd_oedo_roppongi_geojson.zip'
    },
    {
        name: 'Toei Oedo Line Higashi-shinjuku Station',
        station_id: 'odpt:Station:Toei.Oedo.HigashiShinjuku',
        source: 'odpt_hokonavi_higashi_shinjuku',
        zip_url: 'https://api-public.odpt.org/api/v4/files/hokonavi/data/nwd_oedo_higashi-shinjuku_geojson.zip'
    },
    {
        name: 'Toei Oedo Line Azabu-juban Station',
        station_id: 'odpt:Station:Toei.Oedo.AzabuJuban',
        source: 'odpt_hokonavi_azabu_juban',
        zip_url: 'https://api-public.odpt.org/api/v4/files/hokonavi/data/nwd_oedo_azabu-juban_geojson.zip'
    },
    {
        name: 'Toei Oedo Line Aoyama-itchome Station',
        station_id: 'odpt:Station:Toei.Oedo.AoyamaItchome',
        source: 'odpt_hokonavi_aoyama_itchome',
        zip_url: 'https://api-public.odpt.org/api/v4/files/hokonavi/data/nwd_oedo_aoyama-itchome_geojson.zip'
    },
    {
        name: 'Toei Oedo Line Akabanebashi Station',
        station_id: 'odpt:Station:Toei.Oedo.Akabanebashi',
        source: 'odpt_hokonavi_akabanebashi',
        zip_url: 'https://api-public.odpt.org/api/v4/files/hokonavi/data/nwd_oedo_akabanebashi_geojson.zip'
    },
    {
        name: 'Toei Oedo Line Kokuritsu-kyogijo Station',
        station_id: 'odpt:Station:Toei.Oedo.KokuritsuKyogijo',
        source: 'odpt_hokonavi_kokuritsu_kyogijo',
        zip_url: 'https://api-public.odpt.org/api/v4/files/hokonavi/data/nwd_oedo_kokuritsu-kyogijo_geojson.zip'
    },
    {
        name: 'Toei Oedo Line Tochomae Station',
        station_id: 'odpt:Station:Toei.Oedo.Tochomae',
        source: 'odpt_hokonavi_tochomae',
        zip_url: 'https://api-public.odpt.org/api/v4/files/hokonavi/data/nwd_oedo_tochomae_geojson.zip'
    },
    {
        name: 'Toei Oedo Line Shinjuku-nishiguchi Station',
        station_id: 'odpt:Station:Toei.Oedo.ShinjukuNishiguchi',
        source: 'odpt_hokonavi_shinjuku_nishiguchi',
        zip_url: 'https://api-public.odpt.org/api/v4/files/hokonavi/data/nwd_oedo_shinjuku-nishiguchi_geojson.zip'
    },
    {
        name: 'Toei Oedo Line Shinjuku Station',
        station_id: 'odpt:Station:Toei.Oedo.Shinjuku',
        source: 'odpt_hokonavi_shinjuku',
        zip_url: 'https://api-public.odpt.org/api/v4/files/hokonavi/data/nwd_oedo_shinjuku_geojson.zip'
    },
    // New Hokonavi datasets (Direct GeoJSON)
    {
        name: 'Akabane Station Area',
        station_id: 'hokonavi:Station:Akabane',
        source: 'hokonavi_akabane',
        link_url: 'https://ckan.hokonavi.go.jp/dataset/2a0005b1-cdf2-43b7-81f8-2ce05a987da2/resource/55b154d0-ced2-494e-94cb-ff02c623ee79/download/link.geojson',
        node_url: 'https://ckan.hokonavi.go.jp/dataset/2a0005b1-cdf2-43b7-81f8-2ce05a987da2/resource/042e7998-34cc-48ed-b23d-b5953898bed2/download/node.geojson'
    },
    {
        name: 'Shibuya South Area',
        station_id: 'hokonavi:Area:ShibuyaSouth',
        source: 'hokonavi_shibuya_south',
        link_url: 'https://ckan.hokonavi.go.jp/dataset/8401dd6c-a3fb-48f2-8a9d-2955f6320569/resource/289e1742-5ea6-4e28-a4d5-4838253c0de1/download/link.geojson',
        node_url: 'https://ckan.hokonavi.go.jp/dataset/8401dd6c-a3fb-48f2-8a9d-2955f6320569/resource/491dd1df-a7bc-44c0-97d4-652fd30b2c81/download/node.geojson'
    },
    {
        name: 'Shibuya/Sendagaya/Shinjuku Station Area',
        station_id: 'hokonavi:Area:ShibuyaSendagayaShinjuku',
        source: 'hokonavi_shibuya_sendagaya_shinjuku',
        link_url: 'https://ckan.hokonavi.go.jp/dataset/eaf1695b-fc4c-41f0-8ff1-3279d0cfa839/resource/1d2d13e1-3202-4d0e-bb37-b91e80aab01e/download/link.geojson',
        node_url: 'https://ckan.hokonavi.go.jp/dataset/eaf1695b-fc4c-41f0-8ff1-3279d0cfa839/resource/7f785b36-48db-4279-a4a5-5140e4dac7c5/download/node.geojson'
    },
    {
        name: 'New National Stadium Area',
        station_id: 'hokonavi:Area:NationalStadium',
        source: 'hokonavi_national_stadium',
        link_url: 'https://ckan.hokonavi.go.jp/dataset/80f20531-e514-4d57-90f1-85be6dcc080e/resource/43f14c84-9e5e-43a2-adda-69e418b953aa/download/link.geojson',
        node_url: 'https://ckan.hokonavi.go.jp/dataset/80f20531-e514-4d57-90f1-85be6dcc080e/resource/3c817b8f-aff2-4d8b-991a-3267c1c3955c/download/node.geojson'
    },
    {
        name: 'Ikebukuro Station Area',
        station_id: 'hokonavi:Station:Ikebukuro',
        source: 'hokonavi_ikebukuro',
        link_url: 'https://ckan.hokonavi.go.jp/dataset/324ba112-3bc0-4b9c-8a36-7d30edf4cf92/resource/3a384823-0c28-4621-915f-4550537404a6/download/link.geojson',
        node_url: 'https://ckan.hokonavi.go.jp/dataset/324ba112-3bc0-4b9c-8a36-7d30edf4cf92/resource/f5d9a6e5-fd54-4b77-acd3-6f73e77676ff/download/node.geojson'
    },
    {
        name: 'Shinjuku Station Area (2)',
        station_id: 'hokonavi:Station:Shinjuku2',
        source: 'hokonavi_shinjuku_2',
        link_url: 'https://ckan.hokonavi.go.jp/dataset/18bc3f49-51b0-4d90-b0e2-afbdf142de29/resource/5abd6a98-2025-4323-b09d-ed4ea2ddf4aa/download/link.geojson',
        node_url: 'https://ckan.hokonavi.go.jp/dataset/18bc3f49-51b0-4d90-b0e2-afbdf142de29/resource/462f206a-b231-419d-a8a8-1500760b3a02/download/node.geojson'
    },
    {
        name: 'Imperial Palace/Budokan Area',
        station_id: 'hokonavi:Area:ImperialPalaceBudokan',
        source: 'hokonavi_imperial_palace_budokan',
        link_url: 'https://ckan.hokonavi.go.jp/dataset/dee0869a-c58f-445e-9a8c-4d3fc31be344/resource/1ced54f1-ebba-4b91-a6cf-f80a965719ad/download/link.geojson',
        node_url: 'https://ckan.hokonavi.go.jp/dataset/dee0869a-c58f-445e-9a8c-4d3fc31be344/resource/727a6bcd-0716-4d9b-8f4b-bb7ca71ae691/download/node.geojson'
    },
    {
        name: 'Odaiba Kaihinkoen Area',
        station_id: 'hokonavi:Area:Odaiba',
        source: 'hokonavi_odaiba',
        link_url: 'https://ckan.hokonavi.go.jp/dataset/e6eb2c0d-f1e7-4901-b154-c0a9c0f53c3d/resource/5b78e3f4-35e0-4ad8-a272-2b9e9d613b79/download/link.geojson',
        node_url: 'https://ckan.hokonavi.go.jp/dataset/e6eb2c0d-f1e7-4901-b154-c0a9c0f53c3d/resource/1f3b7b30-bfb0-420d-9e92-6c1d97862e7c/download/node.geojson'
    },
    {
        name: 'Shibuya Sendagaya Station Area',
        station_id: 'hokonavi:Station:Sendagaya',
        source: 'hokonavi_sendagaya',
        link_url: 'https://ckan.hokonavi.go.jp/dataset/a9c407c3-7823-4cee-9535-769b811289ae/resource/ec78b0ce-08ed-4c66-b495-9bb7251ef923/download/link.geojson',
        node_url: 'https://ckan.hokonavi.go.jp/dataset/a9c407c3-7823-4cee-9535-769b811289ae/resource/5d687b6f-2edb-4310-9014-521f7224cb1e/download/node.geojson'
    }
];

interface Dataset {
    name: string;
    station_id: string;
    source: string;
    zip_url?: string;
    link_url?: string;
    node_url?: string;
}

interface LinkFeature {
    type: string;
    geometry: { type: string; coordinates: number[][] };
    properties: {
        link_id: string;
        start_id: string;
        end_id: string;
        distance: number;
        rank?: string;
        rt_struct?: number;
        width?: number;
        vtcl_slope?: number;
        lev_diff?: number;
        brail_tile?: number;
        elevator?: number;
        roof?: number;
    };
}

interface NodeFeature {
    type: string;
    geometry: { type: string; coordinates: number[] };
    properties: {
        node_id: string;
        lat: number;
        lon: number;
        floor?: number;
        in_out?: number;
        link1_id?: string;
        link2_id?: string;
        link3_id?: string;
    };
}

async function fetchGeoJSON(url: string): Promise<any> {
    console.log(`  Fetching GeoJSON from ${url.substring(0, 60)}...`);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error(`  ❌ Fetch failed: ${(e as Error).message}`);
        return null;
    }
}

async function downloadAndExtractZip(url: string): Promise<{ links: LinkFeature[], nodes: NodeFeature[] } | null> {
    console.log(`  Downloading and extracting ZIP from ${url.substring(0, 60)}...`);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const buffer = await res.arrayBuffer();
        const zip = new AdmZip(Buffer.from(buffer));
        const zipEntries = zip.getEntries();

        let linkData: any = null;
        let nodeData: any = null;

        for (const entry of zipEntries) {
            if (entry.entryName.toLowerCase().includes('link.geojson')) {
                linkData = JSON.parse(entry.getData().toString('utf8'));
            } else if (entry.entryName.toLowerCase().includes('node.geojson')) {
                nodeData = JSON.parse(entry.getData().toString('utf8'));
            }
        }

        return {
            links: linkData?.features || [],
            nodes: nodeData?.features || []
        };
    } catch (e) {
        console.error(`  ❌ Zip processing failed: ${(e as Error).message}`);
        return null;
    }
}

async function ingestLinks(features: LinkFeature[], stationId: string, source: string) {
    if (features.length === 0) return;

    // Chunk processing for large datasets
    const CHUNK_SIZE = 500;
    for (let i = 0; i < features.length; i += CHUNK_SIZE) {
        const chunk = features.slice(i, i + CHUNK_SIZE);
        const rows = chunk.map(f => ({
            link_id: f.properties.link_id,
            station_id: stationId,
            start_node_id: f.properties.start_id,
            end_node_id: f.properties.end_id,
            geometry: `LINESTRING(${f.geometry.coordinates.map(c => `${c[0]} ${c[1]}`).join(', ')})`,
            distance_meters: f.properties.distance,
            accessibility_rank: f.properties.rank || null,
            route_structure: f.properties.rt_struct || null,
            width_class: f.properties.width || null,
            vertical_slope: f.properties.vtcl_slope || null,
            level_difference: f.properties.lev_diff || null,
            has_braille_tiles: f.properties.brail_tile === 1,
            has_elevator_access: f.properties.elevator === 1,
            has_roof: f.properties.roof === 1,
            source_dataset: source,
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase.from('pedestrian_links').upsert(rows, { onConflict: 'link_id' });
        if (error) {
            console.error(`  Link upsert error (chunk ${i}):`, error.message);
        }
    }
    console.log(`  ✅ Ingested ${features.length} links`);
}

async function ingestNodes(features: NodeFeature[], stationId: string, source: string) {
    if (features.length === 0) return;

    const CHUNK_SIZE = 500;
    for (let i = 0; i < features.length; i += CHUNK_SIZE) {
        const chunk = features.slice(i, i + CHUNK_SIZE);
        const rows = chunk.map(f => {
            const links = [f.properties.link1_id, f.properties.link2_id, f.properties.link3_id].filter(Boolean);
            return {
                node_id: f.properties.node_id,
                station_id: stationId,
                coordinates: `POINT(${f.geometry.coordinates[0]} ${f.geometry.coordinates[1]})`,
                lat: f.properties.lat,
                lon: f.properties.lon,
                floor_level: f.properties.floor || 0,
                is_indoor: f.properties.in_out === 1,
                connected_links: links,
                source_dataset: source,
                updated_at: new Date().toISOString()
            };
        });

        const { error } = await supabase.from('pedestrian_nodes').upsert(rows, { onConflict: 'node_id' });
        if (error) {
            console.error(`  Node upsert error (chunk ${i}):`, error.message);
        }
    }
    console.log(`  ✅ Ingested ${features.length} nodes`);
}

async function main() {
    console.log('=== ODPT & Hokonavi Pedestrian Network Data Ingestion ===\n');

    for (const ds of DATASETS) {
        console.log(`\n📍 Processing: ${ds.name}`);

        let links: LinkFeature[] = [];
        let nodes: NodeFeature[] = [];

        if (ds.zip_url) {
            const data = await downloadAndExtractZip(ds.zip_url);
            if (data) {
                links = data.links;
                nodes = data.nodes;
            }
        } else if (ds.link_url && ds.node_url) {
            const linkData = await fetchGeoJSON(ds.link_url);
            const nodeData = await fetchGeoJSON(ds.node_url);
            links = linkData?.features || [];
            nodes = nodeData?.features || [];
        }

        if (links.length > 0) {
            await ingestLinks(links, ds.station_id, ds.source);
        }
        if (nodes.length > 0) {
            await ingestNodes(nodes, ds.station_id, ds.source);
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n=== Ingestion Complete ===');

    // Verify counts
    const { count: linkCount } = await supabase.from('pedestrian_links').select('*', { count: 'exact', head: true });
    const { count: nodeCount } = await supabase.from('pedestrian_nodes').select('*', { count: 'exact', head: true });
    console.log(`Total Links in DB: ${linkCount}, Total Nodes in DB: ${nodeCount}`);
}

main().catch(console.error);
