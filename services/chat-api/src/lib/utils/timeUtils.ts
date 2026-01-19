
export const JAPAN_HOLIDAYS_2026: Record<string, string> = {
    '2026-01-01': 'New Year (元旦)',
    '2026-01-02': 'New Year Holiday (年始)',
    '2026-01-03': 'New Year Holiday (年始)',
    '2026-01-12': 'Coming of Age Day (成人之日)',
    '2026-02-11': 'Foundation Day (建國紀念之日)',
    '2026-02-23': 'Emperor\'s Birthday (天皇誕生日)',
    '2026-03-20': 'Vernal Equinox (春分)',
    '2026-04-29': 'Showa Day (昭和之日)',
    '2026-05-03': 'Constitution Memorial Day (憲法紀念日)',
    '2026-05-04': 'Greenery Day (綠之日)',
    '2026-05-05': 'Children\'s Day (兒童節)',
    '2026-05-06': 'Substitute Holiday (補休日)',
    '2026-07-20': 'Marine Day (海之日)',
    '2026-08-11': 'Mountain Day (山之日)',
    '2026-08-13': 'Obon (盂蘭盆節)',
    '2026-08-14': 'Obon (盂蘭盆節)',
    '2026-08-15': 'Obon (盂蘭盆節)',
    '2026-08-16': 'Obon (盂蘭盆節)',
    '2026-09-21': 'Respect for the Aged Day (敬老日)',
    '2026-09-22': 'Bridge Holiday (連假)',
    '2026-09-23': 'Autumnal Equinox (秋分)',
    '2026-10-12': 'Sports Day (運動之日)',
    '2026-11-03': 'Culture Day (文化日)',
    '2026-11-23': 'Labor Thanksgiving Day (勤勞感謝日)',
    '2026-12-30': 'New Year Holiday (年末年始)',
    '2026-12-31': 'New Year Holiday (年末年始)',
};

export function getJSTTime() {
    const now = new Date();
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));

    const yyyy = jstDate.getFullYear();
    const mm = String(jstDate.getMonth() + 1).padStart(2, '0');
    const dd = String(jstDate.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;

    const holidayName = JAPAN_HOLIDAYS_2026[dateKey];
    const isHoliday = !!holidayName || (jstDate.getDay() === 0 || jstDate.getDay() === 6);

    return {
        date: jstDate,
        dateKey,
        holidayName,
        isHoliday,
        hour: jstDate.getHours(),
        minute: jstDate.getMinutes(),
        second: jstDate.getSeconds()
    };
}
