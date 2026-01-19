import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserPreferences, PreferencesUpdateRequest, PreferencesResponse } from '@/lib/types/userLearning';
import { calculateWeightedScore, generateDataHash } from '@/lib/types/userLearning';

// Initialize Supabase client - Use server-side environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// Get Supabase client instance
const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Preferences API] Supabase credentials not configured');
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
};

// GET /api/user/preferences - Get user preferences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'user_id is required'
      }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // If Supabase is not configured, return default preferences
    if (!supabase) {
      const defaultPrefs: UserPreferences = {
        id: '',
        user_id: userId,
        default_lat: 35.7138,
        default_lon: 139.7773,
        default_zoom: 15,
        map_style: 'light',
        show_hubs_only: false,
        show_labels: true,
        label_language: 'zh-TW',
        dark_mode: false,
        preferred_facility_types: [],
        excluded_facility_types: [],
        max_walking_distance: 500,
        sort_by: 'distance',
        sort_order: 'asc',
        user_profile: 'general',
        version: 1,
        updated_at: Date.now(),
        data_hash: '',
        last_synced_at: null,
        device_id: '',
        source: 'web',
        created_at: Date.now()
      };

      return NextResponse.json({
        success: true,
        preferences: defaultPrefs,
        version: 1,
        mode: 'demo'
      });
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Return default preferences if not found
      const defaultPrefs: UserPreferences = {
        id: '',
        user_id: userId,
        default_lat: 35.7138,
        default_lon: 139.7773,
        default_zoom: 15,
        map_style: 'light',
        show_hubs_only: false,
        show_labels: true,
        label_language: 'zh-TW',
        dark_mode: false,
        preferred_facility_types: [],
        excluded_facility_types: [],
        max_walking_distance: 500,
        sort_by: 'distance',
        sort_order: 'asc',
        user_profile: 'general',
        version: 1,
        updated_at: Date.now(),
        data_hash: '',
        last_synced_at: null,
        device_id: '',
        source: 'web',
        created_at: Date.now()
      };

      return NextResponse.json({
        success: true,
        preferences: defaultPrefs,
        version: 1
      });
    }

    // Transform database response to API format
    const preferences: UserPreferences = {
      ...data,
      updated_at: new Date(data.updated_at).getTime(),
      last_synced_at: data.last_synced_at ? new Date(data.last_synced_at).getTime() : null,
      created_at: new Date(data.created_at).getTime()
    };

    const response = NextResponse.json({
      success: true,
      preferences,
      version: data.version
    });

    // Add version control headers
    response.headers.set('X-Data-Version', String(data.version));
    response.headers.set('X-Last-Modified', new Date(data.updated_at).toISOString());

    return response;
  } catch (error) {
    console.error('[Preferences API] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch preferences'
    }, { status: 500 });
  }
}

