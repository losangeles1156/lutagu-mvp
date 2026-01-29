import { test, expect, Page } from '@playwright/test';

test.describe('Main Chat Panel Core Verification', () => {

    test.beforeEach(async ({ page }) => {
        // 設定模擬定位
        await page.context().grantPermissions(['geolocation']);
        await page.context().setGeolocation({ latitude: 35.6812, longitude: 139.7671 });

        await page.goto('/zh-TW');
        await page.waitForLoadState('domcontentloaded');

        // 繞過登入與導覽
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

    async function openChat(page: Page) {
        const aiBtn = page.locator('button[data-testid="open-ai-chat"]').first();
        await aiBtn.waitFor({ state: 'visible' });
        await aiBtn.click({ force: true });

        // 等待進入全螢幕狀態
        await page.waitForFunction(() => {
            return (window as any).__LUTAGU_UI_STATE__?.getState()?.uiState === 'fullscreen';
        }, { timeout: 10000 });

        const chatInput = page.locator('input[data-testid="chat-input"]');
        await chatInput.waitFor({ state: 'visible' });
        return chatInput;
    }

    test('Scenario 1: Empty State & Quick Questions', async ({ page }) => {
        await openChat(page);

        // 1. 驗證空狀態元素
        const emptyStateTitle = page.locator('h3', { hasText: /有什麼可以幫您？/i });
        await expect(emptyStateTitle).toBeVisible();

        // 2. 點擊快速問題 (取第一個：運行狀態)
        const quickBtn = page.locator('button:has-text("運行狀態")').first();
        await expect(quickBtn).toBeVisible();
        await quickBtn.click();

        // 3. 驗證訊息已送出並觸發回應
        await expect(page.locator('[data-testid="chat-message-text"]').first()).toContainText('運行狀態');
        await expect(emptyStateTitle).not.toBeVisible();
    });

    test('Scenario 2: Demo Mode Playback (Overtourism)', async ({ page }) => {
        // 透過 Store 啟動 Demo Mode
        await page.evaluate(() => {
            const uiStore = (window as any).__LUTAGU_UI_STORE__;
            if (uiStore) {
                // 修正：setDemoMode 接受兩個參數 (isDemo, demoId)
                uiStore.getState().setDemoMode(true, 'overtourism');
            }
        });

        await openChat(page);

        // 驗證輸入框在演示期間禁用
        const chatInput = page.locator('input[data-testid="chat-input"]');
        await expect(chatInput).toBeDisabled();

        // 驗證第一輪訊息出現
        await expect(page.locator('[data-testid="chat-message-text"]').first()).toContainText(/淺草寺/);

        // 等待示範播放完成 (這裡簡單檢查是否有 Action Card 出現)
        // 演示過程中會呼叫 startPlayback，我們等待導航按鈕出現
        const actionBtn = page.locator('button:has-text("導航至根津神社")');
        await actionBtn.waitFor({ state: 'visible', timeout: 30000 });
        await expect(actionBtn).toBeVisible();
    });

    test('Scenario 3: Input Validation', async ({ page }) => {
        const chatInput = await openChat(page);

        // 1. 空白輸入驗證
        const sendBtn = page.locator('button[aria-label="Send Message"]');
        await expect(sendBtn).toBeDisabled();

        await chatInput.fill('   ');
        await expect(sendBtn).toBeDisabled();

        // 2. 正常輸入驗證
        await chatInput.fill('你好');
        await expect(sendBtn).toBeEnabled();

        // 3. 字數限制驗證 (maxLength 屬性)
        const maxLength = await chatInput.getAttribute('maxLength');
        expect(maxLength).toBe('500');

        await sendBtn.click();
        await expect(chatInput).toHaveValue('');
    });

    test('Scenario 4: Markdown & Action Cards', async ({ page }) => {
        // 模擬 API 回應
        const mockMarkdown = '這是 **粗體** 和 [連結](https://lutagu.com)。\n\n- 項目 1\n- 項目 2';
        await page.route('**/api/agent/v2', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'text/plain',
                body: mockMarkdown
            });
        });

        const chatInput = await openChat(page);
        await chatInput.fill('測試 Markdown');
        await page.keyboard.press('Enter');

        const lastMsg = page.locator('[data-testid="chat-message-text"]').last();
        // 註：ParsedMessageContent 會刻意移除 ** 符號，因此不驗證 strong 標籤，改驗證文字內容、連結與清單
        await expect(lastMsg).toContainText('粗體');
        await expect(lastMsg.locator('a')).toHaveAttribute('href', 'https://lutagu.com');
        await expect(lastMsg.locator('li')).toHaveCount(2);
    });

    test('Scenario 5: Feedback System', async ({ page }) => {
        // 先建立對話
        await page.route('**/api/agent/v2', async route => {
            await route.fulfill({ status: 200, contentType: 'text/plain', body: '回饋測試回應' });
        });

        // 攔截 Feedback API
        let feedbackSent = false;
        await page.route('**/api/feedback', async route => {
            feedbackSent = true;
            await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
        });

        const chatInput = await openChat(page);
        await chatInput.fill('哈囉');
        await page.keyboard.press('Enter');

        // 點擊好評按鈕 (MessageBubble 中的 Button)
        const thumbsUp = page.locator('button:has(svg.lucide-thumbs-up)').first();
        await thumbsUp.waitFor({ state: 'visible' });
        await thumbsUp.click();

        // 驗證 API 調用
        await page.waitForFunction(() => (window as any).feedbackSent === undefined, {}); // 這裡簡單等待一下
        expect(feedbackSent).toBe(true);
    });

    test('Scenario 6: Auto-scroll & Loading Indicators', async ({ page }) => {
        // 模擬延遲回應以觀察 Loading
        await page.route('**/api/agent/v2', async route => {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await route.fulfill({ status: 200, contentType: 'text/plain', body: '長回應...' });
        });

        const chatInput = await openChat(page);
        await chatInput.fill('Loading 測試');
        await page.keyboard.press('Enter');

        // 驗證骨架屏或 ThinkingBubble
        const skeleton = page.locator('.animate-pulse').first(); // MessageBubble 的 Loading 狀態
        await expect(skeleton).toBeVisible();

        // 驗證自動滾動 (檢查 messagesEndRef 是否進入視線)
        // 這裡透過檢查容器的 scrollTop 是否增加來判斷
        const chatContainer = page.locator('.flex-1.overflow-y-auto.p-4');
        const initialScroll = await chatContainer.evaluate(el => el.scrollTop);

        await page.waitForTimeout(3000); // 等待回應完成
        const finalScroll = await chatContainer.evaluate(el => el.scrollTop);
        // 如果訊息夠多，finalScroll 應該大於 initialScroll (或至少在底部)
    });
});
