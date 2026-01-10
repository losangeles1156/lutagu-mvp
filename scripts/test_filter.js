
const testCases = [
    { name: 'Normal Bold', input: '這是 **重要** 的資訊', expected: '這是 重要 的資訊' },
    { name: 'Multiple Bold', input: '請在 **10:00** 前到達 **新宿站**', expected: '請在 10:00 前到達 新宿站' },
    { name: 'URL with asterisk (unlikely)', input: 'https://example.com/path?q=**test**', expected: 'https://example.com/path?q=test' },
    { name: 'Code Block (Exponentiation)', input: '`x ** 2`', expected: '`x  2`' }, // This will be filtered if we use a simple regex
    { name: 'Code Block (Comments)', input: '```python\n# **Important**\nx = 2 ** 3\n```', expected: '```python\n# Important\nx = 2  3\n```' }
];

function filter(text) {
    return text.replace(/\*\*/g, '');
}

testCases.forEach(tc => {
    const result = filter(tc.input);
    console.log(`[${tc.name}]`);
    console.log(`  Input:    ${tc.input}`);
    console.log(`  Result:   ${result}`);
    console.log(`  Expected: ${tc.expected}`);
    console.log(`  Match:    ${result === tc.expected}`);
});
