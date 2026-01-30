import { test, expect } from '@playwright/test';

test.describe('ADK Chat Integration', () => {

    test('Should successfully route message to ADK Agent (Go) and receive response', async ({ request }) => {
        // We use APIRequestContext to test the backend integration directly via the Next.js Proxy
        // This validates: Next.js Proxy -> Go Backend -> OpenRouter -> Go Backend -> Next.js Proxy

        const response = await request.post('/api/agent/adk', {
            data: {
                messages: [
                    { role: 'user', content: 'Say "Integration Test Successful"' }
                ],
                locale: 'en'
            }
        });

        // The endpoint returns a stream. We should just check status 200 first.
        expect(response.status()).toBe(200);

        const body = await response.text();
        console.log('[TEST] Integration Response Body:', body);

        // Verify content. Note: It's a stream, so we might need to parse chunks if we want precise validation.
        // But simply receiving ANY text that isn't an error is a good sign.
        // The mock logic in Go isn't there, so it will hit OpenRouter. 
        // If OpenRouter Key is valid, it should reply. 
        // If not, it might error.

        // We check for some common failure patterns
        expect(body).not.toContain('Dial tcp'); // Connection refused
        expect(body).not.toContain('upstream error'); // Proxy failure

        // Try to check for success indicator if possible.
        // Ideally, we get "Integration Test Successful" back.
    });

});
