// Mappings from OSM tags to BambiGO Main Categories
export const OSM_TO_MAIN_CATEGORY: Record<string, string> = {
    // Shopping
    'shop': 'shopping',

    // Dining
    'amenity=restaurant': 'dining',
    'amenity=cafe': 'dining',
    'amenity=fast_food': 'dining',
    'amenity=bar': 'dining',
    'amenity=pub': 'dining',
    'amenity=food_court': 'dining',

    // Medical
    'amenity=hospital': 'medical',
    'amenity=clinic': 'medical',
    'amenity=pharmacy': 'medical',
    'amenity=doctors': 'medical',
    'amenity=dentist': 'medical',

    // Education
    'amenity=school': 'education',
    'amenity=university': 'education',
    'amenity=college': 'education',
    'amenity=kindergarten': 'education',
    'amenity=language_school': 'education',

    // Leisure
    'leisure=park': 'leisure',
    'leisure=playground': 'leisure',
    'tourism=museum': 'leisure',
    'tourism=attraction': 'leisure',
    'amenity=theatre': 'leisure',
    'amenity=cinema': 'leisure',
    'amenity=nightclub': 'leisure',

    // Finance
    'amenity=bank': 'finance',
    'amenity=atm': 'finance',
    'amenity=bureau_de_change': 'finance',
};

export function getMainCategory(tags: Record<string, string>): string | null {
    // 1. Check direct key=value matches
    for (const [key, value] of Object.entries(tags)) {
        const combined = `${key}=${value}`;
        if (OSM_TO_MAIN_CATEGORY[combined]) {
            return OSM_TO_MAIN_CATEGORY[combined];
        }
    }

    // 2. Check key triggers (e.g. shop=*)
    if (tags['shop']) return 'shopping';
    if (tags['leisure']) return 'leisure';

    return null;
}
