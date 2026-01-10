
import fs from 'fs';
import path from 'path';

/**
 * Mapping of station names found in markdown to ODPT IDs
 */
const STATION_NAME_TO_ID: Record<string, string[]> = {
    '東京車站': ['odpt:Station:JR-East.Tokyo', 'odpt:Station:TokyoMetro.Tokyo'],
    '上野車站': ['odpt:Station:JR-East.Ueno', 'odpt:Station:TokyoMetro.Ueno'],
    '淺草車站': ['odpt:Station:TokyoMetro.Ginza.Asakusa', 'odpt:Station:Toei.Asakusa.Asakusa'],
    '新宿車站': ['odpt:Station:JR-East.Shinjuku', 'odpt:Station:TokyoMetro.Shinjuku', 'odpt:Station:Toei.Shinjuku.Shinjuku'],
    '澀谷車站': ['odpt:Station:JR-East.Shibuya', 'odpt:Station:TokyoMetro.Shibuya'],
    '池袋車站': ['odpt:Station:JR-East.Ikebukuro', 'odpt:Station:TokyoMetro.Ikebukuro'],
    '秋葉原車站': ['odpt:Station:JR-East.Akihabara', 'odpt:Station:TokyoMetro.Hibiya.Akihabara'],
    '銀座車站': ['odpt:Station:TokyoMetro.Ginza.Ginza', 'odpt:Station:TokyoMetro.Marunouchi.Ginza', 'odpt:Station:TokyoMetro.Hibiya.Ginza'],
};

export interface ParsedKnowledge {
    id: string;
    stationName: string;
    stationIds: string[];
    section: string;
    content: string;
    type: 'tip' | 'warning' | 'accessibility' | 'timing' | 'info';
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
    let currentStation = '';
    let currentSection = '';
    let currentBuffer: string[] = [];

    const flushBuffer = () => {
        if (currentStation && currentSection && currentBuffer.length > 0) {
            const sectionContent = currentBuffer.join('\n').trim();
            if (sectionContent) {
                const stationIds = STATION_NAME_TO_ID[currentStation] || [];
                
                // Determine type and icon
                let type: ParsedKnowledge['type'] = 'tip';
                let icon = '💡';
                let priority = 50;

                const lowerSection = currentSection.toLowerCase();
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
                }

                results.push({
                    id: `md-${currentStation}-${currentSection}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    stationName: currentStation,
                    stationIds,
                    section: currentSection,
                    content: sectionContent,
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
            currentStation = line.replace('## ', '').trim().split(' ')[0]; // Extract "東京車站" from "## 東京車站 (Tokyo Station)"
            currentSection = '';
        } else if (line.startsWith('### ')) {
            flushBuffer();
            currentSection = line.replace('### ', '').trim();
        } else if (line.trim() === '---') {
            flushBuffer();
        } else if (currentStation && currentSection) {
            currentBuffer.push(line);
        }
    }
    flushBuffer();

    return results;
}
