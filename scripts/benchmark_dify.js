const fs = require('fs');
const path = require('path');

// Configuration
const DIFY_API_BASE = 'https://dify-k7m9.zeabur.app/v1';
const DIFY_API_KEY = 'app-LcvLcbBVO5pQaVaSgEfnZTXI';

const testCases = [
    {
        name: 'Simple Short (Under 10 words)',
        query: '你好',
        inputs: { current_station: 'ueno', locale: 'zh-TW' }
    },
    {
        name: 'Medium Complex (Around 50 words)',
        query: '我現在在上野站，想去淺草寺看看。請問最方便的交通方式是什麼？大概需要多久時間？',
        inputs: { current_station: 'ueno', locale: 'zh-TW' }
    },
    {
        name: 'Complex Multi-turn (3+ turns simulation)',
        query: '請問從上野到成田機場怎麼走最快？另外，如果我有大件行李，哪種方式比較推薦？最後，Skyline 的票價是多少？',
        inputs: { current_station: 'ueno', locale: 'zh-TW' }
    }
];

async function runBenchmark(testCase) {
    console.log(`\n--- Running Benchmark: ${testCase.name} ---`);
    const startTime = Date.now();
    let firstByteTime = null;
    let totalCharacters = 0;
    let responseText = '';

    try {
        const response = await fetch(`${DIFY_API_BASE}/chat-messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DIFY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: testCase.inputs,
                query: testCase.query,
                response_mode: 'streaming',
                user: 'benchmark-user'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (!firstByteTime) {
                firstByteTime = Date.now();
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    try {
                        const jsonStr = line.slice(5).trim();
                        if (jsonStr === '[DONE]') continue;
                        const data = JSON.parse(jsonStr);
                        if (data.event === 'message' || data.event === 'agent_message') {
                            const answer = data.answer || '';
                            responseText += answer;
                            totalCharacters += answer.length;
                        }
                    } catch (e) {
                        // Ignore partial JSON
                    }
                }
            }
        }

        const endTime = Date.now();
        const totalDuration = endTime - startTime;
        const ttfb = firstByteTime ? firstByteTime - startTime : null;
        const throughput = totalCharacters / (totalDuration / 1000);

        const results = {
            name: testCase.name,
            ttfb,
            totalDuration,
            totalCharacters,
            throughput: throughput.toFixed(2),
            success: true
        };

        console.log(`Results:`, results);
        return results;

    } catch (error) {
        console.error(`Error in ${testCase.name}:`, error.message);
        return {
            name: testCase.name,
            success: false,
            error: error.message
        };
    }
}

async function start() {
    const allResults = [];
    for (const testCase of testCases) {
        const result = await runBenchmark(testCase);
        allResults.push(result);
        // Wait a bit between tests to avoid rate limiting or overlap
        await new Promise(r => setTimeout(r, 2000));
    }

    const reportPath = path.join(__dirname, 'benchmark_results.json');
    fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
    console.log(`\nBenchmark completed. Report saved to ${reportPath}`);
}

start();
