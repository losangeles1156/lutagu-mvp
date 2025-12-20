import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Guest user ID for MVP - used when no authentication is present
// This provides a consistent guest user instead of randomly picking from the database
const GUEST_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Ensures the guest user exists in the database
 * Returns the guest user ID
 */
async function ensureGuestUser(): Promise<string> {
    const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', GUEST_USER_ID)
        .single();

    if (existingUser) {
        return GUEST_USER_ID;
    }

    // Guest user doesn't exist, try to create it
    // Note: This requires the user to exist in auth.users first (Supabase constraint)
    // For now, we'll return an error if the guest user doesn't exist
    throw new Error('Guest user not configured. Please set up authentication or create a guest user in the database.');
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            routeIds,
            activeDays = [1, 2, 3, 4, 5],
            startTime = '07:00',
            endTime = '23:30',
            notificationMethod = 'line'
        } = body;

        // Validation
        if (!routeIds || !Array.isArray(routeIds) || routeIds.length === 0) {
            return NextResponse.json({ error: 'Missing routeIds' }, { status: 400 });
        }

        // Get user ID from session or use guest user for MVP
        // TODO: Replace with proper Supabase auth session once authentication is implemented
        // For now, use a consistent guest user instead of randomly picking users
        let userId: string;

        try {
            // In the future, check for authenticated session here:
            // const { data: { session } } = await supabase.auth.getSession()
            // if (session?.user) { userId = session.user.id; }

            // For MVP, use consistent guest user
            userId = await ensureGuestUser();
        } catch (error) {
            console.error('Failed to get user ID:', error);
            return NextResponse.json({
                error: 'User authentication failed. Please ensure guest user is configured in the database.'
            }, { status: 500 });
        }

        const { data, error } = await supabase
            .from('trip_subscriptions')
            .insert({
                user_id: userId,
                route_ids: routeIds,
                active_days: activeDays,
                active_start_time: startTime,
                active_end_time: endTime,
                notification_method: notificationMethod,
                is_active: true
            })
            .select();

        if (error) {
            console.error('Supabase Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            subscription: data ? data[0] : null,
            message: 'Trip Guard Activated'
        });

    } catch (error) {
        console.error('Subscription API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
