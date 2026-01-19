
// Testing Semantic Search API
async function runTest() {
    console.log('Testing Semantic Search API...');

    const queries = [
        "上野站有電梯嗎？",
        "東京站去迪士尼要走很久嗎？",
        "銀座線很擠嗎？"
    ];

    for (const q of queries) {
        console.log(`\nQuery: ${q}`);
        const response = await fetch('http://localhost:3001/api/l4/semantic-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:3001'
            },
            body: JSON.stringify({ query: q, top_k: 2 })
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            continue;
        }

        const data: any = await response.json();
        console.log(`Results: ${data.results.length}`);
        data.results.forEach((r: any, i: number) => {
            console.log(`${i + 1}. [Score: ${r.relevance_score.toFixed(4)}] ${r.content}`);
        });
    }
}

runTest();