// POST /api/user/preferences - Update user preferences
export async function POST(request: NextRequest) {
  try {
    const body: PreferencesUpdateRequest = await request.json();
    const { preferences: updates, source = 'web', device_id } = body;

    if (!updates?.user_id) {
      return NextResponse.json({
        success: false,
        error: 'user_id is required'
      }, { status: 400 });
    }

    const userId = updates.user_id;
    const supabase = getSupabaseClient();

    // If Supabase is not configured, return demo response
    if (!supabase) {
      const demoPrefs: UserPreferences = {
        id: 'demo-' + userId,
        user_id: userId,
        default_lat: updates.default_lat ?? 35.7138,
        default_lon: updates.default_lon ?? 139.7773,
        default_zoom: updates.default_zoom ?? 15,
        map_style: updates.map_style ?? 'light',
        show_hubs_only: updates.show_hubs_only ?? false,
        show_labels: updates.show_labels ?? true,
        label_language: updates.label_language ?? 'zh-TW',
        dark_mode: updates.dark_mode ?? false,
        preferred_facility_types: updates.preferred_facility_types ?? [],
        excluded_facility_types: updates.excluded_facility_types ?? [],
        max_walking_distance: updates.max_walking_distance ?? 500,
        sort_by: updates.sort_by ?? 'distance',
        sort_order: updates.sort_order ?? 'asc',
        user_profile: updates.user_profile ?? 'general',
        version: 1,
        updated_at: Date.now(),
        data_hash: generateDataHash(updates),
        last_synced_at: Date.now(),
        device_id: device_id || '',
        source: source,
        created_at: Date.now()
      };

      return NextResponse.json({
        success: true,
        preferences: demoPrefs,
        version: 1,
        mode: 'demo'
      });
    }

    // Check if preferences exist
    const { data: existing, error: fetchError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const now = new Date().toISOString();
    const newVersion = (existing?.version || 0) + 1;

    // Generate data hash
    const dataToHash = {
      preferred_facility_types: updates.preferred_facility_types || existing?.preferred_facility_types,
      excluded_facility_types: updates.excluded_facility_types || existing?.excluded_facility_types,
      user_profile: updates.user_profile || existing?.user_profile
    };
    const newDataHash = generateDataHash(dataToHash);

    // Upsert preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        default_lat: updates.default_lat ?? existing?.default_lat ?? 35.7138,
        default_lon: updates.default_lon ?? existing?.default_lon ?? 139.7773,
        default_zoom: updates.default_zoom ?? existing?.default_zoom ?? 15,
        map_style: updates.map_style ?? existing?.map_style ?? 'light',
        show_hubs_only: updates.show_hubs_only ?? existing?.show_hubs_only ?? false,
        show_labels: updates.show_labels ?? existing?.show_labels ?? true,
        label_language: updates.label_language ?? existing?.label_language ?? 'zh-TW',
        dark_mode: updates.dark_mode ?? existing?.dark_mode ?? false,
        preferred_facility_types: updates.preferred_facility_types ?? existing?.preferred_facility_types ?? [],
        excluded_facility_types: updates.excluded_facility_types ?? existing?.excluded_facility_types ?? [],
        max_walking_distance: updates.max_walking_distance ?? existing?.max_walking_distance ?? 500,
        sort_by: updates.sort_by ?? existing?.sort_by ?? 'distance',
        sort_order: updates.sort_order ?? existing?.sort_order ?? 'asc',
        user_profile: updates.user_profile ?? existing?.user_profile ?? 'general',
        version: newVersion,
        data_hash: newDataHash,
        last_synced_at: now,
        device_id: device_id || existing?.device_id || null,
        source: source,
        updated_at: now
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })
      .select('*')
      .single();

    if (error) {
      console.error('[Preferences API] Update error:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Create snapshot for version history
    if (existing) {
      await supabase.from('user_preference_snapshots').insert({
        user_id: userId,
        preference_id: data.id,
        snapshot_data: data,
        snapshot_hash: newDataHash,
        snapshot_reason: 'manual',
        is_active: true,
        version: 1
      });
    }

    console.log(`[Preferences API] Updated preferences for user ${userId}, version: ${newVersion}`);

    const response = NextResponse.json({
      success: true,
      preferences: data,
      version: newVersion
    });

    response.headers.set('X-Data-Version', String(newVersion));
    response.headers.set('X-Last-Modified', now);

    return response;
  } catch (error) {
    console.error('[Preferences API] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update preferences'
    }, { status: 500 });
  }
}

// DELETE /api/user/preferences - Reset user preferences
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'user_id is required'
      }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // If Supabase is not configured, return demo response
    if (!supabase) {
      return NextResponse.json({
        success: true,
        message: 'Preferences reset successfully (demo mode)',
        mode: 'demo'
      });
    }

    // Delete preferences
    const { error } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences reset successfully'
    });
  } catch (error) {
    console.error('[Preferences API] Delete error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to reset preferences'
    }, { status: 500 });
  }
}
