#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');

const CHAT_URL = process.env.ABK_CHAT_URL || process.env.ADK_CHAT_URL || 'http://localhost:8080/agent/chat';
const METRICS_URL = process.env.ABK_METRICS_URL || process.env.ADK_METRICS_URL || 'http://localhost:8080/metrics';
const LOCALE = process.env.AB_LOCALE || 'zh-TW';

const QUESTIONS = [
  '我現在想從上野搭車到銀座，需要多久？為什麼不推薦銀座線直達？',
  '我現在要搭幾點的車才來得及17:00的航班？請直接給可執行建議。'
];

const SEEDED_HISTORY = [
  { role: 'user', content: '我在東京旅遊，通常偏好少轉乘、步行少一點。' },
  { role: 'assistant', content: '收到，我會優先提供少轉乘、步行短的路線，並補充備案。' },
  { role: 'user', content: '我不想太趕，但如果快很多也可以接受一次轉乘。' },
  { role: 'assistant', content: '了解，會在時間與舒適度間做平衡，先給最推薦方案再給備選。' },
  { role: 'user', content: '如果下雨希望盡量走地下通道，避免長距離地面步行。' },
  { role: 'assistant', content: '沒問題，下雨時會優先地下動線與室內轉乘。' },
  { role: 'user', content: '我常在上野、東京、銀座移動，請記住我常去這幾站。' },
  { role: 'assistant', content: '已記下常用站點：上野、東京、銀座。後續建議會優先這些節點。' }
];

const profiles = [
  {
    key: 'A',
    name: 'Baseline (quality+detailed)',
    payload: {
      response_mode: 'detailed',
      token_profile: 'quality',
      max_context_tokens: 2800,
      history_budget_tokens: 2600
    }
  },
  {
    key: 'B',
    name: 'Optimized (balanced+concise)',
    payload: {
      response_mode: 'concise',
      token_profile: 'balanced',
      max_context_tokens: 1000,
      history_budget_tokens: 1000
    }
  }
];

function nowISO() {
  return new Date().toISOString();
}

function toInt(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return 0;
}

function estimateTokensFromChars(chars) {
  // Rough estimate: 1 token ~= 4 chars (mixed multilingual approximation)
  return Math.max(0, Math.round(chars / 4));
}

