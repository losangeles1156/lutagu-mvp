/**
 * Weather Alert Region Policy
 * Strictly locked to Tokyo Core, Kanagawa, and Chiba.
 * Explicitly excludes remote islands.
 */

export const WEATHER_REGION_POLICY = {
    // Core Prefectures (Level 1 Filter)
    targetPrefectures: ['東京', '神奈川', '千葉'],

    // Specific Regions (Level 2 Filter)
    // Matches JMA's regional terminology
    targetRegions: [
        '東京地方',
        '23区',
        '多摩',
        '神奈川県東部',
        // '神奈川県西部', // Tourist areas (Hakone) but can be noisy. Removing for now.
        '千葉県北西部', // Commuter belt (Matsudo, Urayasu)
        // '千葉県北東部', // Narita area - keep? Or remove? Narita is important.
        // Let's keep Narita (NE) if possible, but user complained about "Chiba South".
        // Actually Narita is "North East"? No, Narita is roughly North/Central.
        // JMA Chiba NE includes Narita.
        // JMA Chiba S is Tateyama (far).
        '埼玉県南部' // Add Saitama South (Commuter belt)
    ],

    // Explicit Exclusions (Level 3 Filter)
    // Even if islands are mentioned, they must be excluded unless a target region is also mentioned with a warning.
    excludedRegions: ['伊豆諸島', '小笠原諸島'],

    /**
     * Normalizes JMA text for consistent matching (Full-width to Half-width)
     */
    normalize: (s: string) => s.replace(/[！-～]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0xfee0)),

    /**
     * Checks if the given alert text (title + summary) satisfies the region policy.
     */
    isTargetRegion: (title: string, summary: string): boolean => {
        const normalize = WEATHER_REGION_POLICY.normalize;
        const normTitle = normalize(title);
        const normSummary = normalize(summary);

        // 0. Strict Title Exclusion
        // If the title explicitly mentions an excluded region (e.g., "Warning for Izu Islands")
        // AND does NOT mention any target region, reject it immediately.
        const titleMentionsExcluded = WEATHER_REGION_POLICY.excludedRegions.some(ex => normTitle.includes(ex));
        const titleMentionsTarget = WEATHER_REGION_POLICY.targetRegions.some(tg => normTitle.includes(tg));
        const titleMentionsPrefecture = WEATHER_REGION_POLICY.targetPrefectures.some(pf => normTitle.includes(pf));

        if (titleMentionsExcluded && !titleMentionsTarget && !titleMentionsPrefecture) {
            return false;
        }

        // 1. Emergency Bypass
        // Earthquakes (Shindo) and Tsunamis often don't use the standard "Region dewa Warning" format.
        const isEmergency = normTitle.includes('震度') || normTitle.includes('地震') || normTitle.includes('超音波') || normTitle.includes('津浪');
        if (isEmergency) {
            const combinedText = normTitle + normSummary;
            return WEATHER_REGION_POLICY.targetRegions.some(r => combinedText.includes(r)) ||
                WEATHER_REGION_POLICY.targetPrefectures.some(p => combinedText.includes(p));
        }

        // 2. Sentence-Scoped Analysis with Clear Statement Detection
        // Split summary into sentences to prevent cross-contamination (e.g. "Tokyo is clear. Izu has rain.")
        const sentences = normSummary.split(/[。\n]/).map(s => s.trim()).filter(s => s.length > 0);

        // Add the Title as a "sentence" because sometimes short info is only in title
        sentences.push(normTitle);

        const targetRegionsPattern = WEATHER_REGION_POLICY.targetRegions.join('|');
        // Warning keywords: Warning (警報), Advisory (注意報), Short "Attention" (注意), Special Warning (特別警報), Alert/Vigilance (警戒)
        const warningPattern = /警報|注意報|注意|特別警報|警戒/;

        // Clear/Good weather statements that should NOT trigger alerts
        // These indicate the region is NOT under warning
        const clearStatementPattern = /は晴れています|は崩れ|は回復|解除|ielder|注意報解除|警報解除|解除しました/;

        for (const sentence of sentences) {
            // Skip clear/good weather statements
            // E.g., "東京地方は晴れています" should not trigger an alert
            if (clearStatementPattern.test(sentence)) {
                continue;
            }

            // Does this sentence mention a target region?
            const mentionsTarget = new RegExp(targetRegionsPattern).test(sentence);

            // Does this sentence contain a warning keyword?
            const hasWarning = warningPattern.test(sentence);

            // If both are true in the same sentence, it's a valid alert for us.
            if (mentionsTarget && hasWarning) {
                return true;
            }
        }

        return false;
    },

    /**
     * Regex patterns for severity classification
     * Updated: Added intermediate 'warning' level for granular alerts
     */
    patterns: {
        // 紅色警報（Critical）- 極其嚴重，生命威脅
        critical: /特別警報|大地震|巨大地震|津波警報|大火災警報|土砂災害特別警戒情報|震度[5-9]/,

        // 橙色警報（Warning）- 重大影響，謹慎行動
        warning: /警報|波浪警報|高潮警報|大雨警報|大雪警報|洪水警報|土砂災害警戒情報|暴風警報/,

        // 黃色警報（Advisory）- 注意防範
        advisory: /注意報|強風注意報|大雨注意報|乾燥注意報|雷注意報|濃霧注意報|波浪注意報|高潮注意報|大雪注意報|洪水注意報/,

        // 藍色資訊（Info）- 一般資訊
        info: /気象情報|全般台風情報|天候情報/
    },

    /**
     * Map severity level to UI color code
     */
    severityToColor: {
        critical: 'red',
        warning: 'orange',
        advisory: 'yellow',
        info: 'blue'
    },

    /**
     * Map severity level to urgency level (1-4)
     */
    severityToUrgency: {
        critical: 4,  // 最高優先級
        warning: 3,   // 高優先級
        advisory: 2,  // 中優先級
        info: 1       // 低優先級
    },

    /**
     * Determine severity level from alert title and content
     * Uses sentence-level analysis to avoid false positives from cancellation messages and cross-region contamination.
     */
    getSeverity: (title: string, summary: string): 'info' | 'advisory' | 'warning' | 'critical' => {
        const normalize = WEATHER_REGION_POLICY.normalize;
        const normTitle = normalize(title);
        const normSummary = normalize(summary);

        // Prepare patterns
        const targetRegionsPattern = new RegExp(WEATHER_REGION_POLICY.targetRegions.join('|'));
        const clearStatementPattern = /は晴れています|は崩れ|は回復|解除|ielder|注意報解除|警報解除|解除しました|発表はありません/;

        // Split sentences (Summary + Title)
        const sentences = normSummary.split(/[。\n]/).map(s => s.trim()).filter(s => s.length > 0);
        sentences.push(normTitle);

        let maxSeverity: 'info' | 'advisory' | 'warning' | 'critical' = 'info';
        const severityLevels = { info: 1, advisory: 2, warning: 3, critical: 4 };

        for (const sentence of sentences) {
            // 1. Skip clear statements / cancellations
            if (clearStatementPattern.test(sentence)) continue;

            // 2. Region Scoping:
            // Ensure the sentence applies to our target regions.
            // We ignore sentences mentioning excluded regions (e.g. Izu Islands).
            const mentionsExcluded = WEATHER_REGION_POLICY.excludedRegions.some(ex => sentence.includes(ex));
            if (mentionsExcluded) continue;

            // We also require the sentence to explicitly mention a target region.
            // This prevents "Saitama Warning" from polluting "Tokyo Advisory" in a combined feed.
            // Exception: If the title is generic (e.g. "Weather Warning") and matches no region,
            // we might miss it if we strictly require region match.
            // BUT, `isTargetRegion` filters out alerts that don't have (Target + Warning) in the same sentence.
            // So we are safe to enforce this.
            const mentionsTarget = targetRegionsPattern.test(sentence);
            if (!mentionsTarget) continue;

            // 3. Determine Severity for this specific sentence
            const sanitized = sentence.replace(/警報級の可能性/g, '');

            let currentSeverity: 'info' | 'advisory' | 'warning' | 'critical' = 'info';

            if (WEATHER_REGION_POLICY.patterns.critical.test(sanitized)) currentSeverity = 'critical';
            else if (WEATHER_REGION_POLICY.patterns.warning.test(sanitized)) currentSeverity = 'warning';
            else if (WEATHER_REGION_POLICY.patterns.advisory.test(sanitized)) currentSeverity = 'advisory';
            else if (WEATHER_REGION_POLICY.patterns.info.test(sanitized)) currentSeverity = 'info';

            // Update max severity
            if (severityLevels[currentSeverity] > severityLevels[maxSeverity]) {
                maxSeverity = currentSeverity;
            }
        }

        return maxSeverity;
    },

    /**
     * Get user-friendly severity label
     */
    getSeverityLabel: (severity: 'info' | 'advisory' | 'warning' | 'critical'): { ja: string; zh: string; en: string } => {
        const labels = {
            critical: { ja: '特別警報', zh: '特別警報', en: 'Special Warning' },
            warning: { ja: '警報', zh: '警報', en: 'Warning' },
            advisory: { ja: '注意報', zh: '注意報', en: 'Advisory' },
            info: { ja: '気象情報', zh: '天氣資訊', en: 'Weather Info' }
        };
        return labels[severity] || labels.info;
    },

    /**
     * Extract alert type from title (e.g., 強風, 大雨, 波浪)
     */
    extractAlertType: (title: string): string => {
        const normalize = WEATHER_REGION_POLICY.normalize;
        const normTitle = normalize(title);

        const patterns = [
            { regex: /強風/, label: '強風' },
            { regex: /大雨/, label: '大雨' },
            { regex: /波浪/, label: '波浪' },
            { regex: /高潮/, label: '高潮' },
            { regex: /大雪/, label: '大雪' },
            { regex: /洪水/, label: '洪水' },
            { regex: /土砂/, label: '土砂災害' },
            { regex: /乾燥/, label: '乾燥' },
            { regex: /雷/, label: '雷' },
            { regex: /濃霧/, label: '濃霧' },
            { regex: /特別警報/, label: '特別警報' },
            { regex: /地震/, label: '地震' },
            { regex: /震度/, label: '地震' },
            { regex: /津波/, label: '海嘯' },
        ];
        for (const p of patterns) {
            if (p.regex.test(normTitle)) return p.label;
        }
        return '天氣';
    },

    /**
     * Extract affected region from title and summary
     */
    extractRegion: (title: string, summary: string): string => {
        const normalize = WEATHER_REGION_POLICY.normalize;
        const text = normalize(title + summary);

        // Prioritize specific regions
        const regionPatterns = [
            { regex: /23区/, label: '東京23区' },
            { regex: /多摩/, label: '多摩' },
            { regex: /伊豆諸島/, label: '伊豆諸島' }, // Should be excluded usually, but if present
            { regex: /小笠原/, label: '小笠原' },
            { regex: /東京地方/, label: '東京' },
            { regex: /神奈川県東部/, label: '神奈川東部' },
            { regex: /神奈川県西部/, label: '神奈川西部' },
            { regex: /神奈川県/, label: '神奈川' },
            { regex: /千葉県北西部/, label: '千葉北西部' },
            { regex: /千葉県北東部/, label: '千葉北東部' },
            { regex: /千葉県南部/, label: '千葉南部' },
            { regex: /千葉県/, label: '千葉' },
            { regex: /埼玉県/, label: '埼玉' },
            { regex: /群馬県/, label: '群馬' },
            { regex: /茨城県/, label: '茨城' },
            { regex: /栃木県/, label: '栃木' },
            { regex: /山梨県/, label: '山梨' },
        ];
        for (const p of regionPatterns) {
            if (p.regex.test(text)) return p.label;
        }
        return '東京'; // Default to Tokyo if vaguely matched or fallback
    }
};
