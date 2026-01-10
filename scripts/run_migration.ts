import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: npx tsx scripts/run_migration.ts <migration-file>');
  console.error('Example: npx tsx scripts/run_migration.ts supabase/migrations/20260110_add_location_tags_column.sql');
  process.exit(1);
}

const migrationPath = migrationFile.startsWith('/') 
  ? migrationFile 
  : join(__dirname, '..', migrationFile);

if (!existsSync(migrationPath)) {
  console.error(`Migration file not found: ${migrationPath}`);
  process.exit(1);
}

async function runMigration() {
  console.log(`=== Running Migration: ${basename(migrationPath)} ===\n`);

  const sql = readFileSync(migrationPath, 'utf-8');

  // Execute the SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('Error executing migration:', error);
    return;
  }

  console.log('Migration executed successfully!');

  // Verify wards now have boundaries
  const { data: wards } = await supabase
    .from('wards')
    .select('id, name_i18n, boundary IS NOT null as has_boundary, node_count')
    .order('id');

  console.log('\n=== Ward Status After Migration ===');
  if (wards) {
    for (const w of wards) {
      console.log(`  ${w.name_i18n?.ja || w.id}: boundary=${w.has_boundary}, nodes=${w.node_count}`);
    }
  }
}

runMigration().catch(console.error);
