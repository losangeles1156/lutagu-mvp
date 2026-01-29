import { test, expect, Page } from '@playwright/test';

test.describe('AI Chat Flow', () => {

    test.beforeEach(async ({ page }) => {
        // Capture browser console logs
        page.on('console', msg => {
            console.log(`[BROWSER ${msg.type()}] ${msg.text()}`);
        });

        await page.context().grantPermissions(['geolocation']);
        await page.context().setGeolocation({ latitude: 35.6812, longitude: 139.7671 });

        await page.goto('/zh-TW');

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

        // Small wait for React to reflect changes
        await page.waitForTimeout(1000);

        const aiGuideBtn = page.locator('button[data-testid="open-ai-chat"]').first();
        await expect(aiGuideBtn).toBeVisible({ timeout: 20000 });
        console.log(`[TEST] AI Guide button is visible.`);
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

    const chatInputSelector = 'input[data-testid="chat-input"]';

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
                // If nothing works, try hitting Escape
                try {
                    await page.keyboard.press('Escape');
                } catch {
                    await onboardingDialog.click({ force: true, position: { x: 5, y: 5 } });
                }
            }
            await page.waitForTimeout(500);
        }
    }

    async function openChatAndGetInput(page: Page) {
        await dismissOnboarding(page);
        const aiBtn = page.locator('button[data-testid="open-ai-chat"]').first();
        console.log(`[TEST] AI button visible count: ${await aiBtn.count()}`);

        await page.evaluate(() => {
            const btn = document.querySelector('button[data-testid="open-ai-chat"]') as HTMLElement;
            if (btn) {
                const rect = btn.getBoundingClientRect();
                console.log(`[DEBUG] AI Button details:`, {
                    text: btn.innerText,
                    visible: btn.offsetWidth > 0,
                    rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                    zIndex: window.getComputedStyle(btn).zIndex
                });
            }
        });
        await page.screenshot({ path: 'test-results/before-ai-click.png' });
        await aiBtn.click({ force: true });
        console.log(`[TEST] AI button clicked.`);

        // Wait for UI to transition to fullscreen
        console.log(`[TEST] Waiting for fullscreen state...`);
        await page.waitForFunction(() => {
            return (window as any).__LUTAGU_UI_STATE__?.getState()?.uiState === 'fullscreen';
        }, { timeout: 10000 });
        console.log(`[TEST] Fullscreen state reached.`);

        await dismissOnboarding(page);

        const chatInput = page.locator(chatInputSelector);
        console.log(`[TEST] Checking for chat input...`);

        if (!await chatInput.isVisible()) {
            console.log(`[TEST] Chat input not visible, checking for maximize icon...`);
            const maximizeIcon = page.locator('button:has(svg.lucide-maximize-2)').first();
            if (await maximizeIcon.isVisible()) {
                console.log(`[TEST] Maximize icon found, clicking...`);
                await maximizeIcon.click();
            }
        }

        await chatInput.waitFor({ state: 'visible', timeout: 10000 });
        console.log(`[TEST] Chat input is visible.`);
        return chatInput;
    }

    // Test Scenario 1: Basic Chat Flow (Streaming)
    test('Scenario 1: Basic Chat Flow (Streaming)', async ({ page }) => {
        // 1. Mock the API response
        const mockResponse = '[THINKING]Searching for suggestions...[/THINKING]Hello! This is a **simulated** response.';
        await page.route('**/api/agent/v2', async route => {
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
        await expect(page.locator('[data-testid="chat-message-text"]').first()).toContainText('Test Message');

        // 6. Verify Assistant Message Content (including Markdown)
        await expect(page.locator('[data-testid="chat-message-text"]').last()).toContainText('simulated');

        // 7. Verify Thinking Bubble (ensure tag is stripped)
        await expect(page.locator('text=[THINKING]')).not.toBeVisible();
    });

    // Test Scenario 2: Error Handling
    test('Scenario 2: Error Handling (Offline/API Failure)', async ({ page }) => {
        // 1. Mock API Failure
        await page.route('**/api/agent/v2', async route => {
            await route.abort('failed'); // Simulate network failure
        });

        const chatInput = await openChatAndGetInput(page);

        // 3. Send Message
        await chatInput.fill('Error Test');
        await page.locator('button[type="submit"]').click({ force: true });

        // 4. Verify Error State
        // "現在AIサービスに接続できません" -> zh-TW "無法連接" or similar
        // Let's use a regex or check common.retry
        // "現在AIサービスに接続できません" -> zh-TW "發生錯誤" or "連線錯誤"
        await expect(page.locator('text=/發生錯誤|連線錯誤|服務暫時不可用|Connection failed/')).toBeVisible({ timeout: 10000 });
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
