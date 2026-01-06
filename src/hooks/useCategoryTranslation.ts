import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

/**
 * A centralized hook to handle category and subcategory translations with fallback logic.
 * This ensures that if a translation is missing, we display a formatted raw value instead of the translation key.
 */
export function useCategoryTranslation() {
    const tL1 = useTranslations('l1');
    const tL3 = useTranslations('l3');
    const tTag = useTranslations('tag');

    /**
     * Translates a main category (e.g., "dining", "shopping", "toilet").
     * Checks 'l1.categories' and 'l3.categories' namespaces.
     */
    const getCategoryLabel = useCallback((category: string) => {
        if (!category) return '';
        const normalized = category.toLowerCase();
        const key = `categories.${normalized}`;

        // 1. Try L1 (General Categories)
        const l1Translation = tL1(key);
        if (l1Translation !== key) return l1Translation;

        // 2. Try L3 (Facility Categories)
        const l3Translation = tL3(key);
        if (l3Translation !== key) return l3Translation;

        // 3. Fallback: Try Tag Subcategories (for granular categories like 'cafe', 'fast_food')
        const tagKey = `sub.${normalized}`;
        const tagTranslation = tTag(tagKey);
        if (tagTranslation !== tagKey) return tagTranslation;

        // 4. Final Fallback: Formatted Raw String
        return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
    }, [tL1, tL3, tTag]);

    /**
     * Translates a subcategory (e.g., "fast_food", "convenience").
     * Checks 'tag.sub' namespace.
     */
    const getSubcategoryLabel = useCallback((subcategory: string) => {
        if (!subcategory) return '';
        const normalized = subcategory.toLowerCase();
        const key = `sub.${normalized}`;

        // 1. Try Tag Subcategories
        const tagTranslation = tTag(key);
        if (tagTranslation !== key) return tagTranslation;

        // 2. Fallback: Formatted Raw String
        return subcategory.charAt(0).toUpperCase() + subcategory.slice(1).replace(/_/g, ' ');
    }, [tTag]);

    return { getCategoryLabel, getSubcategoryLabel };
}
