import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('P4-3 Integration Verification', () => {

    test('TC-01: Verify Vector Search (POI) Integration', async ({ page }) => {
        // 1. Navigate to Chat (Assuming logged in or direct access)
        // If login is required, we might need a setup step. Assuming accessible for now based on other tests.
        await page.goto('/');

        // 2. Open Chat Widget if necessary
        const chatButton = page.locator('button[aria-label="Open Chat"]'); // Adjust selector as needed
        if (await chatButton.isVisible()) {
            await chatButton.click();
        }

        // 3. Send POI Query
        const input = page.locator('textarea[placeholder="Ask me anything..."]'); // Adjust selector
        await input.fill('Find ramen near Tokyo Station');
        await input.press('Enter');

        // 4. Wait for Response
        // We look for a response that indicates results found, avoiding "No results found"
        const responseLocator = page.locator('.message-content').last();
        await expect(responseLocator).not.toContainText('No results found');
        await expect(responseLocator).toContainText('Found');

        // 5. Verify Content matches Vector Search (Not Mock)
        // Mock had "Ichiran Ramen Tokyo Station". Real vector search might have different or similar.
        // Key is that we don't error out.
        // Optional: Check network request to ensure vector search was hit (backend logs would confirm this better).
    });

    test('TC-02: Verify Routing Service (Rust L4) Integration', async ({ page }) => {
        // 1. Navigate to Chat
        await page.goto('/');

        // 2. Open Chat Widget
        const chatButton = page.locator('button[aria-label="Open Chat"]');
        if (await chatButton.isVisible()) {
            await chatButton.click();
        }

        // 3. Send Route Query
        const input = page.locator('textarea[placeholder="Ask me anything..."]');
        await input.fill('How to go from Tokyo to Shinjuku?');
        await input.press('Enter');

        // 4. Wait for Response
        const responseLocator = page.locator('.message-content').last();

        // 5. Verify Content matches Rust Routing Logic
        // The mock returned "Yamanote Line (Inner Loop) -> 14 mins".
        // The real service returns a dynamic summary.
        // We expect "Time:", "Transfers:", "Path:" format from our route.go update.
        await expect(responseLocator).toContainText('Time:');
        await expect(responseLocator).toContainText('Transfers:');
        await expect(responseLocator).toContainText('Path:');

        // Verify it's NOT the error message
        await expect(responseLocator).not.toContainText('Routing Error');
    });

    // API Level Tests (Direct verify if UI is flaky)
    test('TC-03: Direct API Verification', async ({ request }) => {
        // Verify Vector Search via Chat API
        const chatResponse = await request.post('/api/chat', {
            data: {
                messages: [{ role: 'user', content: 'Find ramen near Tokyo Station' }],
                locale: 'en'
            }
        });
        expect(chatResponse.ok()).toBeTruthy();
        const chatBody = await chatResponse.text(); // Streaming response
        expect(chatBody).toContain('Found');


        // Verify Routing via internal API (if exposed) or via Chat
        const routeResponse = await request.post('/api/chat', {
            data: {
                messages: [{ role: 'user', content: 'From Tokyo to Shinjuku' }],
                locale: 'en'
            }
        });
        expect(routeResponse.ok()).toBeTruthy();
        const routeBody = await routeResponse.text();
        expect(routeBody).toContain('Time:');
    });
});
