
import fs from 'fs';
import path from 'path';

const jsonPath = path.join(process.cwd(), 'scripts/l1_pipeline/output/l1_pipeline_result.json');
const staticPath = path.join(process.cwd(), 'src/data/staticL1Data.ts');

try {
    if (fs.existsSync(jsonPath)) {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        console.log(`JSON Results: ${data.length} stations.`);
    } else {
        console.log('JSON Results: File not found.');
    }

    if (fs.existsSync(staticPath)) {
        const content = fs.readFileSync(staticPath, 'utf-8');
        // Rough count of keys in the object
        const match = content.match(/"(odpt\.Station:|osm:)[^"]+":/g);
        console.log(`Static Data Keys: ${match ? match.length : 0} stations.`);
    } else {
        console.log('Static Data: File not found.');
    }

} catch (e) {
    console.error(e);
}