async function fetchMetrics() {
  const res = await fetch(METRICS_URL, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Metrics request failed: ${res.status}`);
  }
  const body = await res.json();
  const metrics = body?.metrics || {};
  const counters = metrics?.counters || {};
  return {
    request_count: toInt(counters.request_count),
    llm_required_count: toInt(counters.llm_required_count),
    llm_invocation_count: toInt(counters.llm_invocation_count),
    tool_only_resolution_rate: toInt(counters.tool_only_resolution_rate),
    prompt_chars_total: toInt(counters.prompt_chars_total),
    completion_chars_total: toInt(counters.completion_chars_total)
  };
}

function diffMetrics(before, after) {
  const out = {};
  for (const k of Object.keys(after)) {
    out[k] = toInt(after[k]) - toInt(before[k] || 0);
  }
  return out;
}

async function runSingleChat({ profile, question, idx }) {
  const payload = {
    locale: LOCALE,
    user_id: `${profile.key}-user-ab`,
    session_id: `${profile.key}-session-ab-${Date.now()}-${idx}`,
    is_authenticated: false,
    timezone: 'Asia/Tokyo',
    client_now_iso: nowISO(),
    ...profile.payload,
    messages: [...SEEDED_HISTORY, { role: 'user', content: question }]
  };

  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok || !res.body) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalText = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split(/\n\n/);
    buffer = events.pop() || '';

    for (const ev of events) {
      const lines = ev.split(/\n/);
      let eventType = '';
      let eventData = '';
      for (const line of lines) {
        if (line.startsWith('event:')) eventType = line.slice(6).trim();
        if (line.startsWith('data:')) eventData = line.slice(5).trim();
      }
      if (eventType === 'telem' && eventData) {
        try {
          const parsed = JSON.parse(eventData);
          finalText += parsed.content || '';
        } catch {
          // ignore
        }
      }
    }
  }

  return {
    question,
    responseChars: [...finalText].length,
    responsePreview: finalText.slice(0, 140).replace(/\s+/g, ' ')
  };
}

async function runProfile(profile) {
  const before = await fetchMetrics();
  const perQuestion = [];

  for (let i = 0; i < QUESTIONS.length; i += 1) {
    const result = await runSingleChat({ profile, question: QUESTIONS[i], idx: i + 1 });
    perQuestion.push(result);
  }

  const after = await fetchMetrics();
  const delta = diffMetrics(before, after);

  const promptTokensEst = estimateTokensFromChars(delta.prompt_chars_total);
  const completionTokensEst = estimateTokensFromChars(delta.completion_chars_total);
  const totalTokensEst = promptTokensEst + completionTokensEst;

  return {
    profile,
    perQuestion,
    before,
    after,
    delta,
    promptTokensEst,
    completionTokensEst,
    totalTokensEst
  };
}

function pctReduction(a, b) {
  if (a <= 0) return 0;
  return ((a - b) / a) * 100;
}

function buildReport(resultA, resultB) {
  const totalReduction = pctReduction(resultA.totalTokensEst, resultB.totalTokensEst);
  const promptReduction = pctReduction(resultA.promptTokensEst, resultB.promptTokensEst);
  const completionReduction = pctReduction(resultA.completionTokensEst, resultB.completionTokensEst);

  const pass = totalReduction >= 35 && totalReduction <= 55;
  const ts = new Date();
  const title = `AB Token Acceptance Report - ${ts.toISOString()}`;

  const lines = [];
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`- Chat URL: \`${CHAT_URL}\``);
  lines.push(`- Metrics URL: \`${METRICS_URL}\``);
  lines.push(`- Locale: \`${LOCALE}\``);
  lines.push(`- Questions: ${QUESTIONS.length}`);
  lines.push('');
  lines.push('## Result');
  lines.push('');
  lines.push(`- Target reduction: **35% ~ 55%**`);
  lines.push(`- Actual total reduction: **${totalReduction.toFixed(2)}%**`);
  lines.push(`- Verdict: **${pass ? 'PASS' : 'FAIL'}**`);
  lines.push('');
  lines.push('## A/B Summary (Estimated Tokens)');
  lines.push('');
  lines.push('| Profile | Prompt Tokens | Completion Tokens | Total Tokens | LLM Invocations | Tool-only Resolutions |');
  lines.push('|---|---:|---:|---:|---:|---:|');
  lines.push(`| ${resultA.profile.name} | ${resultA.promptTokensEst} | ${resultA.completionTokensEst} | ${resultA.totalTokensEst} | ${resultA.delta.llm_invocation_count} | ${resultA.delta.tool_only_resolution_rate} |`);
  lines.push(`| ${resultB.profile.name} | ${resultB.promptTokensEst} | ${resultB.completionTokensEst} | ${resultB.totalTokensEst} | ${resultB.delta.llm_invocation_count} | ${resultB.delta.tool_only_resolution_rate} |`);
  lines.push('');
  lines.push('## Reduction Breakdown');
  lines.push('');
  lines.push(`- Prompt reduction: **${promptReduction.toFixed(2)}%**`);
  lines.push(`- Completion reduction: **${completionReduction.toFixed(2)}%**`);
  lines.push(`- Total reduction: **${totalReduction.toFixed(2)}%**`);
  lines.push('');
  lines.push('## Per-question Response Snapshot');
  lines.push('');

  for (const item of resultA.perQuestion) {
    lines.push(`- [A] Q: ${item.question}`);
    lines.push(`  - response_chars: ${item.responseChars}`);
    lines.push(`  - preview: ${item.responsePreview}`);
  }
  lines.push('');
  for (const item of resultB.perQuestion) {
    lines.push(`- [B] Q: ${item.question}`);
    lines.push(`  - response_chars: ${item.responseChars}`);
    lines.push(`  - preview: ${item.responsePreview}`);
  }

  return { report: lines.join('\n'), pass, totalReduction, promptReduction, completionReduction };
}

async function main() {
  console.log(`[AB] Running token acceptance test...`);
  console.log(`[AB] Chat URL: ${CHAT_URL}`);
  console.log(`[AB] Metrics URL: ${METRICS_URL}`);

  const resultA = await runProfile(profiles[0]);
  const resultB = await runProfile(profiles[1]);

  const { report, pass, totalReduction } = buildReport(resultA, resultB);

  const outDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `ab_token_acceptance_${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
  const filePath = path.join(outDir, fileName);
  fs.writeFileSync(filePath, report, 'utf8');

  console.log(`[AB] Total reduction: ${totalReduction.toFixed(2)}%`);
  console.log(`[AB] Verdict: ${pass ? 'PASS' : 'FAIL'}`);
  console.log(`[AB] Report: ${filePath}`);

  if (!pass) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error('[AB] Failed:', err.message);
  process.exitCode = 1;
});
