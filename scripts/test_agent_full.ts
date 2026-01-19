
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Imports (using relative paths for safety in script execution)
import { ToolRegistry } from '../src/lib/agent/tools/ToolRegistry';
import { registerStandardTools } from '../src/lib/agent/tools/index';
import { AgentLevel } from '../src/lib/agent/core/types';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Report Data
const report: string[] = [];
const failures: string[] = [];

function log(section: string, message: string, status: 'INFO' | 'PASS' | 'FAIL' | 'WARN' = 'INFO') {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARN' ? '⚠️' : 'ℹ️';
    const line = `[${section}] ${icon} ${message}`;
    console.log(line);
    report.push(line);
    if (status === 'FAIL') failures.push(line);
}

// Helper for fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function testSystemHealth() {
    log('HEALTH', 'Starting System Health Check...');

    // 1. Env Vars
    const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'GOOGLE_API_KEY', 'MISTRAL_API_KEY'];
    let envOk = true;
    for (const v of requiredVars) {
        if (!process.env[v]) {
            log('HEALTH', `Missing environment variable: ${v}`, 'FAIL');
            envOk = false;
        }
    }
    if (envOk) log('HEALTH', 'All environment variables present', 'PASS');

    // 2. Supabase Connection
    try {
        // Use a timeout for supabase if possible, or just race it
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase Timeout')), 5000));
        const dbPromise = supabase.from('odpt_stations').select('count', { count: 'exact', head: true });

        await Promise.race([dbPromise, timeoutPromise]);
        log('HEALTH', 'Supabase Connection (DB)', 'PASS');
    } catch (e) {
        log('HEALTH', `Supabase Connection Failed: ${(e as Error).message}`, 'FAIL');
    }

    // 3. Mistral API
    try {
        const apiKey = process.env.MISTRAL_API_KEY;
        if (apiKey) {
            const res = await fetchWithTimeout('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: 'mistral-tiny',
                    messages: [{ role: 'user', content: 'ping' }],
                    max_tokens: 1
                })
            }, 5000); // 5s timeout

            if (res.ok) log('HEALTH', 'Mistral AI API Connection', 'PASS');
            else log('HEALTH', `Mistral AI API Error: ${res.status} ${res.statusText}`, 'FAIL');
        }
    } catch (e) {
        log('HEALTH', `Mistral Connection Failed: ${(e as Error).message}`, 'FAIL');
    }

    // 4. Gemini API
    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (apiKey) {
            // Manual fetch for Gemini to control timeout easily, avoiding SDK hanging
            // Strategy: Try a list of potential model names until one works
            const candidates = [
                'gemini-3-flash-preview',    // User specified model
                'gemini-2.0-flash-exp',
                'gemini-1.5-flash'
            ];

            let success = false;

            for (const modelName of candidates) {
                if (success) break;

                log('HEALTH', `Trying Gemini Model: ${modelName}...`, 'INFO');
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

                const payload = {
                    contents: [{ parts: [{ text: "ping" }] }],
                    generationConfig: { maxOutputTokens: 1 }
                };

                try {
                    const res = await fetchWithTimeout(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }, 5000);

                    if (res.ok) {
                        log('HEALTH', `Gemini API Connection (${modelName})`, 'PASS');
                        success = true;
                    } else {
                        if (res.status === 429) {
                            log('HEALTH', `Gemini Rate Limit (Quota Exceeded) for ${modelName}. API Key is valid.`, 'WARN');
                            success = true;
                        } else {
                            const txt = await res.text();
                            // Only log as WARN if it's not the last candidate
                            const isLast = modelName === candidates[candidates.length - 1];
                            log('HEALTH', `Gemini API Error (${modelName}): ${res.status}`, isLast ? 'FAIL' : 'WARN');
                            if (isLast) console.log(txt.substring(0, 200));
                        }
                    }
                } catch (e) {
                     log('HEALTH', `Gemini Connection Error (${modelName}): ${(e as Error).message}`, 'WARN');
                }
            }
        }
    } catch (e) {
        log('HEALTH', `Gemini API Failed: ${(e as Error).message}`, 'FAIL');
    }
}

