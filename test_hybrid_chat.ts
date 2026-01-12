
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/chat';

async function runTest(name: string, payload: any) {
  console.log(`\n\n=== Test: ${name} ===`);
  console.log('Payload:', JSON.stringify(payload.messages[0]));

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Source:', data.context?.source || 'unknown');
    console.log('Answer:', data.answer);

    return data;
  } catch (error) {
    console.error('FAILED:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting Hybrid Chat Verification...');

  // Case 1: Vague Query (Expect Proactive Question)
  await runTest('Vague Location (Shinjuku)', {
    messages: [{ role: 'user', content: '去新宿' }],
    locale: 'zh-TW',
    zone: 'core'
    // No userLocation, checking if it asks "Where in Shinjuku?"
  });

  // Case 2: Specific L5/Strategy Context (Expect Implicit L4 Knowledge)
  // Simulate user AT Shinjuku Station (Lat/Lon) asking about transfer
  await runTest('Implicit Context (At Shinjuku, seeking Oedo Line)', {
    messages: [{ role: 'user', content: '轉乘大江戶線' }],
    userLocation: { lat: 35.6897, lon: 139.7005 }, // Shinjuku Coordinates
    locale: 'zh-TW',
    zone: 'core'
  });

  // Case 3: Explicit Trick (Expect L4 Knowledge)
  await runTest('Specific Trap Question (Meguro Hill)', {
    messages: [{ role: 'user', content: '目黑站有什麼陷阱嗎？' }],
    userLocation: { lat: 35.6339, lon: 139.7153 }, // Meguro
    locale: 'zh-TW',
    zone: 'core'
  });
}

main();
