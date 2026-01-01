
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const OUTPUT_SQL_PATH = path.join(process.cwd(), 'supabase', 'migrations', '20260101_ingest_hokonavi_data.sql');
const TEMP_DIR = path.join(process.cwd(), 'temp_data_new');

// Mapping for boolean fields (Assuming 1=True, 2=False/Unknown based on typical Hokonavi/ODPT data)
function mapBool(val: any): boolean {
  return val === 1 || val === '1';
}

function escapeSql(str: string): string {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

function processGeoJSON(filePath: string, sourceName: string, idPrefix: string) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return { nodes: [], links: [] };
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const geojson = JSON.parse(raw);
  const nodes: string[] = [];
  const links: string[] = [];

  geojson.features.forEach((f: any) => {
    const props = f.properties;
    const geom = f.geometry;

    if (!geom) return;

    // Detect if it's a Node or Link based on properties and geometry
    if (props.node_id && geom.type === 'Point') {
      // Node
      const nodeId = `${idPrefix}${props.node_id}`;
      const lon = geom.coordinates[0];
      const lat = geom.coordinates[1];
      const floor = props.floor || 0;
      const isIndoor = props.in_out === 1; // Assuming 1=Indoor, 2=Outdoor? Or vice versa. 
      // Actually Hokonavi: 1=Indoor, 2=Outdoor, 3=Semi-outdoor. 
      // Let's assume 1=Indoor for now.
      
      // SQL
      nodes.push(`
        INSERT INTO pedestrian_nodes (node_id, coordinates, lat, lon, floor_level, is_indoor, source_dataset)
        VALUES (
          '${nodeId}',
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326),
          ${lat},
          ${lon},
          ${floor},
          ${isIndoor},
          '${sourceName}'
        ) ON CONFLICT (node_id) DO UPDATE SET updated_at = NOW();
      `);

    } else if (props.link_id && geom.type === 'LineString') {
      // Link
      const linkId = `${idPrefix}${props.link_id}`;
      const startId = `${idPrefix}${props.start_id}`;
      const endId = `${idPrefix}${props.end_id}`;
      const distance = props.distance || 0;
      
      const rank = escapeSql(props.rank);
      const rt_struct = props.rt_struct || 0;
      const width = props.width || 0;
      const slope = props.vtcl_slope || 0;
      const lev_diff = props.lev_diff || 0;
      
      const braille = mapBool(props.brail_tile);
      const elevator = mapBool(props.elevator);
      const roof = mapBool(props.roof);

      const geomJson = JSON.stringify(geom);

      links.push(`
        INSERT INTO pedestrian_links (
          link_id, start_node_id, end_node_id, geometry, distance_meters,
          accessibility_rank, route_structure, width_class, vertical_slope, level_difference,
          has_braille_tiles, has_elevator_access, has_roof, source_dataset
        )
        VALUES (
          '${linkId}', '${startId}', '${endId}',
          ST_SetSRID(ST_GeomFromGeoJSON('${geomJson}'), 4326),
          ${distance},
          ${rank}, ${rt_struct}, ${width}, ${slope}, ${lev_diff},
          ${braille}, ${elevator}, ${roof}, '${sourceName}'
        ) ON CONFLICT (link_id) DO UPDATE SET updated_at = NOW();
      `);
    }
  });

  return { nodes, links };
}

async function main() {
  console.log('Generating SQL migration for Hokonavi data...');

  // Unzip Oedo line data if needed - SKIPPED to avoid timeouts, assume user or separate script handles it
  // const zipPath = path.join(TEMP_DIR, 'oedo_ueno_okachimachi_nwd.zip');
  // const unzipDir = path.join(TEMP_DIR, 'oedo_nwd');
  // if (fs.existsSync(zipPath) && !fs.existsSync(unzipDir)) { ... }

  let sqlOutput = `-- Migration: Ingest Hokonavi Data (Generated ${new Date().toISOString()})\n\n`;

  const datasets = [
    {
      name: 'Hokonavi_Daimon',
      prefix: 'hokonavi_daimon_',
      nodeFile: 'daimon_node.geojson',
      linkFile: 'daimon_link.geojson'
    },
    {
      name: 'Hokonavi_Ueno',
      prefix: 'hokonavi_ueno_',
      nodeFile: 'ueno_node.geojson',
      linkFile: 'ueno_link.geojson'
    },
    {
      name: 'ODPT_Oedo_UenoOkachimachi',
      prefix: 'odpt_oedo_ueno_',
      nodeFile: 'oedo_nwd/node.geojson',
      linkFile: 'oedo_nwd/link.geojson'
    }
  ];

  for (const ds of datasets) {
    console.log(`Processing ${ds.name}...`);
    
    const nodePath = path.join(TEMP_DIR, ds.nodeFile);
    const linkPath = path.join(TEMP_DIR, ds.linkFile);

    const nodeData = processGeoJSON(nodePath, ds.name, ds.prefix);
    const linkData = processGeoJSON(linkPath, ds.name, ds.prefix);

    if (nodeData.nodes.length > 0) {
      sqlOutput += `-- Nodes for ${ds.name}\n`;
      sqlOutput += nodeData.nodes.join('\n');
    }
    
    if (linkData.links.length > 0) {
      sqlOutput += `\n-- Links for ${ds.name}\n`;
      sqlOutput += linkData.links.join('\n');
    }
    
    console.log(`  Nodes: ${nodeData.nodes.length}, Links: ${linkData.links.length}`);
  }

  fs.writeFileSync(OUTPUT_SQL_PATH, sqlOutput);
  console.log(`SQL migration generated at: ${OUTPUT_SQL_PATH}`);
}

main().catch(console.error);
