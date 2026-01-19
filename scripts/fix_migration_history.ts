/**
 * Fix migration history by deleting conflicting entries from schema_migrations
 */

import { createClient } from '@supabase/supabase-js';

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase environment variables');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // First, check the current state of schema_migrations
    console.log('📋 Current schema_migrations entries:');

    const { data: currentMigrations, error: selectError } = await supabase
        .from('schema_migrations')
        .select('*')
        .order('version');

    if (selectError) {
        console.error('❌ Error fetching migrations:', selectError);
        process.exit(1);
    }

    console.table(currentMigrations || []);

    // Check for conflicting migrations
    const conflictingVersions = ['20251230', '20260104'];
    const hasConflicts = currentMigrations?.some(m => conflictingVersions.includes(m.version));

    if (!hasConflicts) {
        console.log('✅ No conflicting migrations found');
        return;
    }

    console.log('⚠️  Found conflicting migrations:', conflictingVersions.join(', '));

    // Delete conflicting migrations
    console.log('🗑️  Deleting conflicting migrations...');

    const { error: deleteError } = await supabase
        .from('schema_migrations')
        .delete()
        .in('version', conflictingVersions);

    if (deleteError) {
        console.error('❌ Error deleting migrations:', deleteError);
        process.exit(1);
    }

    console.log('✅ Successfully deleted conflicting migrations');

    // Verify the deletion
    console.log('📋 Updated schema_migrations entries:');

    const { data: updatedMigrations, error: verifyError } = await supabase
        .from('schema_migrations')
        .select('*')
        .order('version');

    if (verifyError) {
        console.error('❌ Error verifying migrations:', verifyError);
        process.exit(1);
    }

    console.table(updatedMigrations || []);
    console.log('✅ Migration history fixed. You can now run: npx supabase db push --linked');
}

main().catch(console.error);
