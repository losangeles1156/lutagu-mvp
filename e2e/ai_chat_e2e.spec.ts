import { test, expect, Page } from '@playwright/test';

const chatInputSelector = 'input[data-testid="chat-input"]';
const messageSelector = 'div.prose[data-testid="chat-message-text"]';
const sendButtonSelector = 'button[type="submit"]';

type MockReply = {
    body: string;
    delayMs?: number;
    status?: number;
};

const getLastUserMessage = (rawBody: string) => {
    try {
        const parsed = JSON.parse(rawBody);
        if (typeof parsed?.text === 'string') return parsed.text;

        const extractText = (value: unknown): string => {
            if (!value) return '';
            if (typeof value === 'string') return value;
            if (Array.isArray(value)) {
                return value
                    .map((part) => {
                        if (typeof part === 'string') return part;
                        if (typeof (part as any)?.text === 'string') return (part as any).text;
                        if (typeof (part as any)?.content === 'string') return (part as any).content;
                        return '';
                    })
                    .join('')
                    .trim();
            }
            if (typeof value === 'object') {
                const obj = value as any;
                if (typeof obj.text === 'string') return obj.text;
                if (typeof obj.content === 'string') return obj.content;
                if (Array.isArray(obj.parts)) return extractText(obj.parts);
            }
            return '';
        };

        const messages = Array.isArray(parsed?.messages)
            ? parsed.messages
            : Array.isArray(parsed?.body?.messages)
                ? parsed.body.messages
                : [];
        const last = messages[messages.length - 1];
        return extractText(last?.content ?? last?.parts ?? last?.text ?? last);
    } catch {
        return '';
    }
};

const setupMockRoute = async (page: Page, resolver: (lastMessage: string) => MockReply) => {
    await page.route('**/api/agent/adk', async route => {
        const postData = route.request().postData() || '';
        const lastMessage = getLastUserMessage(postData);
        const reply = resolver(lastMessage);
        if (reply.delayMs) {
            await new Promise(resolve => setTimeout(resolve, reply.delayMs));
        }
        await route.fulfill({
            status: reply.status ?? 200,
            contentType: 'text/plain; charset=utf-8',
            body: reply.body
        });
    });
};

const openChat = async (page: Page) => {
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 35.6812, longitude: 139.7671 });
    await page.goto('/zh-TW', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => {
        return (window as any).__LUTAGU_UI_STATE__?.getState;
    }, { timeout: 30000 });

    await page.evaluate(() => {
        const userStore = (window as any).__LUTAGU_USER_STORE__;
        const uiStore = (window as any).__LUTAGU_UI_STORE__;
        const uiState = (window as any).__LUTAGU_UI_STATE__;

        if (userStore) userStore.getState().setOnboardingSeenVersion(1);
        if (uiStore) uiStore.getState().setIsOnboardingOpen(false);
        if (uiState) {
            uiState.getState().setUIState('fullscreen');
            uiState.getState().transitionTo('fullscreen');
            uiState.setState({ uiState: 'fullscreen', lastState: 'fullscreen', isAnimating: false, animationDirection: null });
        }
    });

    const chatInput = page.locator(chatInputSelector);
    try {
        await chatInput.waitFor({ state: 'visible', timeout: 8000 });
    } catch {
        const aiGuideBtn = page.locator('button[data-testid="open-ai-chat"]:visible').first();
        if (await aiGuideBtn.count()) {
            await aiGuideBtn.click({ force: true });
        }
        await page.waitForFunction(() => {
            const state = (window as any).__LUTAGU_UI_STATE__?.getState?.();
            return state?.uiState === 'fullscreen';
        }, { timeout: 20000 });
        await page.evaluate(() => {
            const uiState = (window as any).__LUTAGU_UI_STATE__;
            if (uiState) uiState.setState({ uiState: 'fullscreen', lastState: 'fullscreen', isAnimating: false, animationDirection: null });
        });
    }
    await expect(chatInput).toBeVisible({ timeout: 20000 });
    return chatInput;
};

const waitForResponse = async (page: Page, expectedText: string | RegExp, timeout = 10000) => {
    const initialCount = await page.evaluate(() => {
        const state = (window as any).__LUTAGU_UI_STATE__?.getState?.();
        return Array.isArray(state?.messages) ? state.messages.length : 0;
    });
    const lastMessage = page.locator(messageSelector).last();
    await expect(lastMessage).toBeVisible({ timeout });
    await page.waitForFunction(({ initialCount, expected }) => {
        const state = (window as any).__LUTAGU_UI_STATE__?.getState?.();
        const messages = Array.isArray(state?.messages) ? state.messages : [];
        if (messages.length < initialCount) return false;
        const assistantMessages = messages.filter((m: any) => m?.role === 'assistant' && typeof m?.content === 'string');
        if (assistantMessages.length === 0) return false;
        const content = (assistantMessages[assistantMessages.length - 1]?.content || '').trim();
        if (!content) return false;
        if (!expected) return true;
        if (expected.type === 'string') return content.includes(expected.value);
        try {
            const regex = new RegExp(expected.value);
            return regex.test(content);
        } catch {
            return false;
        }
    }, {
        initialCount,
        expected: typeof expectedText === 'string' ? { type: 'string', value: expectedText } : { type: 'regex', value: expectedText.source }
    }, { timeout, polling: 200 });
    const text = await page.evaluate(() => {
        const state = (window as any).__LUTAGU_UI_STATE__?.getState?.();
        const messages = Array.isArray(state?.messages) ? state.messages : [];
        const assistantMessages = messages.filter((m: any) => m?.role === 'assistant' && typeof m?.content === 'string');
        const last = assistantMessages[assistantMessages.length - 1];
        return typeof last?.content === 'string' ? last.content.trim() : '';
    });
    expect(text.length).toBeGreaterThan(0);
    if (typeof expectedText === 'string') {
        expect(text).toContain(expectedText);
    } else {
        expect(text).toMatch(expectedText);
    }
    return text;
};

