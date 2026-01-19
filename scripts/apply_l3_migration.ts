import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('Missing Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    const sql = `
    -- Create L3 Facilities table
    CREATE TABLE IF NOT EXISTS public.l3_facilities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id TEXT NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        name_i18n JSONB DEFAULT '{}'::jsonb,
        location_coords GEOGRAPHY(POINT),
        attributes JSONB DEFAULT '{}'::jsonb,
        source_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_l3_station_id ON public.l3_facilities(station_id);

    ALTER TABLE public.l3_facilities ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'l3_facilities' AND policyname = 'Enable read access for all users'
        ) THEN
            CREATE POLICY "Enable read access for all users" ON public.l3_facilities FOR SELECT USING (true);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'l3_facilities' AND policyname = 'Enable insert/update for service role only'
        ) THEN
            CREATE POLICY "Enable insert/update for service role only" ON public.l3_facilities FOR ALL USING (auth.role() = 'service_role');
        END IF;
    END
    $$;
    `;

    console.log('Applying migration...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }); // Assuming exec_sql generic RPC exists, OR standard client doesn't support raw SQL easily.

    // Fallback: If exec_sql doesn't exist (common), we rely on Dashboard.
    // BUT WAIT: We can use 'postgres' connection if we had connection string. We don't.
    // Most users apply migrations via Dashboard or CLI.
    // However, sometimes specific RPCs are set up.

    // Let's try to just run it via a standard query if possible? No.
    // Workaround: We will use the REST API to insert, but table must exist.

    // ERROR in previous step was: "Could not find the table".
    // This implies it definitely doesn't exist.

    // Actually, I can't create table via JS Client specific RPC unless I created that RPC.
    // I will try to use the 'pg' library if I can find the connection string? No.

    // Let's print the SQL for the user to run in Supabase SQL Editor.
    console.log('\nPlease run this SQL in Supabase Dashboard -> SQL Editor:\n');
    console.log(sql);
}

applyMigration();
