
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function listModels() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error('No GOOGLE_API_KEY found in .env.local');
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        console.log('Fetching models from:', url.replace(apiKey, 'HIDDEN_KEY'));
        const response = await fetchWithTimeout(url, { method: 'GET' }, 10000);

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        console.log('Available Models:');
        if (data.models) {
            data.models.forEach((m: any) => {
                if (m.name.includes('gemini')) {
                    console.log(`- ${m.name} (Display: ${m.displayName})`);
                }
            });
        } else {
            console.log('No models found in response:', JSON.stringify(data));
        }

    } catch (error) {
        console.error('Failed to list models:', error);
    }
}

listModels();
