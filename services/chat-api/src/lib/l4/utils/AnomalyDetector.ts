
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

        // 2. Repetitive characters (e.g., "aaaaaaaaaa")
        if (/(.)\1{9,}/.test(trimmed)) {
            return { isAnomaly: true, reason: 'Repetitive characters' };
        }

        // 3. Entropy-based Random String Detection
        // 對於中長字串，如果熵值過高 (接近隨機) 或過低 (重複性太高)，則視為異常
        if (trimmed.length >= 10) {
            const entropy = this.calculateEntropy(trimmed);
            // 檢測是否包含 CJK 字符
            const hasCJK = /[\u4e00-\u9fa5\u3040-\u30ff]/.test(trimmed);
            // 如果包含 CJK，熵值門檻放寬 (因為漢字與假名的組合本身熵值較高)
            const threshold = hasCJK ? 5.2 : 4.5;

            if (entropy > threshold && trimmed.length > 25) {
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
