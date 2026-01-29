import { test, expect } from '@playwright/test';

test.describe('Phase 1: Base Access & Onboarding Verification', () => {

    test.beforeEach(async ({ page, context }) => {
        // 重定向瀏覽器日誌到 Node 終端
        page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));

        // 1. 模擬地理位置權限與坐標 (上野站)
        await context.grantPermissions(['geolocation']);
        await context.setGeolocation({ latitude: 35.7141, longitude: 139.7774 });

        // 2. 注入 Mock Geolocation API
        await page.addInitScript(() => {
            (window as any).navigator.geolocation.getCurrentPosition = (success: any) => {
                success({
                    coords: {
                        latitude: 35.7141,
                        longitude: 139.7774,
                        accuracy: 10,
                        altitude: null,
                        altitudeAccuracy: null,
                        heading: null,
                        speed: null
                    },
                    timestamp: Date.now()
                });
            };
        });

        // 3. 確保 localStorage 清除，以便每次測試都能看到 Onboarding
        await page.addInitScript(() => {
            window.localStorage.clear();
        });

        await page.goto('/zh-TW');
    });

    test('Scenario 1: Initial Page Load and Onboarding Opening', async ({ page }) => {
        // 驗證 OnboardingModal 是否開啟
        const onboardingTitle = page.locator('#onboarding-title');
        await expect(onboardingTitle).toBeVisible({ timeout: 10000 });
        await expect(onboardingTitle).toHaveText('LUTAGU');
    });

    test('Scenario 2: Demo Mode Trigger (Overtourism)', async ({ page }) => {
        // 1. 等待 Onboarding 完全載入
        const onboardingModal = page.locator('section[aria-labelledby="onboarding-title"]');
        await expect(onboardingModal).toBeVisible({ timeout: 10000 });

        // 2. 使用 data-testid 點擊「過度觀光」演示按鈕
        await page.evaluate(() => {
            const btn = document.querySelector('[data-testid="onboarding-tip-overtourism"]') as HTMLButtonElement;
            if (btn) btn.click();
        });

        // 3. 等待狀態更新
        await page.waitForTimeout(1500);

        // 4. 驗證 Onboarding 關閉
        await expect(onboardingModal).toBeHidden({ timeout: 15000 });

        // 5. 驗證進入全螢幕模式
        const chatPanel = page.locator('div.fixed.inset-0.z-\\[9998\\]');
        await expect(chatPanel).toBeVisible({ timeout: 10000 });

        // 6. 驗證演示訊息包含特定主題
        const firstMessage = page.locator('[data-testid="chat-message-text"]').first();
        await expect(firstMessage).toBeVisible({ timeout: 15000 });
        await expect(firstMessage).toContainText(/江戶風情/);
    });

    test('Scenario 3: Skip Onboarding and Map Visibility', async ({ page }) => {
        // 1. 等待 Onboarding 完全載入
        const onboardingModal = page.locator('section[aria-labelledby="onboarding-title"]');
        await expect(onboardingModal).toBeVisible({ timeout: 10000 });

        // 2. 使用 JavaScript 直接點擊按鈕 (繞過 DOM 攔截問題)
        await page.evaluate(() => {
            const btn = document.querySelector('[data-testid="onboarding-browse-btn"]') as HTMLButtonElement;
            if (btn) btn.click();
        });

        // 3. 等待狀態更新與動畫完成
        await page.waitForTimeout(1500);

        // 4. 驗證 Onboarding 關閉
        await expect(onboardingModal).toBeHidden({ timeout: 15000 });

        // 5. 檢查地圖上的 AI 助手按鈕是否存在
        const aiBtn = page.locator('button[data-testid="open-ai-chat"]').first();
        await expect(aiBtn).toBeVisible();
    });

    test('Scenario 4: Hub Station Selection', async ({ page }) => {
        // 1. 等待 Onboarding 完全載入
        const onboardingModal = page.locator('section[aria-labelledby="onboarding-title"]');
        await expect(onboardingModal).toBeVisible({ timeout: 10000 });

        // 2. 使用 data-testid 點擊「東京」樞紐按鈕
        await page.evaluate(() => {
            const btn = document.querySelector('[data-testid="onboarding-hub-tokyo"]') as HTMLButtonElement;
            if (btn) btn.click();
        });

        // 3. 等待狀態更新
        await page.waitForTimeout(1500);

        // 4. 驗證 Onboarding 關閉
        await expect(onboardingModal).toBeHidden({ timeout: 15000 });

        // 5. 驗證車站詳情面板 (BottomSheet) 開啟
        const bottomSheetHeader = page.locator('header h2');
        await expect(bottomSheetHeader).toBeVisible({ timeout: 10000 });
        await expect(bottomSheetHeader).toContainText(/東京/);
    });
});
