// import { unstable_cache } from 'next/cache'; // Removed for backend service

/**
 * Internal logic to scrape Yahoo Japan Transit.
 * Separated for reuse in both cached and non-cached contexts.
 */
const fetchYahooStatusInternal = async () => {
    console.log('[YahooService] Fetching train status from Yahoo Japan...');
    try {
        const response = await fetch('https://transit.yahoo.co.jp/diainfo/area/4', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'ja-JP,ja;q=0.9',
            }
        });

        if (!response.ok) {
            console.error(`[YahooService] Failed to fetch: ${response.status} ${response.statusText}`);
            return [];
        }

        const html = await response.text();
        const troubleLines: { name: string; status: string }[] = [];

        // Yahoo structure: <dt><a ...>LineName</a></dt><dd><span class="icnTrouble">...</span></dd>
        // Regex to find lines in the "trouble" list.
        const regex = /<a[^>]*>([^<]+)<\/a>[^<]*<span class="icnTrouble">/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            if (match[1]) {
                troubleLines.push({
                    name: match[1].trim(),
                    status: 'Trouble (Delay/Suspension)'
                });
            }
        }

        return troubleLines;

    } catch (error) {
        console.error('[YahooService] Error scraping Yahoo:', error);
        return [];
    }
};

// Define the cached version
const getCachedYahooStatus = async () => {
    return await fetchYahooStatusInternal();
};

/**
 * Scrapes Yahoo Japan Transit for train status information (Kanto Area).
 * Returns a list of lines with reported trouble (delays, suspensions).
 *
 * Uses internal fetch directly (Next.js cache removed for backend service).
 */
export const fetchYahooStatus = async () => {
    try {
        return await getCachedYahooStatus();
    } catch (error: any) {
        // Fallback
        console.warn('[YahooService] Error fetching status:', error);
        return [];
    }
};

// Mapping from Yahoo Line Names (Japanese) to ODPT Railway IDs
export const YAHOO_TO_ODPT_MAP: Record<string, string> = {
    // JR East
    'ＪＲ山手線': 'odpt.Railway:JR-East.Yamanote',
    'ＪＲ京浜東北根岸線': 'odpt.Railway:JR-East.KeihinTohoku',
    'ＪＲ京浜東北線': 'odpt.Railway:JR-East.KeihinTohoku',
    'ＪＲ中央線快速電車': 'odpt.Railway:JR-East.ChuoKaisoku',
    'ＪＲ中央・総武各駅停車': 'odpt.Railway:JR-East.ChuoSobu',
    'ＪＲ総武線快速電車': 'odpt.Railway:JR-East.SobuKaisoku',
    'ＪＲ埼京川越線': 'odpt.Railway:JR-East.Saikyo',
    'ＪＲ埼京線': 'odpt.Railway:JR-East.Saikyo',
    'ＪＲ湘南新宿ライン': 'odpt.Railway:JR-East.ShonanShinjuku',

    // Tokyo Metro
    '東京メトロ銀座線': 'odpt.Railway:TokyoMetro.Ginza',
    '東京メトロ丸ノ內線': 'odpt.Railway:TokyoMetro.Marunouchi',
    '東京メトロ日比谷線': 'odpt.Railway:TokyoMetro.Hibiya',
    '東京メトロ東西線': 'odpt.Railway:TokyoMetro.Tozai',
    '東京メトロ千代田線': 'odpt.Railway:TokyoMetro.Chiyoda',
    '東京メトロ有楽町線': 'odpt.Railway:TokyoMetro.Yurakucho',
    '東京メトロ半蔵門線': 'odpt.Railway:TokyoMetro.Hanzomon',
    '東京メトロ南北線': 'odpt.Railway:TokyoMetro.Namboku',
    '東京メトロ副都心線': 'odpt.Railway:TokyoMetro.Fukutoshin',

    // Toei Subway
    '都営浅草線': 'odpt.Railway:Toei.Asakusa',
    '都営三田線': 'odpt.Railway:Toei.Mita',
    '都営新宿線': 'odpt.Railway:Toei.Shinjuku',
    '都営大江戸線': 'odpt.Railway:Toei.Oedo',

    // Others
    'ゆりかもめ': 'odpt.Railway:Yurikamome.Yurikamome',
    'りんかい線': 'odpt.Railway:TWR.Rinkai'
};
