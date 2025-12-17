// Basic counts interface
export interface CategoryCounts {
    shopping: number;
    dining: number;
    medical: number;
    education: number;
    leisure: number;
    finance: number;
}

// Logic to calculate dominant category and total
export function calculateProfileStats(counts: CategoryCounts) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    // Find dominant
    let dominant = 'none';
    let max = 0;

    for (const [key, value] of Object.entries(counts)) {
        if (value > max) {
            max = value;
            dominant = key;
        }
    }

    return { total, dominant };
}

// Logic to generate simple Vibe Tags based on counts
export function generateVibeTags(counts: CategoryCounts): string[] {
    const tags: string[] = [];
    const { total } = calculateProfileStats(counts);

    if (total === 0) return ['寧靜區域'];

    // Shopping dominant
    if (counts.shopping >= 15 && counts.shopping / total > 0.3) {
        tags.push('購物天堂');
    }

    // Dining dominant
    if (counts.dining >= 10 && counts.dining / total > 0.25) {
        tags.push('美食激戰區');
    }

    // Leisure
    if (counts.leisure >= 5) {
        tags.push('休閒去處');
    }

    // Convenient
    if (counts.shopping > 0 && counts.dining > 0 && counts.medical > 0) {
        tags.push('生活便利');
    }

    // Business
    if (counts.finance >= 5 && counts.shopping < 10) {
        tags.push('商業區');
    }

    return tags.slice(0, 3);
}