test.describe('AI Chat End-to-End Comprehensive', () => {
    test('基本對話功能驗證與回應時間', async ({ page }) => {
        await setupMockRoute(page, () => ({
            body: '您好，我可以協助您的行程與交通問題。',
            delayMs: 300
        }));

        const chatInput = await openChat(page);
        const start = Date.now();

        await chatInput.fill('你好');
        await page.locator(sendButtonSelector).click();
        await expect(chatInput).toHaveValue('');

        await waitForResponse(page, '您好，我可以協助您的行程與交通問題。', 5000);
        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThanOrEqual(3000);
    });

    test('對話品質評估：一般問答、程式碼、創意、數學', async ({ page }) => {
        const responses: Record<string, string> = {
            '東京塔在哪裡？': '東京塔位於港區芝公園附近，最近的車站是赤羽橋站。',
            '用 JavaScript 寫一個求和函式': 'function sum(a, b) { return a + b; }',
            '寫一段關於東京夜景的短詩': '霓虹映著隅田川，夜風輕拂人心。\n高塔閃爍如星，旅人沉醉東京。',
            '123 * 45 等於多少？': '123 * 45 = 5535。'
        };

        await setupMockRoute(page, (lastMessage) => ({ body: responses[lastMessage] || '請再說明一次需求。' }));
        const chatInput = await openChat(page);

        const cases = [
            { prompt: '東京塔在哪裡？', keywords: [/東京塔/, /港區|芝公園|赤羽橋/], minLength: 12 },
            { prompt: '用 JavaScript 寫一個求和函式', keywords: [/function/, /return/], minLength: 20 },
            { prompt: '寫一段關於東京夜景的短詩', keywords: [/東京|夜景|霓虹|隅田川/], minLength: 20 },
            { prompt: '123 * 45 等於多少？', keywords: [/5535/], minLength: 5 }
        ];

        for (const testCase of cases) {
            await chatInput.fill(testCase.prompt);
            await page.locator(sendButtonSelector).click();
            const responseText = await waitForResponse(page, responses[testCase.prompt]);
            for (const keyword of testCase.keywords) {
                expect(responseText).toMatch(keyword);
            }
            expect(responseText.length).toBeGreaterThanOrEqual(testCase.minLength);
        }
    });

    test('錯誤處理：網路中斷、延遲、超長輸入、特殊字元', async ({ page }) => {
        await setupMockRoute(page, () => ({ body: '延遲測試成功', delayMs: 2000 }));
        const chatInput = await openChat(page);

        await chatInput.fill('延遲測試');
        await page.locator(sendButtonSelector).click();
        await waitForResponse(page, '延遲測試成功', 5000);

        await page.route('**/api/agent/adk', route => route.abort('failed'));
        await chatInput.fill('網路中斷測試');
        await page.locator(sendButtonSelector).click();
        await expect(page.getByText(/連線錯誤|離線模式|OFFLINE|オフライン/)).toBeVisible({ timeout: 10000 });

        const longInput = 'a'.repeat(600);
        await chatInput.fill(longInput);
        const currentValue = await chatInput.inputValue();
        expect(currentValue.length).toBeLessThanOrEqual(500);

        await setupMockRoute(page, () => ({ body: '特殊字元已接收' }));
        const special = '<script>alert(1)</script> 🤖 " \' ; -- \n JSON:{}';
        await chatInput.fill(special);
        await page.locator(sendButtonSelector).click();
        await expect(page.getByText('特殊字元已接收')).toBeVisible({ timeout: 5000 });
    });

    test('多輪對話上下文一致性', async ({ page }) => {
        const responses: Record<string, string> = {
            '我在新宿站': '了解，你目前在新宿站。',
            '那附近有拉麵嗎？': '新宿附近有許多拉麵店，例如思い出橫丁一帶。'
        };

        await setupMockRoute(page, (lastMessage) => ({ body: responses[lastMessage] || '請補充更多資訊。' }));
        const chatInput = await openChat(page);

        await chatInput.fill('我在新宿站');
        await page.locator(sendButtonSelector).click();
        await waitForResponse(page, responses['我在新宿站']);

        await chatInput.fill('那附近有拉麵嗎？');
        await page.locator(sendButtonSelector).click();
        const responseText = await waitForResponse(page, responses['那附近有拉麵嗎？']);
        expect(responseText).toMatch(/新宿/);
    });

    test('效能測試：多次請求回應時間與穩定性', async ({ page }) => {
        let counter = 0;
        await setupMockRoute(page, () => {
            counter += 1;
            return { body: `回應 ${counter}`, delayMs: 150 };
        });

        const chatInput = await openChat(page);
        const timings: number[] = [];

        for (let i = 0; i < 5; i += 1) {
            const start = Date.now();
            await chatInput.fill(`效能測試 ${i + 1}`);
            await page.locator(sendButtonSelector).click();
            await waitForResponse(page, `回應 ${i + 1}`);
            timings.push(Date.now() - start);
        }

        const average = Math.round(timings.reduce((sum, t) => sum + t, 0) / timings.length);
        const max = Math.max(...timings);
        expect(average).toBeLessThanOrEqual(3000);
        expect(max).toBeLessThanOrEqual(3000);
    });
});
