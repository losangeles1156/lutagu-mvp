
import fs from 'fs';
import path from 'path';

const STORAGE_PATH = path.join(process.cwd(), 'src/lib/l4/data/station_dna.json');

export interface StationDNA {
    id: string;
    text: string;
    generatedAt: number;
    tagsSnapshot: string[]; // Keep track of what tags generated this
}

export class StationDNAStore {
    private static cache: Map<string, StationDNA> | null = null;

    private static load() {
        if (this.cache) return;

        try {
            if (fs.existsSync(STORAGE_PATH)) {
                const data = fs.readFileSync(STORAGE_PATH, 'utf-8');
                const json = JSON.parse(data);
                this.cache = new Map(Object.entries(json));
            } else {
                this.cache = new Map();
            }
        } catch (error) {
            console.error('[StationDNAStore] Failed to load DNA store:', error);
            this.cache = new Map();
        }
    }

    static getDNA(id: string): string | null {
        this.load();
        const entry = this.cache?.get(id);
        return entry ? entry.text : null;
    }

    static saveDNA(id: string, text: string, tags: string[]) {
        this.load();

        this.cache!.set(id, {
            id,
            text,
            generatedAt: Date.now(),
            tagsSnapshot: tags
        });

        // Persist to disk (Sync for safety in offline script)
        try {
            const obj = Object.fromEntries(this.cache!);
            fs.writeFileSync(STORAGE_PATH, JSON.stringify(obj, null, 2), 'utf-8');
        } catch (error) {
            console.error('[StationDNAStore] Failed to save DNA store:', error);
        }
    }

    static getAllCount(): number {
        this.load();
        return this.cache?.size || 0;
    }
}
