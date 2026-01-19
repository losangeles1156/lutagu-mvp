
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabase } from '../src/lib/supabase';
import { SEED_NODES } from '../src/lib/nodes/seedNodes';

async function main() {
    console.log('Starting JR East Node Seeding...');

    // Filter for JR East nodes
    const jrNodes = SEED_NODES.filter(node => node.id.includes('JR-East'));

    console.log(`Found ${jrNodes.length} JR East nodes in SEED_NODES.`);

    for (const node of jrNodes) {
        console.log(`Processing ${node.id} (${node.name.en})...`);

        // Parse WKT location "POINT(lon lat)"
        let coordinates = null;
        if (typeof node.location === 'string' && node.location.startsWith('POINT')) {
            const matches = node.location.match(/\(([^)]+)\)/);
            if (matches) {
                const parts = matches[1].split(' ');
                const lon = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                coordinates = {
                    type: "Point",
                    crs: { type: "name", properties: { name: "EPSG:4326" } },
                    coordinates: [lon, lat]
                };
            }
        }

        // Prepare correct payload
        const payload = {
            id: node.id,
            city_id: node.city_id,
            name: node.name,
            coordinates: coordinates,
            node_type: node.type, // Map 'type' -> 'node_type'

            // parent_hub_id logic:
            // If is_hub is true, parent_hub_id must be NULL.
            // If is_hub is false, we technically need a parent.
            // For now, if we don't know the parent, leaving it NULL makes it a "Hub" in the system's eyes.
            // Correct approach: map is_hub=true -> null. is_hub=false -> undefined?
            // But strict DB might not enforce providing parent.
            parent_hub_id: node.is_hub ? null : null, // Default to null (Hub) for now to ensure visibility.

            vibe_tags: [node.vibe]
        };

        const { error } = await supabase
            .from('nodes')
            .upsert(payload, { onConflict: 'id' });

        if (error) {
            console.error(`Error inserting ${node.id}:`, error);
        } else {
            console.log(`Success: ${node.id}`);
        }
    }

    console.log('Seeding complete.');
}

main();
