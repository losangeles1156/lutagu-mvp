
const API_BASE = 'http://localhost:3000';

async function runJsonTest(name: string, path: string, payload: any) {
  console.log(`\n\n=== JSON Test: ${name} ===`);
  console.log('Path:', path);
  console.log('Payload:', JSON.stringify(payload.messages?.[0] || payload.text || {}).slice(0, 300));

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': API_BASE },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  console.log('Status:', response.status);
  console.log('Answer:', (data?.answer || data?.raw || '').toString().slice(0, 400));
  return { status: response.status, data };
}

async function runStreamTest(name: string, path: string, payload: any) {
  console.log(`\n\n=== Stream Test: ${name} ===`);
  console.log('Path:', path);
  console.log('Payload:', JSON.stringify(payload.messages?.[0] || payload.text || {}).slice(0, 300));

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': API_BASE },
    body: JSON.stringify(payload)
  });

  const reader = response.body?.getReader();
  if (!reader) {
    const errText = await response.text();
    console.log('Status:', response.status);
    console.log('Body:', errText.slice(0, 400));
    return { status: response.status, text: errText };
  }

  const decoder = new TextDecoder();
  let acc = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) acc += decoder.decode(value, { stream: true });
  }
  acc += decoder.decode();

  console.log('Status:', response.status);
  console.log('Stream:', acc.slice(0, 600));
  return { status: response.status, text: acc };
}

async function main() {
  console.log('🚀 Starting Hybrid Chat Verification...');

  // JSON endpoint (non-stream)
  await runJsonTest('Vague Location (Shinjuku)', '/api/chat', {
    messages: [{ role: 'user', content: '去新宿' }],
    locale: 'zh-TW',
    zone: 'core'
    // No userLocation, checking if it asks "Where in Shinjuku?"
  });

  // Case 2: Specific L5/Strategy Context (Expect Implicit L4 Knowledge)
  // Simulate user AT Shinjuku Station (Lat/Lon) asking about transfer
  await runJsonTest('Implicit Context (At Shinjuku, seeking Oedo Line)', '/api/chat', {
    messages: [{ role: 'user', content: '轉乘大江戶線' }],
    userLocation: { lat: 35.6897, lon: 139.7005 }, // Shinjuku Coordinates
    locale: 'zh-TW',
    zone: 'core'
  });

  // Case 3: Explicit Trick (Expect L4 Knowledge)
  await runJsonTest('Specific Trap Question (Meguro Hill)', '/api/chat', {
    messages: [{ role: 'user', content: '目黑站有什麼陷阱嗎？' }],
    userLocation: { lat: 35.6339, lon: 139.7153 }, // Meguro
    locale: 'zh-TW',
    zone: 'core'
  });

  // Streaming endpoint (agent)
  const streamPayloadBase = {
    messages: [{ role: 'user', content: '我現在在上野站，想要無障礙動線到銀座線，請一步一步告訴我怎麼走，並提醒可能的陷阱。' }],
    nodeId: 'odpt.Station:TokyoMetro.Ginza.Ueno',
    stationName: '上野',
    userLocation: { lat: 35.7138, lng: 139.7773 },
    locale: 'zh-TW',
    zone: 'core'
  };

  await runStreamTest('Multi-step Reasoning (Accessibility)', '/api/agent/chat', streamPayloadBase);

  const N = 10;
  let ok = 0;
  let fallback = 0;
  for (let i = 0; i < N; i++) {
    const res = await runStreamTest(`Stability Run #${i + 1}`, '/api/agent/chat', {
      ...streamPayloadBase,
      messages: [{ role: 'user', content: `（第${i + 1}次）請做多步推理：從上野站去淺草，若銀座線延誤超過15分鐘，給我1個替代方案並解釋原因。` }]
    });

    if (res.status >= 200 && res.status < 300 && res.text.trim().length > 0) {
      ok += 1;
      if (/(服務暫時無法使用|系統暫時忙碌|temporarily unavailable|System is busy)/i.test(res.text)) {
        fallback += 1;
      }
    }
  }

  console.log(`\n=== Summary (agent stream) ===`);
  console.log(`Total: ${N}, OK: ${ok}, Fallback-like: ${fallback}`);
}

main();
