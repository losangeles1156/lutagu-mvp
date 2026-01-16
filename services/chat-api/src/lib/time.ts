export const JAPAN_TIMEZONE = 'Asia/Tokyo';

/**
 * Returns the current date object (UTC timestamp)
 * Ideally use this instead of new Date() to allow for future mocking or adjustment
 */
export function getNow(): Date {
    return new Date();
}

/**
 * Formats a given date to Japan Time string
 */
export function formatJapanTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
    return date.toLocaleString('ja-JP', {
        timeZone: JAPAN_TIMEZONE,
        ...options
    });
}

/**
 * Returns the current hour (0-23) in Japan
 */
export function getJapanHour(date: Date = new Date()): number {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: JAPAN_TIMEZONE,
        hour: 'numeric',
        hour12: false
    });
    return parseInt(formatter.format(date), 10);
}

/**
 * Returns a simplified object with Japan time components
 */
export function getJapanDateComponents(date: Date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: JAPAN_TIMEZONE,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    });

    // This is a bit heavy but reliable without libraries
    const parts = formatter.formatToParts(date);
    const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value || '0';

    return {
        year: parseInt(getPart('year'), 10),
        month: parseInt(getPart('month'), 10),
        day: parseInt(getPart('day'), 10),
        hour: parseInt(getPart('hour'), 10),
        minute: parseInt(getPart('minute'), 10),
        second: parseInt(getPart('second'), 10)
    };
}
