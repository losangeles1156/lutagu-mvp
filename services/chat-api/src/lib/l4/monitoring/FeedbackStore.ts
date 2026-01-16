
export interface FeedbackItem {
    text: string;
    source: 'template' | 'algorithm' | 'llm' | 'poi_tagged' | 'knowledge';
    timestamp: number;
    userFeedback?: 'positive' | 'negative';
    missedIntent?: string;
}

class FeedbackStore {
    private logs: FeedbackItem[] = [];
    private readonly MAX_LOGS = 1000;

    public logRequest(item: FeedbackItem) {
        this.logs.push(item);
        if (this.logs.length > this.MAX_LOGS) {
            this.logs.shift();
        }
        
        // In a real production app, we would send this to a database/Sentry/LogRocket
        if (item.source === 'llm') {
            console.log(`[FeedbackStore] Missed local match for: "${item.text}". Consider adding a template.`);
        }
    }

    public getLogs() {
        return this.logs;
    }

    public recordUserFeedback(text: string, feedback: 'positive' | 'negative') {
        const item = this.logs.findLast(l => l.text === text);
        if (item) {
            item.userFeedback = feedback;
            console.log(`[FeedbackStore] User feedback for "${text}": ${feedback}`);
        }
    }
}

export const feedbackStore = new FeedbackStore();
