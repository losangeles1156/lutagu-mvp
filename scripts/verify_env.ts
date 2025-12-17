// scripts/verify_env.ts
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

console.log('--- Verifying .env.local ---');

const envPath = path.resolve(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file NOT FOUND at ' + envPath);
    process.exit(1);
}

const envConfig = dotenv.parse(fs.readFileSync(envPath));
const keys = Object.keys(envConfig);

console.log(`Found ${keys.length} keys in .env.local:`);
keys.forEach(key => {
    const value = envConfig[key];
    const status = value && value.length > 0 ? 'Hash Present' : 'Empty';
    console.log(`- ${key}: [${status}]`);
});

const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY' // The new one
];

const missing = required.filter(k => !keys.includes(k));

if (missing.length > 0) {
    console.error('\n❌ MISSING KEYS:', missing.join(', '));
} else {
    console.log('\n✅ All required keys present.');
}
