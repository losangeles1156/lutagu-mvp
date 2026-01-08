
/**
 * Security Service for AI Agent
 * Handles input validation, output sanitization, and data filtering
 */

// Suspicious patterns that might indicate prompt injection
const INJECTION_PATTERNS = [
    /ignore.*(instruction|command|system|prompt)/i,      // "Ignore all previous instructions"
    /disregard.*(instruction|command|system|prompt)/i,   // "Disregard system prompt"
    /system.*prompt/i,                                    // "System prompt"
    /you.*are.*now/i,                                     // "You are now..."
    /override.*system/i,                                  // "Override system"
    /reveal.*(key|secret|password|credential)/i,         // "Reveal your secret key"
    /\[system\]/i,                                        // "[SYSTEM]" prefix
    /\[instruction\]/i,                                   // "[INSTRUCTION]" prefix
    /previous.*instruction/i,                             // "previous instructions" variant
    /forget.*(instruction|rule|command)/i,               // "Forget all rules"
    /do.*not.*follow.*(instruction|rule)/i,              // "Do not follow"
];

// Sensitive keys to scrub from logs/outputs
const SENSITIVE_KEYS = [
    'api_key', 'apikey', 'auth', 'token', 'secret', 'password', 'credential',
    process.env.MISTRAL_API_KEY,
    process.env.GEMINI_API_KEY
].filter(Boolean) as string[];

export class SecurityService {

    /**
     * Validate user input for potential prompt injection
     * Returns true if input is safe, false if suspicious
     */
    static validateInput(input: string): { isSafe: boolean; reason?: string } {
        if (!input || input.length > 2000) {
            return { isSafe: false, reason: 'Input too long' };
        }

        // Check for injection patterns
        for (const pattern of INJECTION_PATTERNS) {
            if (pattern.test(input)) {
                console.warn(`[Security] Potential injection blocked: ${pattern}`);
                return { isSafe: false, reason: 'Suspicious input detected' };
            }
        }

        return { isSafe: true };
    }

    /**
     * Sanitize tool outputs or logs to remove sensitive data
     */
    static sanitizeContent(content: string): string {
        if (!content) return '';

        let sanitized = content;

        // Scrub known sensitive keys
        SENSITIVE_KEYS.forEach(key => {
            if (key.length > 5) { // Only scrub if key length is significant to avoid false positives
                sanitized = sanitized.split(key).join('[REDACTED]');
            }
        });

        // Scrub generic Bearer tokens
        sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9\-\._]+/g, 'Bearer [REDACTED]');

        return sanitized;
    }

    /**
     * Limit message history to prevent "Memory Poisoning" and token overflow
     * Keeps system prompt (first msg) + last N messages
     */
    static pruneHistory(messages: any[], maxTurns: number = 10): any[] {
        if (messages.length <= maxTurns + 1) return messages;

        const systemMessage = messages.find(m => m.role === 'system');
        const recentMessages = messages.slice(-maxTurns);

        return systemMessage
            ? [systemMessage, ...recentMessages]
            : recentMessages;
    }
}
