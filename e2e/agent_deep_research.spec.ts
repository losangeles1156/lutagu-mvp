import { test, expect, Page } from '@playwright/test';

test.describe('Agent 2.0 Deep Research Verification', () => {

    async function dismissOnboarding(page: Page) {
        const onboardingDialog = page.locator('section[role="dialog"][aria-labelledby="onboarding-title"]');
        // Try up to 3 times to verify it's gone
        for (let attempt = 0; attempt < 3; attempt += 1) {
            if (!await onboardingDialog.isVisible()) {
                return;
            }
            console.log(`[TEST] Dismissing onboarding modal, attempt ${attempt + 1}...`);
            const skipBtn = onboardingDialog.locator('[data-testid="onboarding-browse-btn"]').first();
            const legacySkipBtn = onboardingDialog.locator('button', { hasText: /先逛逛|跳過導覽|開始|Skip|下一步|Next|完成|Finish/i }).first();
            const closeBtn = onboardingDialog.locator('button[aria-label*="Close"], button[aria-label*="關閉"], button:has(svg.lucide-x)').first();

            if (await skipBtn.isVisible()) {
                await skipBtn.click({ force: true });
            } else if (await legacySkipBtn.isVisible()) {
                await legacySkipBtn.click({ force: true });
            } else if (await closeBtn.isVisible()) {
                await closeBtn.click({ force: true });
            } else {
                try {
                    await page.keyboard.press('Escape');
                } catch {
                    await onboardingDialog.click({ force: true, position: { x: 5, y: 5 } });
                }
            }
            await page.waitForTimeout(500);
        }
    }

    test.beforeEach(async ({ page }) => {
        // 1. Navigate first
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500); // Wait for hydration

        // 2. Bypass Stores via evaluate (client-side)
        await page.evaluate(() => {
            // @ts-ignore
            if (window.__LUTAGU_USER_STORE__) {
                // @ts-ignore
                window.__LUTAGU_USER_STORE__.getState().setOnboardingSeenVersion(1);
            }
            // @ts-ignore
            if (window.__LUTAGU_UI_STORE__) {
                // @ts-ignore
                window.__LUTAGU_UI_STORE__.getState().setIsOnboardingOpen(false);
            }
            // @ts-ignore
            if (window.__LUTAGU_UI_STATE__) {
                // @ts-ignore
                window.__LUTAGU_UI_STATE__.getState().transitionTo('collapsed_desktop');
            }
        });

        await page.waitForTimeout(500);
        await dismissOnboarding(page);

        // Open chat panel if closed
        // Use exact check like chat_flow.spec.ts
        const aiGuideBtn = page.locator('button[data-testid="open-ai-chat"]').first();
        if (await aiGuideBtn.isVisible()) {
            await aiGuideBtn.click({ force: true });
        } else {
            // Fallback for maximize button if already open/minimized
            const maximizeIcon = page.locator('button:has(svg.lucide-maximize-2)').first();
            if (await maximizeIcon.isVisible()) {
                await maximizeIcon.click({ force: true });
            }
        }

        // Ensure chat input is visible
        await page.locator('input[data-testid="chat-input"], textarea[placeholder*="Type"]').first().waitFor({ state: 'visible', timeout: 10000 });
    });

    test('Scenario 1: [PLAN] UI Visualization', async ({ page }) => {
        // Mock the API response to force a PLAN tag output
        await page.route('/api/agent/v2', async route => {
            const body = await route.request().postDataJSON();

            const planJson = JSON.stringify({
                id: "test-plan-1",
                title: "Researching Tokyo Itinerary",
                items: [
                    { id: "1", content: "Analyze Request", status: "completed" },
                    { id: "2", content: "Search for Attractions", status: "in_progress", activeForm: "Searching Ueno Park..." },
                    { id: "3", content: "Generate Final Plan", status: "pending" }
                ],
                locale: "en",
                updatedAt: new Date().toISOString()
            });

            const fullResponse = `[PLAN]${planJson}[/PLAN]\nHere is the plan I am working on.`;

            await route.fulfill({
                status: 200,
                contentType: 'text/plain; charset=utf-8',
                body: fullResponse
            });
        });

        // Send a message
        // Use generic selector for input as it might be input or textarea
        const input = page.locator('input[data-testid="chat-input"], textarea[placeholder*="Type"]').first();
        await input.fill('Plan a 3-day trip');

        const sendBtn = page.locator('button[type="submit"]');
        await sendBtn.click({ force: true });

        // Verify Plan Card is visible
        // ThinkingPlanCard renders "Agent Strategy" in the header
        await expect(page.locator('text="Agent Strategy"')).toBeVisible({ timeout: 10000 });
        // Verify Plan Title
        await expect(page.locator('text="Researching Tokyo Itinerary"')).toBeVisible();
        // Verify Plan Items
        await expect(page.locator('text="Analyze Request"')).toBeVisible();
    });

    test('Scenario 2: Tool Calculation & Result Rendering (Real API)', async ({ page }) => {

        // Skip if no API key in CI (this likely won't run in your current env properly without user interaction)
        if (!process.env.ZEABUR_API_KEY && !process.env.OPENROUTER_API_KEY) {
            test.skip(true, 'Skipping live test due to missing API keys');
            return;
        }

        const input = page.locator('input[data-testid="chat-input"], textarea[placeholder*="Type"]').first();
        // Use a query that definitely triggers "findRoute"
        await input.fill('Go to Shinjuku from Tokyo Station');
        const sendBtn = page.locator('button[type="submit"]');
        await sendBtn.click({ force: true });


        // Verify textual response (Generic check since real response varies)
        // We expect some text response
        const messageText = page.locator('[data-testid="chat-message-text"]').last();
        await expect(messageText).toBeVisible({ timeout: 45000 });

        // Verify AI Reasoning / Route Card
        // If the System Prompt works, we should see a structured card.
        // RouteResultCard usually contains time or cost info.
        // We look for common route elements like "¥" (fare) or "min" (duration) 
        // or the specific data-testid if available.
        // Ideally, check for `data-testid="agentic-response-card"` or `data-testid="route-result-card"`
        // Since we don't have exact testids in the artifact for specific cards, we rely on text heuristics common in Tokyo transit.
        // '分' (minutes), '円' (yen), or 'min', '¥'
        await expect(page.locator('text=/分|min|円|¥/')).toBeVisible({ timeout: 60000 });
    });



    test('Scenario 3: Live Subagent Integration (Deep Research)', async ({ page }) => {
        // Live test to verify Zeabur/OpenRouter connectivity
        // Skip if no API key in CI (this likely won't run in your current env properly without user interaction)
        if (!process.env.ZEABUR_API_KEY && !process.env.OPENROUTER_API_KEY) {
            test.skip(true, 'Skipping live test due to missing API keys');
            return;
        }

        const input = page.locator('input[data-testid="chat-input"], textarea[placeholder*="Type"]').first();
        await input.fill('Research the history of Edo Castle and list 3 facts.');
        const sendBtn = page.locator('button[type="submit"]');
        await sendBtn.click({ force: true });

        // Wait for a longer timeout for Deep Research
        await expect(page.locator('text="Edo Castle"')).toBeVisible({ timeout: 45000 });
    });

});
