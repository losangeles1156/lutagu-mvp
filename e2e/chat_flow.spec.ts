import { test, expect, Page } from '@playwright/test';

test.describe('AI Chat Flow', () => {

    test.beforeEach(async ({ page }) => {
        // Grant geolocation to avoid prompt hanging the LoginPanel logic
        await page.context().grantPermissions(['geolocation']);
        await page.goto('/ja');

        // Graceful Login Bypass
        const loginOverlay = page.locator('.fixed.inset-0.z-\\[100\\]');
        const mainUiBtn = page.locator('button:has-text("LUTAGU AI")').first();

        // Wait longer for initial render (30s)
        try {
            await expect(loginOverlay.or(mainUiBtn)).toBeVisible({ timeout: 30000 });
        } catch (e) {
            console.log("Timeout waiting for initial UI state");
        }

        if (await loginOverlay.isVisible()) {
            const browseBtn = page.locator('button:has(svg.lucide-compass)').first();
            // If overlay wrapper is present, we MUST wait for the content to appear
            await expect(browseBtn).toBeVisible({ timeout: 15000 });
            await browseBtn.click();

            // Wait for overlay to be gone
            await expect(loginOverlay).not.toBeVisible({ timeout: 10000 });
        }
    });

    // Helper to mock streaming response (kept for reference or future use)
    async function mockChatStream(page: Page, responseChunks: string[]) {
        await page.route('**/api/agent/chat-phased', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'text/plain',
                body: responseChunks.join('')
            });
        });
    }

    // Test Scenario 1: Basic Chat Flow (Streaming)
    test('Scenario 1: Basic Chat Flow (Streaming)', async ({ page }) => {
        // 1. Mock the API response
        const mockResponse = '[THINKING]Searching for suggestions...[/THINKING]Hello! This is a **simulated** response.';
        await page.route('**/api/agent/chat-phased', async route => {
            await route.fulfill({ status: 200, contentType: 'text/plain', body: mockResponse });
        });

        // 2. Open Chat Panel
        const lutaguAiBtn = page.locator('button:has-text("LUTAGU AI")').first();
        await lutaguAiBtn.click();

        // Wait for Collapsed Panel to appear
        const maximizeIcon = page.locator('button:has(svg.lucide-maximize-2)').first();
        await expect(maximizeIcon).toBeVisible();
        await maximizeIcon.click();

        // 3. Verify Panel is open (Input should be visible)
        const chatInput = page.locator('input[placeholder*="何か聞いてください"], input[placeholder*="Ask"]');
        await expect(chatInput).toBeVisible();

        // 4. Type and Send Message
        await chatInput.fill('Test Message');
        const sendBtn = page.locator('button[type="submit"]');
        await sendBtn.click();

        // 5. Verify User Message appears
        await expect(page.locator('text=Test Message')).toBeVisible();

        // 6. Verify Assistant Message Content (including Markdown)
        const responseText = page.locator('text=simulated');
        await expect(responseText).toBeVisible();

        // 7. Verify Thinking Bubble (ensure tag is stripped)
        await expect(page.locator('text=[THINKING]')).not.toBeVisible();
    });

    // Test Scenario 2: Error Handling
    test('Scenario 2: Error Handling (Offline/API Failure)', async ({ page }) => {
        // 1. Mock API Failure
        await page.route('**/api/agent/chat-phased', async route => {
            await route.abort('failed'); // Simulate network failure
        });

        // 2. Open Chat
        const lutaguAiBtn = page.locator('button:has-text("LUTAGU AI")').first();
        await lutaguAiBtn.click();
        const maximizeIcon = page.locator('button:has(svg.lucide-maximize-2)').first();
        await maximizeIcon.click();

        // 3. Send Message
        const chatInput = page.locator('input[placeholder*="何か聞いてください"], input[placeholder*="Ask"]');
        await chatInput.fill('Error Test');
        await page.locator('button[type="submit"]').click();

        // 4. Verify Error State
        await expect(page.locator('text=現在AIサービスに接続できません')).toBeVisible({ timeout: 5000 });
    });

    // Test Scenario 3: UI State (Minimize/Expand)
    test('Scenario 3: UI State (Minimize/Expand)', async ({ page }) => {
        // 1. Open Chat
        const lutaguAiBtn = page.locator('button:has-text("LUTAGU AI")').first();
        await lutaguAiBtn.click();
        const maximizeIcon = page.locator('button:has(svg.lucide-maximize-2)').first();
        await maximizeIcon.click();

        // 2. Type something to have state
        const chatInput = page.locator('input[placeholder*="何か聞いてください"], input[placeholder*="Ask"]');
        await chatInput.fill('Draft Message');

        // 3. Minimize (Close/Collapse)
        const closeBtn = page.locator('button[aria-label="Close"], button:has(svg.lucide-x)'); // The X button in ChatHeader
        await closeBtn.first().click();

        // 4. Verify it collapsed (ChatPanel hidden, CollapsedPanel visible)
        await expect(chatInput).not.toBeVisible();
        await expect(maximizeIcon).toBeVisible();

        // 5. Re-open
        await maximizeIcon.first().click();

        // 6. Verify state input preserved or just visible
        await expect(chatInput).toBeVisible();
    });

});
