import { test, expect, Page } from '@playwright/test';

test.describe('AI Chat Flow', () => {

    test.beforeEach(async ({ page }) => {
        await page.context().grantPermissions(['geolocation']);

        // Determinstic Login Bypass via LocalStorage Injection
        // We inject a dummy message to force initializeUIState() to switch to collapsed mode immediately
        // This avoids waiting for the LoginPanel UI to load
        const state = {
            state: {
                messages: [{
                    id: 'init-bypass',
                    role: 'assistant',
                    content: 'Welcome',
                    timestamp: Date.now()
                }],
                sessionStartTime: Date.now(),
                version: 0
            },
            version: 0
        };

        await page.addInitScript((storage) => {
            window.localStorage.setItem('lutagu-ui-state', JSON.stringify(storage));
        }, state);

        await page.goto('/zh-TW');

        // Wait for main UI to be visible
        // The floating "Open Chat" button (BottomNavBar)
        // In zh-TW it says "智能嚮導" (Smart Guide), not "LUTAGU AI"
        const lutaguAiBtn = page.locator('button').filter({ hasText: /智能嚮導|Smart Guide|LUTAGU AI/ }).first();
        await expect(lutaguAiBtn).toBeVisible({ timeout: 30000 });
    });

    // Helper to mock streaming response
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
        const lutaguAiBtn = page.locator('button').filter({ hasText: /智能嚮導|Smart Guide|LUTAGU AI/ }).first();
        await lutaguAiBtn.click();

        // Wait for Chat Panel Header "LUTAGU AI" to confirm it opened
        await expect(page.locator('h2:has-text("LUTAGU AI")')).toBeVisible();

        // If in collapsed mode (desktop/mobile initial), maximize might be needed?
        // But transitionTo('fullscreen') in BottomNavBar should open it fully.
        // Let's check if we need to click maximize.
        // The previous test logic assumed "collapsed" first.
        // If MainLayout renders 'fullscreen', ChatOverlay is visible.
        // If it renders 'collapsed', ChatCollapsedPanel is visible.

        // Check if maximized (Input visible)
        const chatInput = page.locator('input[placeholder*="想去哪裡"], input[placeholder*="Ask"]');

        if (!await chatInput.isVisible()) {
            const maximizeIcon = page.locator('button:has(svg.lucide-maximize-2)').first();
            if (await maximizeIcon.isVisible()) {
                await maximizeIcon.click();
            }
        }

        // 3. Verify Panel is open (Input should be visible)
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
        const lutaguAiBtn = page.locator('button').filter({ hasText: /智能嚮導|Smart Guide|LUTAGU AI/ }).first();
        await lutaguAiBtn.click();

        // Check maximize if needed
        const chatInput = page.locator('input[placeholder*="想去哪裡"], input[placeholder*="Ask"]');
        if (!await chatInput.isVisible()) {
            const maximizeIcon = page.locator('button:has(svg.lucide-maximize-2)').first();
            if (await maximizeIcon.isVisible()) {
                await maximizeIcon.click();
            }
        }

        // 3. Send Message
        await chatInput.fill('Error Test');
        await page.locator('button[type="submit"]').click();

        // 4. Verify Error State
        // "現在AIサービスに接続できません" -> zh-TW "無法連接" or similar
        // Let's use a regex or check common.retry
        await expect(page.locator('text=/無法連接|Connection failed|接続できません/')).toBeVisible({ timeout: 5000 });
    });

    // Test Scenario 3: UI State (Minimize/Expand)
    test('Scenario 3: UI State (Minimize/Expand)', async ({ page }) => {
        // 1. Open Chat
        const lutaguAiBtn = page.locator('button').filter({ hasText: /智能嚮導|Smart Guide|LUTAGU AI/ }).first();
        await lutaguAiBtn.click();

        // Define locators
        const maximizeIcon = page.locator('button:has(svg.lucide-maximize-2)').first();
        const chatInput = page.locator('input[placeholder*="想去哪裡"], input[placeholder*="Ask"]');

        // Ensure Input Visible (via maximize if needed)
        if (!await chatInput.isVisible()) {
            if (await maximizeIcon.isVisible()) {
                await maximizeIcon.click();
            }
        }

        // 2. Type something to have state
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
