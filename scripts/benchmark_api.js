const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = 'http://localhost:3000/api/agent/chat';

const testCases = [
    {
        name: 'Simple Short (Under 10 words)',
        query: '你好',
        nodeId: 'ueno',
        locale: 'zh-TW'
    },
    {
        name: 'Medium Complex (Around 50 words)',
        query: '我現在在上野站，想去淺草寺看看。請問最方便的交通方式是什麼？大概需要多久時間？',
        nodeId: 'ueno',
        locale: 'zh-TW'
    }
];

async function runBenchmark(testCase) {
    console.log(`\n--- Running Benchmark: ${testCase.name} ---`);
    const startTime = Date.now();
    let firstByteTime = null;
    let totalCharacters = 0;
    let chunkCount = 0;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: testCase.query }],
                nodeId: testCase.nodeId,
                locale: testCase.locale
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

            chunkCount++;
            const chunk = decoder.decode(value, { stream: true });
            totalCharacters += chunk.length;
        }

        const endTime = Date.now();
        const totalDuration = endTime - startTime;
        const ttfb = firstByteTime ? firstByteTime - startTime : null;

        const results = {
            name: testCase.name,
            ttfb,
            totalDuration,
            totalCharacters,
            chunkCount,
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
    // Note: This requires the local server to be running on port 3000
    console.log("Starting benchmark... (Make sure 'npm run dev' is running)");
    const allResults = [];
    for (const testCase of testCases) {
        const result = await runBenchmark(testCase);
        allResults.push(result);
        await new Promise(r => setTimeout(r, 2000));
    }

    const reportPath = path.join(__dirname, 'api_benchmark_results.json');
    fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
    console.log(`\nBenchmark completed. Report saved to ${reportPath}`);
}

start();
