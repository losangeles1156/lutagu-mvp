import { test, expect } from '@playwright/test';

test.describe('L4 Station Assistant (Shinjuku) E2E Verification', () => {
    test.beforeEach(async ({ page }) => {
        // 1. Grant permissions and set geolocation
        await page.context().grantPermissions(['geolocation']);
        await page.context().setGeolocation({ latitude: 35.6812, longitude: 139.7671 });

        // 2. Add Init Script to bypass onboarding/login globally
        await page.addInitScript(() => {
            // This runs before any other script on the page
            (window as any).__LUTAGU_BYPASS_INIT__ = true;

            // We can also try to seed localStorage if the store uses it
            localStorage.setItem('user-storage', JSON.stringify({
                state: { onboardingSeenVersion: 1 },
                version: 0
            }));

            // Listen for store created events if app emits them, 
            // or we'll just handle it in the test scenarios after goto.
        });
    });

    test('Scenario 1 & 2: Navigation to L4 and Starting Chat', async ({ page }) => {
        // 1. Navigate directly to Shinjuku station L4 tab
        await page.goto('/zh-TW/?node=odpt:Station:JR-East.Shinjuku&sheet=1&tab=lutagu');

        // 2. Ensure UI State is transitioned
        await page.evaluate(() => {
            const uiState = (window as any).__LUTAGU_UI_STATE__;
            if (uiState) uiState.getState().transitionTo('collapsed_desktop');
        });

        // 3. Verify L4 Dashboard content
        await expect(page.getByText('AI 感知中')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('避坑指南')).toBeVisible();
        await expect(page.getByText('專業攻略')).toBeVisible();

        // 4. Start Chat
        const startChatBtn = page.getByRole('button', { name: '開始與 AI 助手對話' });
        await expect(startChatBtn).toBeVisible();
        await startChatBtn.click();

        // 4. Verify L4 Chat initialized
        const chatHeader = page.getByText(/(新宿|Shinjuku) · LUTAGU/);
        await expect(chatHeader).toBeVisible();

        // Initial welcome message 
        await expect(page.locator('.bg-white').first()).toBeVisible();

        // Suggested questions should be visible
        await expect(page.getByText('建議問題')).toBeVisible();
    });

    test('Scenario 3: Deep Q&A Verification', async ({ page }) => {
        // 1. Navigate directly
        await page.goto('/zh-TW/?node=odpt:Station:JR-East.Shinjuku&sheet=1&tab=lutagu');

        // Ensure UI State is transitioned
        await page.evaluate(() => {
            const uiState = (window as any).__LUTAGU_UI_STATE__;
            if (uiState) uiState.getState().transitionTo('collapsed_desktop');
        });

        await page.getByRole('button', { name: '開始與 AI 助手對話' }).click();

        // Type a question about lockers
        const chatInput = page.getByPlaceholder('輸入訊息...');
        await chatInput.fill('新宿車站有寄物櫃嗎？');
        await page.keyboard.press('Enter');

        // Verify thinking state
        await expect(page.getByText(/分析|讀取|查詢/)).toBeVisible();

        // Wait for response - it should contain "寄物櫃" or related info
        // Increase timeout for AI response
        const aiResponse = page.locator('.bg-white').filter({ hasText: /寄物櫃|行李|出口/ }).last();
        await expect(aiResponse).toBeVisible({ timeout: 30000 });

        // Verify action cards if any (optional but good)
        // const actionCard = page.locator('button', { hasText: /查看|前往|詳情/ });
        // if (await actionCard.isVisible()) {
        //    console.log('Action card found');
        // }
    });

    test('Scenario 4: Window Controls & Reset', async ({ page }) => {
        // 1. Navigate directly
        await page.goto('/zh-TW/?node=odpt:Station:JR-East.Shinjuku&sheet=1&tab=lutagu');

        // Ensure UI State is transitioned
        await page.evaluate(() => {
            const uiState = (window as any).__LUTAGU_UI_STATE__;
            if (uiState) uiState.getState().transitionTo('collapsed_desktop');
        });

        await page.getByRole('button', { name: '開始與 AI 助手對話' }).click();

        // 2. Test Minimize
        const minimizeBtn = page.getByTitle('最小化');
        await minimizeBtn.click();
        await expect(page.getByText(/(新宿|Shinjuku) · LUTAGU/)).not.toBeVisible();

        // 3. Test Maximize (By re-opening or clicking maximize if available)
        await page.goto('/zh-TW/?node=odpt:Station:JR-East.Shinjuku&sheet=1&tab=lutagu');

        // Ensure UI State is transitioned
        await page.evaluate(() => {
            const uiState = (window as any).__LUTAGU_UI_STATE__;
            if (uiState) uiState.getState().transitionTo('collapsed_desktop');
        });

        await page.getByRole('button', { name: '開始與 AI 助手對話' }).click();

        // 4. Test Reset
        const resetBtn = page.getByTitle('重新開始對話');

        // Handle browser confirm dialog BEFORE clicking
        page.once('dialog', dialog => dialog.accept());
        await resetBtn.click({ force: true });

        // Re-verify welcome state
        await expect(page.getByText('建議問題')).toBeVisible();
    });
});
