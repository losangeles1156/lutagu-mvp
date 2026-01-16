import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { chatRouter } from './routes/chat';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://bambigo.app', 'http://localhost:3000'],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'chat-api', timestamp: new Date().toISOString() });
});

// Routes
app.use('/chat', chatRouter);

// Start server
app.listen(PORT, () => {
    console.log(`[Chat API] Running on port ${PORT}`);
});

export default app;
