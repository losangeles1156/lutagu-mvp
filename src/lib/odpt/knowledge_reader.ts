import fs from 'fs/promises';
import path from 'path';

const KNOWLEDGE_BASE_DIR = path.resolve(process.cwd(), 'knowledge/stations');

export async function getStationWisdom(stationId: string): Promise<string> {
    const dir = path.join(KNOWLEDGE_BASE_DIR, stationId);
    let wisdom = "";

    try {
        // 1. Timetables
        const timetablePath = path.join(dir, 'timetables.json');
        const timetableData = await fs.readFile(timetablePath, 'utf-8').catch(() => null);

        if (timetableData) {
            const timetables = JSON.parse(timetableData);
            wisdom += "## Train Schedules\n";
            // Heuristic: Summarize first/last trains and frequency
            // (Full parsing is complex, for now we dump raw or simplified structure)
            // Let's create a simplified summary:
            timetables.forEach((tt: any) => {
                const direction = tt['odpt:railDirection']?.replace('odpt.RailDirection:', '') || 'Unknown';
                const calendar = tt['odpt:calendar']?.replace('odpt.Calendar:', '') || 'Unknown';
                const trains = tt['odpt:stationTimetableObject'] || [];
                if (trains.length > 0) {
                    const first = trains[0]['odpt:departureTime'];
                    const last = trains[trains.length - 1]['odpt:departureTime'];
                    wisdom += `- To ${direction} (${calendar}): First ${first}, Last ${last}, Total ${trains.length} trains.\n`;
                }
            });
            wisdom += "\n";
        }

        // 2. Fares
        const farePath = path.join(dir, 'fares.json');
        const fareData = await fs.readFile(farePath, 'utf-8').catch(() => null);

        if (fareData) {
            const fares = JSON.parse(fareData);
            wisdom += "## [L3] Official Fares (IC Card / Ticket)\n";
            // Limit to top 20 or popular destinations to save context
            const popular = fares.slice(0, 15);
            popular.forEach((f: any) => {
                const to = f['odpt:toStation']?.replace('odpt.Station:', '');
                wisdom += `- To ${to}: ${f['odpt:icCardFare']} Yen (IC) / ${f['odpt:ticketFare']} Yen (Ticket)\n`;
            });
            if (fares.length > 15) wisdom += `...and ${fares.length - 15} more destinations.\n`;
        }

        // 3. Unstructured Articles (KB)
        const articlePath = path.join(dir, 'articles.md');
        const articleData = await fs.readFile(articlePath, 'utf-8').catch(() => null);

        if (articleData) {
            wisdom += "\n## [KB] Expert Local Knowledge (Tips & Hacks)\n";
            wisdom += articleData + "\n";
        }

    } catch (error) {
        console.error(`Error reading knowledge for ${stationId}:`, error);
        wisdom += "(Data unavailable due to read error)\n";
    }

    return wisdom;
}
