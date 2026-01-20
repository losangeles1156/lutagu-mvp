import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import debugEnvRouter from './routes/debugEnv';
const serviceRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(serviceRoot, '..', '..');
const loadedEnvPaths: string[] = [];
const envCandidates = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(serviceRoot, '.env.local'),
    path.resolve(serviceRoot, '.env'),
    path.resolve(repoRoot, '.env.local'),
    path.resolve(repoRoot, '.env')
];

for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: false });
        loadedEnvPaths.push(envPath);
    }
}

if (loadedEnvPaths.length === 0) {
    console.warn('[Chat API] No env file found in expected locations.');
} else {
    console.log(`[Chat API] Loaded env files: ${loadedEnvPaths.join(', ')}`);
}

const aiKeyNames = [
    'ZEABUR_API_KEY',
    'GEMINI_API_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'DEEPSEEK_API_KEY',
    'MINIMAX_API_KEY'
];
const missingAiKeys = aiKeyNames.filter((key) => !process.env[key]);
if (missingAiKeys.length === aiKeyNames.length) {
    console.error(`[Chat API] Missing AI keys: ${aiKeyNames.join(', ')}`);
} else if (missingAiKeys.length > 0) {
    console.warn(`[Chat API] Partial AI keys missing: ${missingAiKeys.join(', ')}`);
}

const { chatRouter } = require('./routes/chat');
const { agentChatRouter } = require('./routes/agentChat');
const { aiDiagnosticsRouter } = require('./routes/aiDiagnostics');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://lutagu.com', 'https://www.lutagu.com', 'https://lutagu.vercel.app', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-vercel-protection-bypass']
}));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'chat-api', timestamp: new Date().toISOString() });
});

// Routes
app.use('/chat', chatRouter);
app.use('/agent/chat', agentChatRouter);
app.use('/agent', debugEnvRouter); // Added debugEnvRouter
app.use('/ai/diagnostics', aiDiagnosticsRouter);

// Start server
app.listen(PORT, () => {
    console.log(`[Chat API] Running on port ${PORT}`);
});

export default app;
