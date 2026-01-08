import fs from 'fs';
import path from 'path';

const files = ['messages/zh-TW.json', 'messages/en.json', 'messages/ja.json'];

files.forEach(file => {
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath)) return;

    let content = fs.readFileSync(fullPath, 'utf8');

    // Attempt to fix common missing commas between property definitions
    // This is a naive fix: add comma if line ends with " and next line starts with "
    const lines = content.split('\n');
    const fixedLines = lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.endsWith('"')) {
            // Check next non-empty line
            for (let j = i + 1; j < lines.length; j++) {
                const nextTrimmed = lines[j].trim();
                if (nextTrimmed === '') continue;
                if (nextTrimmed.startsWith('"') || nextTrimmed.startsWith('{')) {
                    return line + ',';
                }
                break;
            }
        }
        if (trimmed.endsWith('}')) {
            // Check next non-empty line
            for (let j = i + 1; j < lines.length; j++) {
                const nextTrimmed = lines[j].trim();
                if (nextTrimmed === '') continue;
                if (nextTrimmed.startsWith('"')) {
                    return line + ',';
                }
                break;
            }
        }
        return line;
    });

    fs.writeFileSync(fullPath, fixedLines.join('\n'));
    console.log(`Fixed ${file}`);
});
