const fs = require('node:fs');
const path = require('node:path');

const baseUrl = process.env.AGENT_E2E_BASE_URL || 'http://localhost:3000';
const minAccuracy = Number(process.env.AGENT_E2E_MIN_ACCURACY || 0.9);
const casesPath = process.env.AGENT_E2E_CASES || path.join(process.cwd(), 'tests', 'agent_e2e_cases.json');
const reportPath = process.env.AGENT_E2E_REPORT_PATH || path.join(process.cwd(), 'reports', 'agent_e2e_report.json');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fetch failed ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function waitForRun(requestId, retries = 20, delayMs = 500) {
  for (let i = 0; i < retries; i += 1) {
    const health = await fetchJson(`${baseUrl}/api/agent/health`);
    const runs = health?.snapshot?.recentRuns || [];
    const match = runs.find(r => r.requestId === requestId);
    if (match) return match;
    await sleep(delayMs);
  }
  return null;
}

async function runCase(testCase) {
  const res = await fetch(`${baseUrl}/api/agent/v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: testCase.text, locale: testCase.locale })
  });

  const body = await res.text();
  const requestId = res.headers.get('x-agent-request-id');
  const backend = res.headers.get('x-agent-backend');

  if (!requestId) {
    return { ...testCase, ok: false, reason: 'missing request id', backend };
  }

  if (!body || body.trim().length === 0) {
    return { ...testCase, ok: false, reason: 'empty response', backend, requestId };
  }

  const run = await waitForRun(requestId);
  if (!run) {
    return { ...testCase, ok: false, reason: 'missing run record', backend, requestId };
  }

  const expected = testCase.expectedTools || [];
  const hasAll = expected.every(t => run.toolCalls.includes(t));

  return {
    ...testCase,
    ok: hasAll,
    backend,
    requestId,
    toolCalls: run.toolCalls,
    latencyMs: run.latencyMs
  };
}

async function main() {
  const raw = fs.readFileSync(casesPath, 'utf-8');
  const cases = JSON.parse(raw);
  const results = [];

  for (const testCase of cases) {
    process.stdout.write(`Running ${testCase.id}... `);
    try {
      const r = await runCase(testCase);
      results.push(r);
      process.stdout.write(r.ok ? 'OK\n' : 'FAIL\n');
    } catch (error) {
      results.push({ ...testCase, ok: false, reason: error.message });
      process.stdout.write('ERROR\n');
    }
  }

  const passed = results.filter(r => r.ok).length;
  const total = results.length;
  const accuracy = total === 0 ? 0 : passed / total;
  const avgLatency = (() => {
    const latencies = results.map(r => r.latencyMs).filter(v => typeof v === 'number');
    if (latencies.length === 0) return null;
    const sum = latencies.reduce((a, b) => a + b, 0);
    return Math.round(sum / latencies.length);
  })();

  console.log(`\nAgent E2E accuracy: ${(accuracy * 100).toFixed(1)}% (${passed}/${total})`);
  if (avgLatency !== null) {
    console.log(`Average latency: ${avgLatency} ms`);
  }

  const failed = results.filter(r => !r.ok);
  if (failed.length > 0) {
    console.log('\nFailed cases:');
    for (const f of failed) {
      console.log(`- ${f.id}: ${f.reason || 'tool mismatch'} (backend=${f.backend || 'n/a'}) expected=${(f.expectedTools || []).join(',')} got=${(f.toolCalls || []).join(',')}`);
    }
  }

  if (accuracy < minAccuracy) {
    console.error(`\nAccuracy below threshold (${minAccuracy}).`);
    await writeReport({ results, accuracy, passed, total, avgLatency, ok: false });
    process.exit(1);
  }

  await writeReport({ results, accuracy, passed, total, avgLatency, ok: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function writeReport(summary) {
  const payload = {
    timestamp: new Date().toISOString(),
    baseUrl,
    minAccuracy,
    ...summary,
  };
  const dir = path.dirname(reportPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2));
}
