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

        // Handle cases where the category might already be a translation key path
        // e.g., "l1.categories.park" -> "park"
        let normalized = category.toLowerCase();
        if (normalized.includes('.')) {
            const parts = normalized.split('.');
            normalized = parts[parts.length - 1];
        }

        const key = `categories.${normalized}`;

        // 1. Try L1 (General Categories)
        const l1Translation = tL1(key);
        // next-intl returns "namespace.key" if missing, so we check for that too
        if (l1Translation !== key && l1Translation !== `l1.${key}`) return l1Translation;

        // 2. Try L3 (Facility Categories)
        const l3Translation = tL3(key);
        if (l3Translation !== key && l3Translation !== `l3.${key}`) return l3Translation;

        // 3. Fallback: Try Tag Subcategories
        const tagKey = `sub.${normalized}`;
        const tagTranslation = tTag(tagKey);
        if (tagTranslation !== tagKey && tagTranslation !== `tag.${tagKey}`) return tagTranslation;

        // 4. Final Fallback: Formatted Raw String
        return normalized.charAt(0).toUpperCase() + normalized.slice(1).replace(/_/g, ' ');
    }, [tL1, tL3, tTag]);

    /**
     * Translates a subcategory (e.g., "fast_food", "convenience").
     * Checks 'tag.sub' namespace.
     */
    const getSubcategoryLabel = useCallback((subcategory: string) => {
        if (!subcategory) return '';

        let normalized = subcategory.toLowerCase();
        if (normalized.includes('.')) {
            const parts = normalized.split('.');
            normalized = parts[parts.length - 1];
        }

        const key = `sub.${normalized}`;

        // 1. Try Tag Subcategories
        const tagTranslation = tTag(key);
        if (tagTranslation !== key && tagTranslation !== `tag.${key}`) return tagTranslation;

        // 2. Fallback: Formatted Raw String
        return normalized.charAt(0).toUpperCase() + normalized.slice(1).replace(/_/g, ' ');
    }, [tTag]);

    return { getCategoryLabel, getSubcategoryLabel };
}
