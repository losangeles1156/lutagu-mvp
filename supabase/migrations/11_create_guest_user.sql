-- Create a guest user for MVP usage before authentication is fully implemented
-- This provides a consistent user ID for trip subscriptions and other user-dependent features

-- First, create the auth user (required by foreign key constraint)
-- Note: In production Supabase, you may need to use the dashboard or auth API to create this
-- This is a simplified version for local development
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    recovery_token
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'guest@bambigo.local',
    '',  -- No password for guest user
    now(),
    now(),
    now(),
    '{"provider": "local", "providers": ["local"]}',
    '{"display_name": "Guest User"}',
    false,
    '',
    ''
)
ON CONFLICT (id) DO NOTHING;

-- Then create the corresponding user in the public users table
INSERT INTO users (
    id,
    line_user_id,
    display_name,
    preferences,
    created_at,
    last_seen_at
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'Guest User',
    '{"accessibility": false, "bike_user": false}',
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;
