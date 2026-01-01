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
        '神奈川県西部',
        '千葉県北西部',
        '千葉県北東部',
        '千葉県南部'
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
        const combinedText = (normTitle + normSummary).replace(/\s/g, '');

        // 1. Prefecture Filter (Fast)
        const hasPrefecture = WEATHER_REGION_POLICY.targetPrefectures.some(p => normTitle.includes(p) || normSummary.includes(p));
        if (!hasPrefecture) return false;

        // 2. Island Exclusion
        const mentionsIslands = WEATHER_REGION_POLICY.excludedRegions.some(island => combinedText.includes(island));
        const mentionsTargetRegion = WEATHER_REGION_POLICY.targetRegions.some(region => combinedText.includes(region));

        // If it only mentions islands and NOT any target regions, exclude it.
        if (mentionsIslands && !mentionsTargetRegion) return false;

        // 3. Strict Target Region Match
        if (!mentionsTargetRegion) return false;

        // 4. Warning Confirmation
        // Check if any of our target regions are followed by "では" and then a warning type.
        // This handles cases where JMA lists multiple regions but only some have warnings.
        const regionsPattern = WEATHER_REGION_POLICY.targetRegions.join('|');
        const hasWarning = new RegExp(`(${regionsPattern}).*?では.*?(警報|注意|特別警報)`).test(combinedText);

        // Special case: Earthquakes and Tsunami often don't use "では"
        const isEmergencyEvent = normTitle.includes('震度') || normTitle.includes('地震') || normTitle.includes('津波');

        return hasWarning || isEmergencyEvent;
    }
};
