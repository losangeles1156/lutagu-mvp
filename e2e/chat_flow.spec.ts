import { test, expect, Page } from '@playwright/test';

test.describe('AI Chat Flow', () => {

    test.beforeEach(async ({ page }) => {
        await page.context().grantPermissions(['geolocation']);
        await page.context().setGeolocation({ latitude: 35.6812, longitude: 139.7671 });

        await page.goto('/zh-TW');

        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        await page.addStyleTag({ content: 'section[role="dialog"][aria-labelledby="onboarding-title"]{display:none !important;}' });

        // Find the "先逛逛" button using text matching
        const browseBtn = page.locator('button', { hasText: '先逛逛' }).first();

        // If we're on the login page, click "先逛逛" to bypass
        if (await browseBtn.count() > 0 && await browseBtn.isVisible()) {
            // Use force:true to click through any overlays
            await browseBtn.click({ force: true });
            await page.waitForTimeout(2000); // Give it time to transition
        }

        await dismissOnboarding(page);

        const aiGuideBtn = page.getByRole('button', { name: /開啟對話|Open Chat/i }).first();
        await expect(aiGuideBtn).toBeVisible({ timeout: 20000 });
    });

    // Helper to mock streaming response
    async function mockChatStream(page: Page, responseChunks: string[]) {
        await page.route('**/api/agent/chat', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'text/plain',
                body: responseChunks.join('')
            });
        });
    }

    const chatInputSelector = 'input[placeholder*="想去哪裡"], input[placeholder*="Ask"], input[placeholder*="LUTAGU"], input[placeholder*="輸入訊息"], input[placeholder*="問 LUTAGU"]';

    async function dismissOnboarding(page: Page) {
        const onboardingDialog = page.locator('section[role="dialog"][aria-labelledby="onboarding-title"]');
        for (let attempt = 0; attempt < 3; attempt += 1) {
            if (!await onboardingDialog.isVisible()) {
                return;
            }
            const skipBtn = onboardingDialog.locator('button', { hasText: /先逛逛|跳過導覽|開始|Skip|下一步|Next|完成|Finish/i }).first();
            const closeBtn = onboardingDialog.locator('button[aria-label*="Close"], button[aria-label*="關閉"], button:has(svg.lucide-x)').first();
            if (await skipBtn.isVisible()) {
                await skipBtn.click({ force: true });
            } else if (await closeBtn.isVisible()) {
                await closeBtn.click({ force: true });
            } else {
                try {
                    await page.keyboard.press('Escape');
                } catch {
                    await onboardingDialog.click({ force: true });
                }
            }
            await page.waitForTimeout(500);
        }
    }

    async function openChatAndGetInput(page: Page) {
        await dismissOnboarding(page);
        const aiBtn = page.getByRole('button', { name: /開啟對話|Open Chat|AI 助手|AI Assistant|LUTAGU AI/i });
        await aiBtn.click({ force: true });
        await dismissOnboarding(page);
        const chatInput = page.locator(chatInputSelector);
        if (!await chatInput.isVisible()) {
            const maximizeIcon = page.locator('button:has(svg.lucide-maximize-2)').first();
            if (await maximizeIcon.isVisible()) {
                await maximizeIcon.click();
            }
        }
        if (!await chatInput.isVisible()) {
            const expandBtn = page.locator('button[aria-label*="Expand"], button[aria-label*="展開"], button[aria-label*="展开"], button[aria-label*="Expand chat panel"], button:has-text("AI Assistant")').first();
            if (await expandBtn.isVisible()) {
                await expandBtn.click();
            }
        }
        await chatInput.waitFor({ state: 'visible', timeout: 10000 });
        return chatInput;
    }

    // Test Scenario 1: Basic Chat Flow (Streaming)
    test('Scenario 1: Basic Chat Flow (Streaming)', async ({ page }) => {
        // 1. Mock the API response
        const mockResponse = '[THINKING]Searching for suggestions...[/THINKING]Hello! This is a **simulated** response.';
        await page.route('**/api/agent/chat', async route => {
            await route.fulfill({ status: 200, contentType: 'text/plain', body: mockResponse });
        });

        const chatInput = await openChatAndGetInput(page);

        // 3. Verify Panel is open (Input should be visible)
        await expect(chatInput).toBeVisible();

        // 4. Type and Send Message
        await chatInput.fill('Test Message');
        const sendBtn = page.locator('button[type="submit"]');
        await sendBtn.click({ force: true });

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
        await page.route('**/api/agent/chat', async route => {
            await route.abort('failed'); // Simulate network failure
        });

        const chatInput = await openChatAndGetInput(page);

        // 3. Send Message
        await chatInput.fill('Error Test');
        await page.locator('button[type="submit"]').click({ force: true });

        // 4. Verify Error State
        // "現在AIサービスに接続できません" -> zh-TW "無法連接" or similar
        // Let's use a regex or check common.retry
        await expect(page.locator('text=/無法連接|Connection failed|接続できません/')).toBeVisible({ timeout: 5000 });
    });

    // Test Scenario 3: UI State (Minimize/Expand)
    test('Scenario 3: UI State (Minimize/Expand)', async ({ page }) => {
        const chatInput = await openChatAndGetInput(page);

        // 2. Type something to have state
        await chatInput.fill('Draft Message');

        // 3. Minimize (Close/Collapse)
        const minimizeBtn = page.locator('button[aria-label="Minimize Chat"], button[aria-label*="Minimize"], button[aria-label*="最小化"]').first();
        await minimizeBtn.click({ force: true });

        await expect(chatInput).not.toBeVisible();

        const reopenBtn = page.locator('button', { hasText: /Open Chat/i }).first();
        await reopenBtn.click({ force: true });

        // 6. Verify state input preserved or just visible
        const restoredInput = page.locator(chatInputSelector);
        await expect(restoredInput).toBeVisible();
    });

    test('Scenario 4: Ginza Line delay regression', async ({ page }) => {
        const chatInput = await openChatAndGetInput(page);

        await chatInput.fill('銀座線現在有延誤嗎？');
        await page.locator('button[type="submit"]').click({ force: true });

        const chatPanel = page.locator('div').filter({ has: page.locator('button[aria-label="Minimize Chat"]') }).first();
        const chatMessages = chatPanel.locator('div.flex-1.overflow-y-auto').first();
        await expect(chatMessages.locator('text=/延誤|運行|delay|遅れ/i')).toBeVisible({ timeout: 30000 });
        await expect(chatMessages.locator('text=/置物櫃|locker|行李寄放|荷物/i')).toHaveCount(0);
        await expect(chatMessages.locator('text=/系統暫時忙碌|system is busy|システムが混み合っております/i')).toHaveCount(0);
    });

    test('Scenario 5: Free-form query returns non-busy response', async ({ page }) => {
        const chatInput = await openChatAndGetInput(page);

        await chatInput.fill('附近有推薦的拉麵嗎？');
        await page.locator('button[type="submit"]').click({ force: true });

        const chatPanel = page.locator('div').filter({ has: page.locator('button[aria-label="Minimize Chat"]') }).first();
        const chatMessages = chatPanel.locator('div.flex-1.overflow-y-auto').first();
        await expect(chatMessages.locator('text=/推薦|拉麵|restaurant|cafe|壽司/i')).toBeVisible({ timeout: 30000 });
        await expect(chatMessages.locator('text=/系統暫時忙碌|system is busy|システムが混み合っております/i')).toHaveCount(0);
    });

});
