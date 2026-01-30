import { test, expect } from '@playwright/test';

test.describe('ADK Agent Mock Test', () => {
    test('Mock Stream Test', async ({ page }) => {
        // Capture browser console for debugging
        page.on('console', msg => {
            console.log(`[BROWSER ${msg.type()}] ${msg.text()}`);
        });

        await page.goto('/en');
        await page.waitForLoadState('domcontentloaded');

        // Bypass onboarding
        await page.evaluate(() => {
            const userStore = (window as any).__LUTAGU_USER_STORE__;
            const uiStore = (window as any).__LUTAGU_UI_STORE__;
            const uiState = (window as any).__LUTAGU_UI_STATE__;
            if (userStore) userStore.getState().setOnboardingSeenVersion(1);
            if (uiStore) uiStore.getState().setIsOnboardingOpen(false);
            if (uiState) uiState.getState().transitionTo('collapsed_desktop');
        });

        await page.waitForTimeout(1000);

        // Open chat
        await page.locator('button[data-testid="open-ai-chat"]').first().click({ force: true });

        const chatInput = page.locator('input[data-testid="chat-input"]');
        await chatInput.waitFor({ state: 'visible' });

        // Submit message with MOCK keyword
        await chatInput.fill('MOCK request');
        await page.locator('button[type="submit"]').click({ force: true });

        // Wait for response
        const chatMessages = page.locator('[data-testid="chat-message-text"]');

        // Wait for reasoning bubble or the final content
        // In useAgentChat, [THINKING] is extracted to thinkingStep
        const thinkingBubble = page.locator('text=/Mock analysis/i');
        await expect(thinkingBubble).toBeVisible({ timeout: 10000 });

        // Wait for the final text content
        await expect(chatMessages.last()).toContainText('渋谷への行き方は簡単です', { timeout: 10000 });
    });
});
