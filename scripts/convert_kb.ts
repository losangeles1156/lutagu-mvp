import fs from 'fs';
import path from 'path';

// Types (simplified for script)
interface LocalizedText {
    'zh-TW': string;
    ja: string;
    en: string;
}
interface ExpertKnowledge {
    id: string;
    trigger: any;
    type: string;
    priority: number;
    icon: string;
    title: LocalizedText;
    content: LocalizedText;
}

const INPUT_FILE = path.join(__dirname, '../src/data/tokyo_transit_knowledge_base.md');
const OUTPUT_FILE = path.join(__dirname, '../src/data/station_wisdom_generated.json');

function parseMarkdown(markdown: string): ExpertKnowledge[] {
    const lines = markdown.split('\n');
    let currentStation = '';
    let currentSection = '';
    let buffer: string[] = [];

    const results: ExpertKnowledge[] = [];

    const flush = () => {
        if (buffer.length > 0 && currentStation && currentSection) {
            const content = buffer.join('\n').trim();
            if (content) {
                const id = `generated-${currentStation}-${currentSection.replace(/\s+/g, '-').toLowerCase()}-${Date.now() + Math.random().toString(36).substr(2, 5)}`;

                // Determine Type & Icon based on section
                let type = 'tip';
                let icon = '💡';
                let priority = 50;

                if (currentSection.includes('轉乘注意') || currentSection.includes('Transfer Caution')) {
                    type = 'warning';
                    icon = '⚠️';
                    priority = 80;
                } else if (currentSection.includes('出口') || currentSection.includes('Exit')) {
                    type = 'tip';
                    icon = '🚪';
                } else if (currentSection.includes('前往機場') || currentSection.includes('Airport')) {
                    type = 'tip';
                    icon = '✈️';
                    priority = 70;
                }

                results.push({
                    id,
                    trigger: {
                        // TODO: Map Station Name to Station ID (Manual mapping required later)
                        station_names_hint: [currentStation],
                        station_ids: [] // Needs manual fill
                    },
                    type,
                    priority,
                    icon,
                    title: {
                        'zh-TW': `${currentStation}: ${currentSection}`,
                        'ja': `${currentStation}: ${currentSection}`, // Placeholder
                        'en': `${currentStation}: ${currentSection}`  // Placeholder
                    },
                    content: {
                        'zh-TW': content,
                        'ja': content, // Placeholder
                        'en': content  // Placeholder
                    }
                });
            }
        }
        buffer = [];
    };

    for (const line of lines) {
        if (line.startsWith('## ')) {
            flush();
            currentStation = line.replace('## ', '').trim().split(' ')[0]; // Take first part "東京車站"
            currentSection = '';
        } else if (line.startsWith('### ')) {
            flush();
            currentSection = line.replace('### ', '').trim();
        } else if (line.trim() === '---') {
            flush();
        } else {
            if (line.trim().length > 0) {
                buffer.push(line.trim());
            }
        }
    }
    flush();

    return results;
}

const markdown = fs.readFileSync(INPUT_FILE, 'utf-8');
const data = parseMarkdown(markdown);

console.log(`Parsed ${data.length} items.`);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
console.log(`Saved to ${OUTPUT_FILE}`);
