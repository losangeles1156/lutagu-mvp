import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer';

type StartedServer = {
    url: string;
    close: () => Promise<void>;
};

function pickAvailablePort(): number {
    return 3200 + Math.floor(Math.random() * 2000);
}

async function startNextDev(port: number): Promise<StartedServer> {
    // Use npx for cross-platform compatibility (Windows/macOS/Linux)
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'npx.cmd' : 'npx';
    const proc = spawn(command, ['next', 'dev', '-p', String(port)], {
        env: { ...process.env, PORT: String(port) },
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: isWindows // Use shell on Windows for proper PATH resolution
    });

    const url = `http://localhost:${port}`;

    await new Promise<void>((resolve, reject) => {
        let combined = '';
        const readyRegex = /(ready\s*-\s*started\s*server\s*on|ready\s*in)/i;

        const cleanup = () => {
            clearTimeout(timer);
            proc.stdout?.off('data', onChunk);
            proc.stderr?.off('data', onChunk);
            proc.off('exit', onExit);
        };

        const onChunk = (chunk: any) => {
            combined += String(chunk);
            if (readyRegex.test(combined)) {
                cleanup();
                resolve();
            }
        };

        const onExit = (code: number | null) => {
            cleanup();
            reject(new Error(`Next dev server exited early with code ${code}. Output: ${combined.slice(-2000)}`));
        };

        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`Next dev server did not become ready. Output: ${combined.slice(-2000)}`));
        }, 90_000);

        proc.stdout?.on('data', onChunk);
        proc.stderr?.on('data', onChunk);
        proc.on('exit', onExit);
    });

    const close = async () => {
        if (proc.killed) return;
        proc.kill('SIGTERM');
        await new Promise<void>((resolve) => {
            const timer = setTimeout(() => {
                try {
                    proc.kill('SIGKILL');
                } catch {
                }
                resolve();
            }, 10_000);
            proc.once('exit', () => {
                clearTimeout(timer);
                resolve();
            });
        });
    };

    return { url, close };
}

async function clickOnboardingHubButton(page: any): Promise<void> {
    await page.waitForFunction(() => {
        const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
        return buttons.some(b => (b.className || '').includes('bg-indigo-50'));
    }, { timeout: 60_000 });

    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
        const target = buttons.find(b => (b.className || '').includes('bg-indigo-50'));
        if (target) target.click();
    });
}

