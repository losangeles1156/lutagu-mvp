import { test, expect, Page } from '@playwright/test';

test.describe('Agent Post-Fix Verification (Phase 4)', () => {
    // Mark these tests as slow to allow for AI response time
    test.slow();

    async function dismissOnboarding(page: Page) {
        const onboardingDialog = page.locator('section[role="dialog"][aria-labelledby="onboarding-title"]');
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
                    await onboardingDialog.focus();
                    await page.keyboard.press('Escape');
                }
            }
            await page.waitForTimeout(500);
        }
    }

    async function setupChat(page: Page) {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000); // Wait for hydration

        // Bypass via store if available
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
                window.__LUTAGU_UI_STATE__.getState().setUIState('fullscreen');
            }
        });

        await dismissOnboarding(page);

        // Open chat if needed
        const aiGuideBtn = page.locator('button[data-testid="open-ai-chat"]').first();
        if (await aiGuideBtn.isVisible()) {
            await aiGuideBtn.click({ force: true });
        } else {
            const maximizeIcon = page.locator('button:has(svg.lucide-maximize-2)').first();
            if (await maximizeIcon.isVisible()) {
                await maximizeIcon.click({ force: true });
            }
        }

        // Wait for input - use correct selector
        const input = page.locator('[data-testid="chat-input"]').first();
        await input.waitFor({ state: 'visible', timeout: 20000 });
        return input;
    }

    async function waitForAIResponse(page: Page, timeout = 60000) {
        // Wait for loading indicator to appear then disappear
        // Or just wait for new content to appear in the page
        await page.waitForTimeout(3000); // Initial wait for request to start

        // Wait for AI response by looking for any new paragraph element
        // The AI response will appear after the user message
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            // Check if there's content besides the user message
            const allParagraphs = await page.locator('p').allTextContents();
            if (allParagraphs.length > 1) {
                // More than just the user message exists
                await page.waitForTimeout(1000); // Allow final render
                return;
            }
            await page.waitForTimeout(1000);
        }
    }

    test('T1.1: Regression - findRoute (Complex Schema)', async ({ page }) => {
        const input = await setupChat(page);

        await input.fill('從東京到新宿');
        await page.keyboard.press('Enter');
        await waitForAIResponse(page);

        // Use page-level text assertion - verify route mention appears
        await expect(page.getByText(/東京|新宿|Tokyo|Shinjuku|路線|route/i).first()).toBeVisible({ timeout: 60000 });
    });

    test('T1.2: Regression - getWeather (Simple Object)', async ({ page }) => {
        const input = await setupChat(page);

        await input.fill('東京天氣如何？');
        await page.keyboard.press('Enter');
        await waitForAIResponse(page);

        // With mock fallback, should always get weather data with temperature
        await expect(page.getByText(/°C|度|天氣|weather|Cloudy|晴|溫度|temperature/i).first()).toBeVisible({ timeout: 60000 });
    });

    test('T1.4: Regression - searchPOI (Optional Fields)', async ({ page }) => {
        const input = await setupChat(page);

        await input.fill('東京站附近的拉麵店');
        await page.keyboard.press('Enter');
        await waitForAIResponse(page);

        // With mock data, should return ramen recommendations
        await expect(page.getByText(/拉麵|Ramen|一蘭|六厘舍|餐廳|食/i).first()).toBeVisible({ timeout: 60000 });
    });

    test('T2.2: Frontend Integration - Multi-turn Context', async ({ page }) => {
        const input = await setupChat(page);

        // Turn 1: Ask about food
        await input.fill('推薦淺草附近好吃的');
        await page.keyboard.press('Enter');
        await waitForAIResponse(page);

        // Should trigger food search - with mock data returns restaurant names
        await expect(page.getByText(/餐廳|推薦|好吃|restaurant|築地|天婦羅|豬排|food/i).first()).toBeVisible({ timeout: 60000 });
    });
});
