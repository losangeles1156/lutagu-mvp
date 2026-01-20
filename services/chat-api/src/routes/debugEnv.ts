import express from 'express';
import { generateLLMResponse } from '../lib/ai/llmClient';

const router = express.Router();

router.get('/debug-env', async (req, res) => {
    try {
        const envChecks = {
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
            SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Missing',
            ODPT_API_KEY: process.env.ODPT_API_KEY ? 'Set' : 'Missing',
            ZEABUR_API_KEY: process.env.ZEABUR_API_KEY ? `Set (${process.env.ZEABUR_API_KEY.substring(0, 5)}...)` : 'Missing',
            GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'Set' : 'Missing',
            DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? 'Set' : 'Missing',
        };

        // Network Check
        let googleCheck = 'Pending';
        try {
            const gRes = await fetch('https://www.google.com', { method: 'HEAD' });
            googleCheck = gRes.ok ? 'OK' : `Failed: ${gRes.status}`;
        } catch (e: any) {
            googleCheck = `Error: ${e.message}`;
        }

        // LLM Check (Gemini)
        let llmCheck = 'Pending';
        let llmContent = '';
        try {
            const start = Date.now();
            const response = await generateLLMResponse({
                systemPrompt: 'You are a test bot.',
                userPrompt: 'Say "Test OK"',
                taskType: 'simple', // Uses Gemini Flash Lite
                temperature: 0
            });
            const duration = Date.now() - start;
            llmCheck = response ? `OK (${duration}ms)` : 'Failed (Returned null)';
            llmContent = response || '';
        } catch (e: any) {
            llmCheck = `Error: ${e.message}`;
        }

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            env: envChecks,
            network: {
                google: googleCheck,
                llm: llmCheck,
                llmContent
            }
        });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

export default router;
