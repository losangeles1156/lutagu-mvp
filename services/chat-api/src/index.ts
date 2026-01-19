import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { chatRouter } from './routes/chat';
import { agentChatRouter } from './routes/agentChat';
import { aiDiagnosticsRouter } from './routes/aiDiagnostics';

import path from 'path';

// Load env vars: Local .env (if any) -> Root .env.local
const envPath = path.resolve(process.cwd(), '../../.env.local');
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://lutagu.app', 'http://localhost:3000'],
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
app.use('/ai/diagnostics', aiDiagnosticsRouter);

// Start server
app.listen(PORT, () => {
    console.log(`[Chat API] Running on port ${PORT}`);
});

export default app;
