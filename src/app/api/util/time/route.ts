import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const now = new Date();

    // Format for humans (Japan Standard Time)
    const jstString = now.toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        dateStyle: "full",
        timeStyle: "medium",
        hour12: false
    });

    // Structured data for Agent reasoning
    const isoJST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const hour = isoJST.getHours();

    let period = 'day';
    if (hour >= 5 && hour < 10) period = 'morning_rush';
    else if (hour >= 17 && hour < 20) period = 'evening_rush';
    else if (hour >= 23 || hour < 5) period = 'late_night';

    return NextResponse.json({
        jst_time: jstString,
        iso_timestamp: now.toISOString(),
        hour_jst: hour,
        period: period,
        day_of_week: isoJST.toLocaleDateString("en-US", { weekday: 'long' })
    });
}
