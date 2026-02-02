import { test, expect, Page } from '@playwright/test';

test.describe('Tool Integration Verification (Timetable & Routing)', () => {

    async function dismissOnboarding(page: Page) {
        // Direct manipulation of stores to bypass onboarding efficiently
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
        });
        await page.waitForTimeout(500);
    }

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await dismissOnboarding(page);

        // Open chat panel
        const aiGuideBtn = page.locator('button[data-testid="open-ai-chat"]').first();
        if (await aiGuideBtn.isVisible()) {
            await aiGuideBtn.click({ force: true });
        }

        // Ensure chat input is ready
        await page.locator('input[data-testid="chat-input"], textarea[placeholder*="Type"]').first().waitFor({ state: 'visible' });
    });

    test('Scenario 1: Deep Research Routing (Weather Awareness)', async ({ page }) => {
        // 1. Submit a complex routing query that triggers Level 3 (Deep Research)
        const chatInput = page.getByPlaceholder(/Type a message|輸入訊息/);
        await chatInput.fill('我現在帶著兩件大行李，外面正在下大雨，我想從東京車站去新宿，請幫我規劃一條最不需要走路且能避雨的路線。');
        await chatInput.press('Enter');

        // 1. Verify Thinking Card (Planning Phase)
        // ThinkingPlanCard should show "Agent Strategy" or "Planning"
        await expect(page.locator('text=/Agent Strategy|Thinking|Planning/')).toBeVisible({ timeout: 15000 });

        // 2. Verify Tool Call (ADK Agent Specific)
        // We look for the "plan_route" tool name in the ThinkingPlanCard or activity log.
        // Also check for the "Calculating route with weather awareness" text which is in our tool description.
        await expect(page.locator('text=/plan_route|Calculating/i').first()).toBeVisible({ timeout: 60000 });

        // 3. Verify Route Result Card
        // The ADK agent tool returns a JSON with "summary" or "itinerary".
        // We expect the station names to be present on the screen.
        await expect(page.locator('text=/新宿|Shinjuku/')).toBeVisible({ timeout: 90000 });

        // 4. Verify Weather Advice
        // The tool should inject "☔ Rain detected" into the result
        await expect(page.locator('text=/Rain detected|☔/')).toBeVisible({ timeout: 60000 });
    });

    test('Scenario 2: Timetable Query Visualization', async ({ page }) => {
        const chatInput = page.locator('input[data-testid="chat-input"], textarea[placeholder*="Type"]').first();
        const sendButton = page.locator('button[type="submit"]').first();

        // Ask for timetable
        await chatInput.fill('我想看東京站銀座線的時刻表。');
        await sendButton.click();

        // Verify that a structured response or card is shown
        // We look for '時刻表' or station name + line combo
        await expect(page.locator('text=/東京|Ginza Line/i')).toBeVisible({ timeout: 45000 });

        // Verify we don't see raw JSON or "Internal Server Error"
        await expect(page.locator('text="Internal Server Error"')).not.toBeVisible();
    });

    test('Scenario 3: Real-time Status Check', async ({ page }) => {
        const chatInput = page.locator('input[data-testid="chat-input"], textarea[placeholder*="Type"]').first();
        const sendButton = page.locator('button[type="submit"]').first();

        // Ask for status
        await chatInput.fill('山手線現在有延誤嗎？');
        await sendButton.click();

        // 3. Verify Real-time Status Check
        // Even if no delays, it should say "operating normally" or similar
        await expect(page.locator('text=/山手線|Yamanote/')).toBeVisible({ timeout: 45000 });
        // FIXED: Removed invalid 'k' flag from regex
        await expect(page.locator('text=/Normal|Delay|運行|延誤/')).toBeVisible({ timeout: 45000 });
    });
});