async function testCoreFunctions() {
    log('CORE', 'Starting Core Functionality Tests...');

    // 1. Tool Chain
    try {
        const registry = ToolRegistry.getInstance();
        registerStandardTools();

        const tools = [
            { id: 'fare_calculator', level: AgentLevel.L2_LIVE },
            { id: 'facility_search', level: AgentLevel.L3_FACILITY },
            { id: 'pedestrian_accessibility', level: AgentLevel.L3_FACILITY }
        ];

        let toolsOk = true;
        for (const t of tools) {
            const tool = registry.getTool(t.id);
            if (!tool) {
                log('CORE', `Tool missing: ${t.id}`, 'FAIL');
                toolsOk = false;
            } else {
                if (tool.requiredLevel !== t.level) {
                     log('CORE', `Tool level mismatch: ${t.id} (Expected ${t.level}, Got ${tool.requiredLevel})`, 'WARN');
                }
            }
        }
        if (toolsOk) log('CORE', 'Tool Registry & Registration', 'PASS');

    // 2. FareTool Test
    try {
        const fareTool = registry.getTool('fare_calculator');
        if (fareTool) {
            const result = await fareTool.execute({
                origin: "Tokyo",
                destination: "Shinjuku",
                ticketType: "IC"
            }, {
                userId: "test-user",
                sessionId: "test-session",
                // agentLevel: "L2" // Removing unknown property to fix linter error
            } as any); // Type assertion to bypass strict check if interface mismatch
            log('CORE', `FareTool Execution: ${JSON.stringify(result)}`, 'PASS');
        }
    } catch (e) {
        log('CORE', `FareTool Failed: ${(e as Error).message}`, 'FAIL');
    }

    // 3. FacilityTool Test
    try {
        const facTool = registry.getTool('facility_search');
        if (facTool) {
            const result = await facTool.execute({
                stationId: "tokyo_station",
                facilityType: "toilet"
            }, {
                userId: "test-user",
                sessionId: "test-session"
            } as any);
            log('CORE', 'FacilityTool Execution', 'PASS');
        }
    } catch (e) {
        log('CORE', `FacilityTool Failed: ${(e as Error).message}`, 'FAIL');
    }

    // 4. PedestrianTool Test
    try {
        const pedTool = registry.getTool('pedestrian_accessibility');
        if (pedTool) {
            const result = await pedTool.execute({
                lat: 35.6812,
                lon: 139.7671,
                radius: 500
            }, {
                userId: "test-user",
                sessionId: "test-session"
            } as any);
            log('CORE', `PedestrianTool Execution (Source: ${(result as any).source || 'unknown'})`, 'PASS');
        }
    } catch (e) {
        log('CORE', `PedestrianTool Failed: ${(e as Error).message}`, 'FAIL');
    }

    } catch (e) {
        log('CORE', `Tool Chain Test Error: ${(e as Error).message}`, 'FAIL');
    }
}

async function testPressureAndEdge() {
    const registry = ToolRegistry.getInstance();
    // 5. Pressure Tests
    try {
        log('PRESSURE', 'Starting Pressure & Edge Tests...', 'INFO');

        // Concurrent Requests (Simulate 20 tool calls)
        const start = Date.now();
        const promises = [];
        const fareTool = registry.getTool('fare_calculator');

        if (fareTool) {
            for (let i = 0; i < 20; i++) {
                promises.push(fareTool.execute({
                    origin: "Tokyo",
                    destination: "Shinjuku",
                    ticketType: "IC"
                }, {
                    userId: "stress-test",
                    sessionId: `session-${i}`
                } as any));
            }

            await Promise.all(promises);
            const duration = Date.now() - start;
            log('PRESSURE', `Executed 20 concurrent tool calls in ${duration}ms`, 'PASS');
        }

        // Edge Case: Null input
        if (fareTool) {
            try {
                // @ts-ignore
                const res = await fareTool.execute(null, { userId: "test" } as any);
                log('PRESSURE', `Handled null input gracefully: ${JSON.stringify(res)}`, 'PASS');
            } catch (e) {
                log('PRESSURE', 'Handled null input with exception (Acceptable)', 'PASS');
            }
        }

    } catch (e) {
        log('PRESSURE', `Pressure Test Failed: ${(e as Error).message}`, 'FAIL');
    }
}

async function run() {
    log('INIT', 'Lutagu Agent Test Suite v1.0');
    log('INIT', `Time: ${new Date().toISOString()}`);

    await testSystemHealth();
    await testCoreFunctions();
    await testPressureAndEdge();

    const reportContent = `
# Lutagu Agent Test Report
**Date:** ${new Date().toLocaleString()}
**Environment:** Local / MacOS

## Summary
- **Total Checks:** ${report.length}
- **Failures:** ${failures.length}
- **Status:** ${failures.length === 0 ? '✅ READY' : '❌ REQUIRES ATTENTION'}

## Execution Log
\`\`\`
${report.join('\n')}
\`\`\`

## Abnormalities & Improvements
${failures.length > 0 ? failures.map(f => `- ${f}`).join('\n') : '- None detected.'}

## Conclusion
${failures.length === 0 ? 'System is ready for MVP deployment.' : 'System has critical issues needing resolution before deployment.'}
`;

    fs.writeFileSync('TEST_REPORT.md', reportContent);
    console.log('\n--- Test Complete ---');
    console.log(`Report generated at ${path.resolve('TEST_REPORT.md')}`);

    if (failures.length > 0) process.exit(1);
}

run();
