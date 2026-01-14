import { PartnerClickPayload } from '@/lib/types/analytics';

export async function trackPartnerClick(
    nudgeLogId: string,
    partnerId: string,
    referralUrl: string
) {
    if (typeof window === 'undefined') return;

    const payload: PartnerClickPayload = {
        nudge_log_id: nudgeLogId,
        partner_id: partnerId,
        referral_url: referralUrl
    };

    if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/partner/track-click', blob);
    } else {
        try {
            await fetch('/api/partner/track-click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            });
        } catch (e) {
            console.error('[Partner Track Error]', e);
        }
    }
}
