
export class AnomalyDetector {
    /**
     * 計算字串的香農熵 (Shannon Entropy)
     * 用於檢測隨機亂碼 (高熵) 或過度重複 (低熵)
     */
    private static calculateEntropy(text: string): number {
        if (!text) return 0;
        const frequencies: Record<string, number> = {};
        for (const char of text) {
            frequencies[char] = (frequencies[char] || 0) + 1;
        }
        let entropy = 0;
        const len = text.length;
        for (const char in frequencies) {
            const p = frequencies[char] / len;
            entropy -= p * Math.log2(p);
        }
        return entropy;
    }

    /**
     * Checks if the input text is potentially nonsense or malicious
     */
    public static isAnomaly(text: string): { isAnomaly: boolean; reason?: string } {
        const trimmed = text.trim();

        // 1. Too short
        if (trimmed.length < 1) {
            return { isAnomaly: true, reason: 'Empty input' };
        }

        const hasAlphaNumeric = /[\p{L}\p{N}]/u.test(trimmed);
        const hasEmoji = /\p{Extended_Pictographic}/u.test(trimmed);

        if (trimmed.length >= 4 && !hasAlphaNumeric && !hasEmoji) {
            return { isAnomaly: true, reason: 'No alphanumeric content' };
        }

        // 2. Repetitive characters (e.g., "aaaaaaaaaa")
        if (/(.)\1{9,}/.test(trimmed)) {
            return { isAnomaly: true, reason: 'Repetitive characters' };
        }

        // 3. Entropy-based Random String Detection
        // 對於中長字串，如果熵值過高 (接近隨機) 或過低 (重複性太高)，則視為異常
        if (trimmed.length >= 10) {
            const entropy = this.calculateEntropy(trimmed);

            const cjkMatches = trimmed.match(/[\u4e00-\u9fa5\u3040-\u30ff]/g);
            const cjkCount = cjkMatches ? cjkMatches.length : 0;
            const cjkRatio = cjkCount / trimmed.length;

            const hasKnownStructuredId = /\bodpt\.[A-Za-z0-9_-]+:/.test(trimmed);

            const shouldApplyHighEntropyCheck = !hasKnownStructuredId && cjkRatio < 0.25;
            const highEntropyThreshold = 4.5;

            if (shouldApplyHighEntropyCheck && entropy > highEntropyThreshold && trimmed.length > 25) {
                return { isAnomaly: true, reason: `High entropy (${entropy.toFixed(2)})` };
            }

            if (entropy < 1.0 && trimmed.length > 15) {
                return { isAnomaly: true, reason: `Low entropy (${entropy.toFixed(2)})` };
            }
        }

        // 4. Random string detection (simple heuristic)
        // Note: This is language dependent, but for CJK/English we can do basic checks
        if (trimmed.length > 20 && !/[aeiouy\u4e00-\u9fa5\u3040-\u30ff]/i.test(trimmed)) {
            return { isAnomaly: true, reason: 'Potential random string' };
        }

        return { isAnomaly: false };
    }
}
