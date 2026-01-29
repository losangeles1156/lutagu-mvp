import { NextResponse } from 'next/server';
import { feedbackStore } from '@/lib/l4/monitoring/FeedbackStore';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { requestText, score, contextNodeId } = body;

        if (typeof requestText !== 'string' || typeof score !== 'number') {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const feedback = score > 0 ? 'positive' : 'negative';

        // Note: usage of in-memory store implies this works best on long-running servers.
        // For Vercel Serverless, effectively only recent logs in the same instance are found.
        // However, this connects the frontend loop successfully.
        feedbackStore.recordUserFeedback(requestText, feedback, contextNodeId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Feedback API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
