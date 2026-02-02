import { RequestContext } from '../l4/HybridEngine';

export interface CommercialAction {
    id: string;
    provider: 'KLOOK' | 'KKDAY' | 'AGODA' | 'ECBO' | 'LUUP';
    title: string;
    description: string;
    url: string;
    imageUrl?: string;
    priority: number; // 0-1, higher is better
    context: 'transport' | 'luggage' | 'accommodation' | 'activity';
}

const PARTNER_LINKS: Record<string, CommercialAction> = {
    // Transport - Airport
    'SKYLINER': {
        id: 'SKYLINER_TICKET',
        provider: 'KLOOK',
        title: 'Skyliner Discount Ticket',
        description: 'Fastest train to Ueno/Nippori (36 mins). E-ticket, no queue.',
        url: 'https://www.klook.com/activity/1409-skyliner-tokyo/?aid=LUTAGU_TRACKING_ID', // Placeholder ID
        priority: 0.95,
        context: 'transport'
    },
    'NEX': {
        id: 'NEX_TICKET',
        provider: 'KLOOK',
        title: 'Narita Express (N\'EX)',
        description: 'Direct to Shinjuku/Shibuya/Tokyo. Comfortable seating.',
        url: 'https://www.klook.com/activity/...',
        priority: 0.9,
        context: 'transport'
    },
    // Luggage
    'ECBO_CLOAK': {
        id: 'ECBO_CLOAK',
        provider: 'ECBO',
        title: 'Book Luggage Storage',
        description: 'Lockers full? Store bags at nearby shops with Ecbo Cloak.',
        url: 'https://cloak.ecbo.io/en/?ref=lutagu',
        priority: 0.85,
        context: 'luggage'
    }
};

export class AffiliateContextManager {

    /**
     * Match context to commercial actions.
     * Non-intrusive: Only returns high-confidence matches.
     */
    static matchContext(context: RequestContext, text: string): CommercialAction[] {
        const matches: CommercialAction[] = [];
        const lowerText = text.toLowerCase();

        // 1. Airport Context (High Value)
        const isAirportIntent = /narita|haneda|airport|skyliner|nex|成田|羽田|機場|空港/i.test(lowerText);
        const isUenoContext = context.currentStation?.includes('Ueno') || /ueno|上野/i.test(lowerText);

        if (isAirportIntent) {
            // Skyliner is best for Ueno/Nippori context
            if (isUenoContext) {
                matches.push(PARTNER_LINKS.SKYLINER);
            } else {
                // Generic Airport
                matches.push(PARTNER_LINKS.SKYLINER);
                matches.push(PARTNER_LINKS.NEX);
            }
        }

        // 2. Luggage Context
        const isLuggageIntent = /luggage|locker|storage|bag|suitcase|行李|置物櫃|寄放/i.test(lowerText);
        if (isLuggageIntent) {
            matches.push(PARTNER_LINKS.ECBO_CLOAK);
        }

        return matches.sort((a, b) => b.priority - a.priority).slice(0, 3); // Max 3 cards
    }
}
