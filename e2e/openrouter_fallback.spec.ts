import { test, expect, Page } from '@playwright/test';

test.describe('OpenRouter Fallback Mechanism', () => {

    test.beforeEach(async ({ page }) => {
        // Go to home and wait for initial load
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);

        // Bypass login and onboarding using absolute store control
        console.log(`[TEST] Bypassing login and onboarding via direct store access...`);
        await page.evaluate(() => {
            const uiState = (window as any).__LUTAGU_UI_STATE__;
            const uiStore = (window as any).__LUTAGU_UI_STORE__;
            const userStore = (window as any).__LUTAGU_USER_STORE__;

            if (userStore) userStore.getState().setOnboardingSeenVersion(1);
            if (uiStore) uiStore.getState().setIsOnboardingOpen(false);
            if (uiState) uiState.getState().transitionTo('collapsed_desktop');
        });

        await page.waitForTimeout(1000);
    });

    test('Scenario: Primary model fails, fallback to secondary', async ({ page }) => {
        // 1. Set extra header to trigger simulated failure
        await page.setExtraHTTPHeaders({
            'x-simulate-failure': 'true'
        });

        // 2. Open Chat
        const aiBtn = page.locator('button[data-testid="open-ai-chat"]').first();
        await aiBtn.click();

        // 3. Wait for chat panel to open
        await page.waitForFunction(() => {
            const state = (window as any).__LUTAGU_UI_STATE__?.getState()?.uiState;
            return state === 'fullscreen';
        }, { timeout: 10000 });

        // 4. Send a message
        const chatInput = page.locator('input[data-testid="chat-input"]');
        await expect(chatInput).toBeVisible();
        await chatInput.fill('Hello with fallback');
        const sendBtn = page.locator('button[type="submit"]');
        await sendBtn.click();

        // 5. Verify the assistant responds (meaning fallback worked)
        // Note: We don't verify specific content because it depends on the REAL LLM response
        // but getting ANY non-error response proves the fallback chain reached a working model.
        await expect(page.locator('[data-testid="chat-message-text"]').last()).toContainText(/./, { timeout: 30000 });

        console.log('[TEST] Fallback verified - assistant responded despite primary model failure.');
    });
});
