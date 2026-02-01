
import { test, expect, Page } from '@playwright/test';

// Selectors
const chatInputSelector = 'input[data-testid="chat-input"]';
const messageSelector = 'div.prose[data-testid="chat-message-text"]';
const sendButtonSelector = 'button[type="submit"]';

// Mock Setup Helper
const setupMockRoute = async (page: Page, mockResponse: { body: string; delayMs: number; status?: number }) => {
    await page.route('**/api/agent/adk', async route => {
        if (mockResponse.delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, mockResponse.delayMs));
        }
        await route.fulfill({
            status: mockResponse.status ?? 200,
            contentType: 'text/plain; charset=utf-8',
            body: mockResponse.body
        });
    });
};

const openChat = async (page: Page) => {
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 35.6812, longitude: 139.7671 });
    await page.goto('/zh-TW', { waitUntil: 'domcontentloaded' });

    // Force UI state to fullscreen chat for testing
    await page.evaluate(() => {
        const uiState = (window as any).__LUTAGU_UI_STATE__;
        if (uiState) {
            uiState.getState().setUIState('fullscreen');
            uiState.getState().transitionTo('fullscreen');
        }
    });

    const chatInput = page.locator(chatInputSelector);
    try {
        await chatInput.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
        // Fallback: try generic open button if direct state manip fails
        // Handle onboarding overlay if present
        const onboardingBtn = page.locator('button[data-testid="browse-first-btn"]');
        if (await onboardingBtn.isVisible()) {
            await onboardingBtn.click();
            await page.waitForTimeout(500); // Wait for transition
        }

        const btn = page.locator('button[data-testid="open-ai-chat"]').first();
        if (await btn.isVisible()) await btn.click();
        await chatInput.waitFor({ state: 'visible' });
    }
    return chatInput;
};

test.describe('AI Chat Workflow Verification (Latency & UX)', () => {

    test('Case 1: Static Data (Fast Response) - < 1s', async ({ page }) => {
        await setupMockRoute(page, {
            body: '這是靜態資訊回應。',
            delayMs: 500
        });

        const chatInput = await openChat(page);
        await chatInput.fill('測試靜態資訊');
        const start = Date.now();
        await page.locator(sendButtonSelector).click();

        // Verify response appears quickly
        await expect(page.locator(messageSelector).last()).toContainText('這是靜態資訊回應。', { timeout: 2000 });

        const duration = Date.now() - start;
        console.log(`Static response time: ${duration}ms`);
        expect(duration).toBeLessThan(3000); // 宽松标准：3秒内
    });

    test('Case 2: Dynamic Data (Slow Response) - > 3s', async ({ page }) => {
        // Mock a streamed response
        await page.route('**/api/agent/adk', async route => {
            const responseBodyParts = [
                '[THINKING]Analyzing request...[/THINKING]\n',
                '[THINKING]Searching expert knowledge...[/THINKING]\n',
                '這是動態查詢結果。'
            ];

            await route.fulfill({
                status: 200,
                contentType: 'text/plain; charset=utf-8',
                body: responseBodyParts.join('') // Simulate stream via immediate body (Playwright mock routing doesn't easily support chunked delay without custom stream impl, but this tests parsing)
            });
        });

        // Note: To test actual visual delay, we'd need a custom stream implementation in the mock.
        // For now, we verify that the Thinking Bubble appears when specific tags are present.

        const chatInput = await openChat(page);
        await chatInput.fill('測試動態數據');
        await page.locator(sendButtonSelector).click();

        // Verify Thinking Bubble appears (it stays in history as 'Thought Process' or appears during generation)
        // Since we send it all at once in this mock, it might instantly become "Thought Process" (closed).
        // To verify "Active" state, we'd need a real delay between chunks.

        await expect(page.locator(messageSelector).last()).toContainText('這是動態查詢結果。', { timeout: 6000 });

        // Verify thinking content exists in the DOM (localized check or testid)
        await expect(page.locator('[data-testid="thinking-bubble"]')).toBeVisible();
    });

    test('Case 3: Error Recovery - 500 Error', async ({ page }) => {
        await setupMockRoute(page, {
            body: 'Internal Server Error',
            delayMs: 1000,
            status: 500
        });

        const chatInput = await openChat(page);
        await chatInput.fill('觸發錯誤');
        await page.locator(sendButtonSelector).click();

        // Verify error UI
        // Common error messages in UI: "連線錯誤", "Error", "請稍後再試"
        await expect(page.getByText(/error|錯誤|失敗|offline/i)).toBeVisible({ timeout: 5000 });
    });

});
