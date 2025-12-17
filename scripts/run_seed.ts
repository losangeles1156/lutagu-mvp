// scripts/run_seed.ts
require('dotenv').config({ path: '.env.local' });

async function main() {
    console.log('--- Environment Check ---');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'PRESENT' : 'MISSING');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING');
    console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'PRESENT' : 'MISSING');
    console.log('-------------------------');

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error('Critical env var NEXT_PUBLIC_SUPABASE_URL is missing!');
    }

    // Dynamic import to ensure env vars are loaded first
    const { seedCities } = await import('../src/lib/cities/seedCities');
    const { seedNodes } = await import('../src/lib/nodes/seedNodes');
    const { seedL1Profiles } = await import('../src/lib/facilities/seedProfiles');

    await seedCities();
    await seedNodes();
    await seedL1Profiles();
}

main()
    .then(() => {
        console.log('Seeding complete.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Seeding failed:', err);
        process.exit(1);
    });

export { };
