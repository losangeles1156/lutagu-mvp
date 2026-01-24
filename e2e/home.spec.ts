import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/LUTAGU/);
});

test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    // Check for a key element on the homepage (e.g., Map or Search)
    // Adjust selector based on actual homepage content
    const mapContainer = page.locator('.leaflet-container').first();
    // Or check for header
    const header = page.locator('header');

    await expect(header).toBeVisible();
});
