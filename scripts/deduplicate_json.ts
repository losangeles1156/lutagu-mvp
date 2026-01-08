import fs from 'fs';
import path from 'path';

const files = ['messages/zh-TW.json', 'messages/en.json', 'messages/ja.json'];

files.forEach(file => {
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath)) return;

    try {
        // Read content
        const content = fs.readFileSync(fullPath, 'utf8');

        // Parse JSON (this naturally deduplicates keys, keeping the last one)
        const json = JSON.parse(content);

        // Write back formatted
        fs.writeFileSync(fullPath, JSON.stringify(json, null, 4));
        console.log(`Deduplicated and formatted ${file}`);
    } catch (e) {
        console.error(`Error processing ${file}:`, e);
    }
});
