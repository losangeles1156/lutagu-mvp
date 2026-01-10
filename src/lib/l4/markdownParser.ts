
import fs from 'fs';
import path from 'path';

/**
 * Mapping of station/railway names found in markdown to ODPT IDs
 */
const ENTITY_NAME_TO_ID: Record<string, string[]> = {
    // Stations
    '東京車站': ['odpt:Station:JR-East.Tokyo', 'odpt:Station:TokyoMetro.Tokyo'],
    '上野車站': ['odpt:Station:JR-East.Ueno', 'odpt:Station:TokyoMetro.Ueno'],
    '淺草車站': ['odpt:Station:TokyoMetro.Ginza.Asakusa', 'odpt:Station:Toei.Asakusa.Asakusa'],
    '新宿車站': ['odpt:Station:JR-East.Shinjuku', 'odpt:Station:TokyoMetro.Shinjuku', 'odpt:Station:Toei.Shinjuku.Shinjuku'],
    '澀谷車站': ['odpt:Station:JR-East.Shibuya', 'odpt:Station:TokyoMetro.Shibuya'],
    '池袋車站': ['odpt:Station:JR-East.Ikebukuro', 'odpt:Station:TokyoMetro.Ikebukuro'],
    '秋葉原車站': ['odpt:Station:JR-East.Akihabara', 'odpt:Station:TokyoMetro.Hibiya.Akihabara'],
    '銀座車站': ['odpt:Station:TokyoMetro.Ginza.Ginza', 'odpt:Station:TokyoMetro.Marunouchi.Ginza', 'odpt:Station:TokyoMetro.Hibiya.Ginza'],
    '品川車站': ['odpt:Station:JR-East.Shinagawa', 'odpt:Station:Keikyu.Main.Shinagawa'],
    '六本木車站': ['odpt:Station:TokyoMetro.Hibiya.Roppongi', 'odpt:Station:Toei.Oedo.Roppongi'],
    '大手町車站': ['odpt:Station:TokyoMetro.Marunouchi.Otemachi', 'odpt:Station:TokyoMetro.Tozai.Otemachi', 'odpt:Station:TokyoMetro.Chiyoda.Otemachi', 'odpt:Station:TokyoMetro.Hanzomon.Otemachi', 'odpt:Station:Toei.Mita.Otemachi'],
    '東京地鐵通則': ['global'],

    // Railway Lines
    '銀座線': ['odpt.Railway:TokyoMetro.Ginza'],
    '丸之內線': ['odpt.Railway:TokyoMetro.Marunouchi'],
    '日比谷線': ['odpt.Railway:TokyoMetro.Hibiya'],
    '東西線': ['odpt.Railway:TokyoMetro.Tozai'],
    '千代田線': ['odpt.Railway:TokyoMetro.Chiyoda'],
    '有樂町線': ['odpt.Railway:TokyoMetro.Yurakucho'],
    '半藏門線': ['odpt.Railway:TokyoMetro.Hanzomon'],
    '南北線': ['odpt.Railway:TokyoMetro.Namboku'],
    '副都心線': ['odpt.Railway:TokyoMetro.Fukutoshin'],
    '淺草線': ['odpt.Railway:Toei.Asakusa'],
    '三田線': ['odpt.Railway:Toei.Mita'],
    '新宿線': ['odpt.Railway:Toei.Shinjuku'],
    '大江戶線': ['odpt.Railway:Toei.Oedo'],
    '山手線': ['odpt.Railway:JR-East.Yamanote'],
    '京濱東北線': ['odpt.Railway:JR-East.KeihinTohoku'],
    '中央線': ['odpt.Railway:JR-East.Chuo'],
    '總武線': ['odpt.Railway:JR-East.Sobu'],
    '京葉線': ['odpt.Railway:JR-East.Keiyo'],
};

export interface ParsedKnowledge {
    id: string;
    entityName: string;
    entityIds: string[];
    section: string;
    content: string;
    type: 'tip' | 'warning' | 'accessibility' | 'timing' | 'info' | 'pass' | 'crowd';
    icon: string;
    priority: number;
}

export function parseKnowledgeMarkdown(filePath: string): ParsedKnowledge[] {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const results: ParsedKnowledge[] = [];
    let currentEntity = '';
    let currentSection = '';
    let currentBuffer: string[] = [];

    const flushBuffer = () => {
        if (currentEntity && currentSection && currentBuffer.length > 0) {
            const sectionContent = currentBuffer.join('\n').trim();
            if (sectionContent) {
                const entityIds = ENTITY_NAME_TO_ID[currentEntity] || [];

                // Determine type and icon
                let type: ParsedKnowledge['type'] = 'tip';
                let icon = '💡';
                let priority = 50;

                const lowerSection = currentSection.toLowerCase();
                const lowerContent = sectionContent.toLowerCase();

                // Check for explicit priority tag [priority: X]
                const priorityMatch = sectionContent.match(/\[priority:\s*(\d+)\]/i);
                if (priorityMatch) {
                    priority = parseInt(priorityMatch[1], 10);
                } else {
                    // Default heuristics
                    if (lowerSection.includes('轉乘') || lowerSection.includes('transfer')) {
                        type = 'warning';
                        icon = '⚠️';
                        priority = 80;
                    } else if (lowerSection.includes('無障礙') || lowerSection.includes('accessibility')) {
                        type = 'accessibility';
                        icon = '♿';
                        priority = 90;
                    } else if (lowerSection.includes('出口') || lowerSection.includes('exit')) {
                        type = 'info';
                        icon = '🚪';
                        priority = 40;
                    } else if (lowerSection.includes('前往機場') || lowerSection.includes('airport')) {
                        type = 'tip';
                        icon = '✈️';
                        priority = 70;
                    } else if (lowerSection.includes('基本資訊') || lowerSection.includes('info')) {
                        type = 'info';
                        icon = 'ℹ️';
                        priority = 30;
                    } else if (lowerSection.includes('票券') || lowerSection.includes('pass')) {
                        type = 'pass';
                        icon = '🎫';
                        priority = 60;
                    } else if (lowerSection.includes('擁擠') || lowerSection.includes('crowd')) {
                        type = 'crowd';
                        icon = '👥';
                        priority = 55;
                    }
                }

                // Clean up the content from tags
                const cleanContent = sectionContent.replace(/\[priority:\s*\d+\]/gi, '').trim();

                results.push({
                    id: `md-${currentEntity}-${currentSection}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    entityName: currentEntity,
                    entityIds,
                    section: currentSection,
                    content: cleanContent,
                    type,
                    icon,
                    priority
                });
            }
        }
        currentBuffer = [];
    };

    for (const line of lines) {
        if (line.startsWith('## ')) {
            flushBuffer();
            // Extract entity name, handling cases like "## 東京車站 (Tokyo Station)" or "## 山手線"
            currentEntity = line.replace('## ', '').trim().split(' ')[0];
            currentSection = '';
        } else if (line.startsWith('### ')) {
            flushBuffer();
            currentSection = line.replace('### ', '').trim();
        } else if (line.trim() === '---') {
            flushBuffer();
        } else if (currentEntity && currentSection) {
            currentBuffer.push(line);
        }
    }
    flushBuffer();

    return results;
}
