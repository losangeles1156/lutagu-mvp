
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { generateLLMResponse } from '../src/lib/ai/llmClient';

// Load environment variables
dotenv.config({ path: '.env.local' });

const KNOWLEDGE_FILE = path.join(process.cwd(), 'knowledge/stations/riding_knowledge/expansion_minimax.md');

// Target stations to generate knowledge for
const TARGET_STATIONS = [
    {
        name: 'odpt:Station:JR-East.Yamanote.Ebisu (恵比壽站)',
        context: 'Focus on the long distance transfer between JR and Hibiya Line. Mention the specific exits for Yebisu Garden Place (Skywalk).'
    },
    {
        name: 'odpt:Station:JR-East.Meguro (目黑站)',
        context: 'Explain the complexity that this station is managed by Tokyu, but used by Toei Mita line and Tokyo Metro Namboku line explicitly. Mention the steep hill outside.'
    },
    {
        name: 'odpt:Station:JR-East.Nakano (中野站)',
        context: 'Focus on the Tozai line and Chuo line direct connection (Through Service). Explain why some Tozai line trains stop here and others continue to Mitaka.'
    },
    {
        name: 'odpt:Station:JR-East.Yamanote.Shinjuku (新宿站)',
        context: 'The busiest station. Explain West Exit (Skyscrapers) vs East Exit (Kabukicho). WARNING about Oedo Line transfer (very deep/confusing). Mention "Busta Shinjuku" (New South Exit) for buses.'
    },
    {
        name: 'odpt:Station:JR-East.Yamanote.Shibuya (澀谷站)',
        context: 'The Dungeon. Explain Ginza Line (3F) vs Fukutoshin/Toyoko Line (Deep Underground B5). Warn about Hachiko Exit crowding. Scramble Crossing orientation.'
    },
    {
        name: 'odpt:Station:JR-East.Yamanote.Ikebukuro (池袋站)',
        context: 'Seibu (East) vs Tobu (West) department store paradox. Fukutoshin line is far from JR. Mention the underground shopping connectivity.'
    },
    {
        name: 'odpt:Station:JR-East.Yamanote.Tokyo (東京站)',
        context: 'Marunouchi (Imperial Palace/Retro) vs Yaesu (Shinkansen/Bus/Modern). WARNING: Keiyo Line transfer (Disney) takes 15-20 mins walk.'
    }
];

const SYSTEM_PROMPT = `
You are an expert editor for the "Tokyo Transit Knowledge Base" (L4 Data).
Your task is to generate specific, actionable, and quantifyable transit station guides that can be automatically ingested into a database.

# Tagging System (STRICT - DO NOT BOLD THESE)
- Use: - [Trap] ICON **TITLE**: DESCRIPTION (Advice: ADVICE)
- Use: - [Hack] ICON **TITLE**: DESCRIPTION (Advice: ADVICE)
- Use: - [type] Location [Tag1] [Tag2] (where type is toilet|elevator|wifi|atm|locker)

# Guidelines
1. **Specific (具體量化)**: Avoid "far", use "walk 15 mins" or "500m". Avoid "deep", use "B5 floor".
2. **Actionable (行動導向)**: Tell the user exactly what to do. E.g., "Use the elevator at Exit 3 for luggage."
3. **No Fluff (拒絕廢話)**: NO adjectives like "convenient", "bustling", "beautiful". ONLY facts.
4. **Format**: Markdown with H2 (## StationID (Name)), H3 (### Section). 

# Required Sections per Station
- ### Traps（陷阱/警告）
- ### Hacks（技巧/捷徑）
- ### Facilities（設施資訊）

# Output Format
Generate ONLY the markdown content for the station. 
Example Output:
## odpt:Station:JR-East.Yamanote.Ebisu (惠比壽站)
### Traps（陷阱/警告）
- [Trap] 🚶 **轉乘距離**: JR與日比谷線轉乘步行約 400m，需 5-8 分鐘。(Advice: 建議預留充足轉乘時間。)
`;

async function generateStationKnowledge(station: { name: string, context: string }): Promise<string> {
    console.log(`Generating knowledge for ${station.name}...`);

    const userPrompt = `
    Target Station: ${station.name}
    Specific Context to Cover: ${station.context}
    
    Please write the expert knowledge markdown for this station following the guidelines.
    `;

    const content = await generateLLMResponse({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: userPrompt,
        taskType: 'reasoning', // Use MiniMax-M2.1
        temperature: 0.1
    });

    if (!content) {
        throw new Error(`Failed to generate content for ${station.name}`);
    }

    return content;
}

async function main() {
    console.log('🚀 Starting L4 Knowledge Optimization (Powered by MiniMax-M2.1)');

    // Check and create directory if needed
    const knowledgeDir = path.dirname(KNOWLEDGE_FILE);
    if (!fs.existsSync(knowledgeDir)) {
        fs.mkdirSync(knowledgeDir, { recursive: true });
    }

    let currentContent = "";
    if (fs.existsSync(KNOWLEDGE_FILE)) {
        currentContent = fs.readFileSync(KNOWLEDGE_FILE, 'utf-8');
    } else {
        fs.writeFileSync(KNOWLEDGE_FILE, "# L4 Knowledge Expansion (MiniMax)\n\n");
    }
    let newContentBuffer = "";

    for (const station of TARGET_STATIONS) {
        // Just for simplicity, we overwrite or append. 
        // If the file exists, we check if station already in there.
        if (fs.existsSync(KNOWLEDGE_FILE)) {
            const existing = fs.readFileSync(KNOWLEDGE_FILE, 'utf-8');
            if (existing.includes(`## ${station.name}`)) {
                console.log(`Skipping ${station.name} (Already exists)`);
                continue;
            }
        }

        try {
            const knowledge = await generateStationKnowledge(station);
            console.log(`✅ Generated ${station.name}`);

            newContentBuffer += `\n---\n\n${knowledge}\n`;

            // Artificial delay to avoid rate limits if any
            await new Promise(r => setTimeout(r, 1000));
        } catch (error) {
            console.error(`Error processing ${station.name}:`, error);
        }
    }

    if (newContentBuffer.length > 0) {
        fs.appendFileSync(KNOWLEDGE_FILE, newContentBuffer);
        console.log(`\n🎉 Successfully appended ${TARGET_STATIONS.length} new stations to knowledge base.`);
    } else {
        console.log('\nNo new content to append.');
    }
}

main().catch(console.error);
