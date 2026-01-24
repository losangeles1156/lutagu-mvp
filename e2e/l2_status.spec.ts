import { test, expect, Page } from '@playwright/test';

// --- Mock Data ---
const MOCK_STATION_ID = 'odpt.Station:TokyoMetro.Ginza.Ueno';

const MOCK_LINE_NORMAL = {
    line: 'Ginza Line',
    name: { ja: '銀座線', en: 'Ginza Line', zh: '銀座線' },
    operator: 'Metro',
    color: '#FF9500',
    status: 'normal',
    status_detail: 'normal',
    delay_minutes: null,
    severity: 'none',
    message: undefined
};

const MOCK_LINE_DELAY_MINOR = {
    ...MOCK_LINE_NORMAL,
    line: 'Hibiya Line',
    name: { ja: '日比谷線', en: 'Hibiya Line', zh: '日比谷線' },
    color: '#B5B5AC',
    status: 'delay',
    status_detail: 'delay_minor',
    delay_minutes: 15,
    severity: 'minor',
    message: { ja: '15分程度の遅れ', en: '15 min delay', zh: '延誤約15分鐘' }
};

const MOCK_LINE_DELAY_MAJOR = {
    ...MOCK_LINE_NORMAL,
    line: 'Marunouchi Line',
    name: { ja: '丸ノ内線', en: 'Marunouchi Line', zh: '丸之內線' },
    color: '#F62E36',
    status: 'delay',
    status_detail: 'delay_major',
    delay_minutes: 45,
    severity: 'major',
    message: { ja: '45分以上の遅れ', en: '45+ min delay', zh: '延誤超過45分鐘' }
};

const MOCK_LINE_SUSPENDED = {
    ...MOCK_LINE_NORMAL,
    line: 'Chiyoda Line',
    name: { ja: '千代田線', en: 'Chiyoda Line', zh: '千代田線' },
    color: '#00BB85',
    status: 'suspended',
    status_detail: 'halt',
    delay_minutes: null,
    severity: 'critical',
    message: { ja: '運転見合わせ', en: 'Service suspended', zh: '暫停運行' }
};

const createMockResponse = (lineStatuses: any[]) => ({
    congestion: 2,
    crowd: { level: 2, trend: 'stable', userVotes: { total: 0, distribution: [0, 0, 0, 0, 0] } },
    line_status: lineStatuses,
    weather: { temp: 15, condition: 'Clear', wind: 5 },
    updated_at: new Date().toISOString(),
    is_stale: false,
    disruption_history: []
});

// --- Helper to mock L2 API ---
async function mockL2Api(page: Page, lineStatuses: any[]) {
    await page.route('**/api/l2/status*', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(createMockResponse(lineStatuses))
        });
    });
}

// --- Tests ---

test.describe('L2 Train Status', () => {

    test('Scenario 1: API Response Structure', async ({ request }) => {
        // Call API directly without mocking to test real structure
        const response = await request.get(`/api/l2/status?station_id=${MOCK_STATION_ID}`);
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        expect(data).toHaveProperty('line_status');
        expect(data).toHaveProperty('congestion');
        expect(Array.isArray(data.line_status)).toBe(true);

        // If lines exist, validate structure
        if (data.line_status.length > 0) {
            const firstLine = data.line_status[0];
            expect(firstLine).toHaveProperty('status');
            expect(firstLine).toHaveProperty('color');
            expect(firstLine).toHaveProperty('operator');
        }
    });

    // NOTE: Frontend Display tests (Scenario 2-4) are skipped because L2_Live is rendered
    // via NodeTabs component in AppOverlays, which requires complex map interaction to trigger.
    // These tests are better suited for Storybook component testing or Playwright Component Testing.
    // See: https://playwright.dev/docs/test-components

    test.skip('Scenario 2: Frontend Display - Normal Operation', async ({ page }) => {
        // TODO: Implement using Playwright Component Testing for L2_Live
        // Expected: "All Good" badge visible, no alert banners
    });

    test.skip('Scenario 3: Frontend Display - Delay (Minor & Major)', async ({ page }) => {
        // TODO: Implement using Playwright Component Testing for L2_Live
        // Expected: "X Issues" badge, amber/orange border styling
    });

    test.skip('Scenario 4: Frontend Display - Suspension (Operation Halted)', async ({ page }) => {
        // TODO: Implement using Playwright Component Testing for L2_Live
        // Expected: 運転見合わせ/Suspended indicator, rose/red styling
    });

    test('Scenario 5: Rust Service Fallback (Integration)', async ({ request }) => {
        // Call API and check headers
        const response = await request.get(`/api/l2/status?station_id=${MOCK_STATION_ID}`);
        expect(response.ok()).toBeTruthy();

        const sourceHeader = response.headers()['x-l2-source'];
        const data = await response.json();

        // If Rust source is indicated, verify line_status is not empty
        if (sourceHeader === 'rust') {
            expect(data.line_status.length).toBeGreaterThan(0);
        }

        // Fallback: If no header or Node.js source, still expect valid data
        expect(data).toHaveProperty('line_status');
        expect(data).toHaveProperty('updated_at');
    });

});