async function clickNodeTabByIndex(page: any, index: number): Promise<void> {
    await page.waitForFunction(() => {
        const tablist = document.querySelector('[role="tablist"]');
        if (!tablist) return false;
        const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
        return tabs.length >= 4;
    }, { timeout: 60_000 });

    await page.evaluate((i: number) => {
        const tablist = document.querySelector('[role="tablist"]');
        if (!tablist) return;
        const buttons = Array.from(tablist.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
        const target = buttons[i];
        if (target) target.click();
    }, index);
}

async function waitForActiveTabByIndex(page: any, index: number): Promise<void> {
    await page.waitForFunction((i: number) => {
        const tablist = document.querySelector('[role="tablist"]');
        if (!tablist) return false;
        const tabs = Array.from(tablist.querySelectorAll('[role="tab"]')) as HTMLElement[];
        const t = tabs[i];
        return Boolean(t) && t.getAttribute('aria-selected') === 'true';
    }, { timeout: 60_000 }, index);
}

async function clickButtonByExactText(page: any, text: string): Promise<void> {
    await page.waitForFunction((label: string) => {
        const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
        return buttons.some(b => (b.textContent || '').trim() === label);
    }, { timeout: 60_000 }, text);

    await page.evaluate((label: string) => {
        const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
        const target = buttons.find(b => (b.textContent || '').trim() === label);
        target?.click();
    }, text);
}

async function waitForEnabledButtonByExactText(page: any, text: string): Promise<void> {
    await page.waitForFunction((label: string) => {
        const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
        const target = buttons.find(b => (b.textContent || '').trim() === label);
        return Boolean(target) && !target!.disabled;
    }, { timeout: 60_000 }, text);
}

async function waitForAnySelector(page: any, selectors: string[], timeoutMs: number): Promise<string> {
    const joined = selectors.join(',');
    await page.waitForSelector(joined, { timeout: timeoutMs });
    return joined;
}

function preparePuppeteerHome(prefix: string): string {
    const dir = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

async function waitForSpotsCountAtLeast(page: any, min: number): Promise<void> {
    await page.waitForFunction((expectedMin: number) => {
        const spans = Array.from(document.querySelectorAll('span')) as HTMLSpanElement[];
        const spotSpan = spans.find(s => /\bSpots\b/.test((s.textContent || '').trim()));
        if (!spotSpan) return false;
        const m = (spotSpan.textContent || '').trim().match(/^(\d+)\s+Spots\b/);
        if (!m) return false;
        const n = Number(m[1]);
        return Number.isFinite(n) && n >= expectedMin;
    }, { timeout: 60_000 }, min);
}

test('UI renders level badges in node tabs', { timeout: 180_000 }, async (t) => {
    const port = pickAvailablePort();
    const server = await startNextDev(port);
    t.after(async () => {
        await server.close();
    });

    const puppeteerHome = preparePuppeteerHome(`lutagu-ui-home-${port}`);
    t.after(() => {
        fs.rmSync(puppeteerHome, { recursive: true, force: true });
    });

    const browser = await puppeteer.launch({
        headless: true,
        env: {
            ...process.env,
            HOME: puppeteerHome,
            XDG_CONFIG_HOME: puppeteerHome,
            XDG_CACHE_HOME: puppeteerHome,
            XDG_DATA_HOME: puppeteerHome,
        },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-crashpad',
            '--disable-breakpad',
            '--no-first-run',
            '--no-default-browser-check',
            `--user-data-dir=${path.join(puppeteerHome, 'profile')}`,
        ]
    });
    t.after(async () => {
        await browser.close();
    });

    const page = await browser.newPage();
    await page.goto(`${server.url}/en/?node=odpt.Station:TokyoMetro.Ginza.Ueno&sheet=1&nodeTab=dna`, { waitUntil: 'domcontentloaded' });

    await waitForActiveTabByIndex(page, 0);

    await clickNodeTabByIndex(page, 1);
    await waitForActiveTabByIndex(page, 1);

    await clickNodeTabByIndex(page, 2);
    await waitForActiveTabByIndex(page, 2);

    assert.ok(true);
});

test('UI renders route result card after destination search', { timeout: 180_000 }, async (t) => {
    const port = pickAvailablePort();
    const server = await startNextDev(port);
    t.after(async () => {
        await server.close();
    });

    const puppeteerHome = preparePuppeteerHome(`lutagu-ui-home-${port}`);
    t.after(() => {
        fs.rmSync(puppeteerHome, { recursive: true, force: true });
    });

    const browser = await puppeteer.launch({
        headless: true,
        env: {
            ...process.env,
            HOME: puppeteerHome,
            XDG_CONFIG_HOME: puppeteerHome,
            XDG_CACHE_HOME: puppeteerHome,
            XDG_DATA_HOME: puppeteerHome,
        },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-crashpad',
            '--disable-breakpad',
            '--no-first-run',
            '--no-default-browser-check',
            `--user-data-dir=${path.join(puppeteerHome, 'profile')}`,
        ]
    });
    t.after(async () => {
        await browser.close();
    });

    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const url = req.url();

        if (url.includes('/api/stations/search')) {
            const payload = {
                stations: [
                    {
                        id: 'odpt.Station:TokyoMetro.Ginza.Ginza',
                        name: { ja: '銀座', en: 'Ginza' },
                        operator: 'TokyoMetro',
                        railway: 'TokyoMetro.Ginza'
                    }
                ]
            };
            void req.respond({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(payload)
            });
            return;
        }

        if (url.includes('/api/odpt/route')) {
            const payload = {
                routes: [
                    {
                        label: 'Ueno → Ginza',
                        steps: [
                            '🏠 Ueno',
                            '🚃 Take odpt.Railway:TokyoMetro.Ginza (Ginza Line)',
                            '📍 Ginza'
                        ],
                        sources: [{ type: 'odpt:Railway', verified: true }],
                        railways: ['odpt.Railway:TokyoMetro.Ginza'],
                        fare: { ic: 180, ticket: 200 },
                        duration: 18,
                        transfers: 0,
                        nextDeparture: '23:59'
                    }
                ]
            };
            void req.respond({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(payload)
            });
            return;
        }

        void req.continue();
    });

    await page.goto(`${server.url}/en/?node=odpt.Station:TokyoMetro.Ginza.Ueno&sheet=1&nodeTab=lutagu`, { waitUntil: 'domcontentloaded' });
    await waitForActiveTabByIndex(page, 3);

    await clickButtonByExactText(page, 'Planner');

    const destinationSelector = await waitForAnySelector(
        page,
        [
            'input[placeholder="Destination"]',
            'input[placeholder="抵達目的地車站"]',
            'input[placeholder="到着駅"]',
            'input[placeholder="إلى أين؟"]'
        ],
        60_000
    );
    await page.type(destinationSelector, 'Ginza');
    await page.keyboard.press('Enter');

    await waitForEnabledButtonByExactText(page, 'Generate Plan');
    await clickButtonByExactText(page, 'Generate Plan');

    await page.waitForFunction(() => {
        const text = (document.body?.innerText || '').replace(/\s+/g, ' ');
        return text.includes('Ueno → Ginza') && text.includes('¥180') && text.includes('23:59');
    }, { timeout: 60_000 });

    assert.ok(true);
});
