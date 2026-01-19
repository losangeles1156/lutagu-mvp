
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function listModels() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error('No GOOGLE_API_KEY found');
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    console.log('Fetching available models from Google AI...');
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            console.error(await response.text());
            return;
        }

        const data = await response.json();
        if (data.models) {
            console.log('\n✅ Available Models:');
            data.models.forEach((m: any) => {
                if (m.name.includes('gemini')) {
                    console.log(`- ${m.name.replace('models/', '')} (${m.supportedGenerationMethods?.join(', ')})`);
                }
            });
        } else {
            console.log('No models found in response.');
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

listModels();
