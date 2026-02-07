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
    return 11000 + Math.floor(Math.random() * 20000);
}

async function startNextDev(port: number): Promise<StartedServer> {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'npx.cmd' : 'npx';
    const proc = spawn(command, ['next', 'dev', '-p', String(port)], {
        env: {
            ...process.env,
            PORT: String(port),
            NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
            SUPABASE_SERVICE_KEY: 'test-service-key',
            SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: isWindows
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

function preparePuppeteerHome(prefix: string): string {
    const dir = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

async function seedUserStorage(page: any, locale: 'zh-TW' | 'ja' | 'en'): Promise<void> {
    await page.evaluateOnNewDocument((loc: 'zh-TW' | 'ja' | 'en') => {
        const payload = {
            state: {
                agentUserId: 'test-user',
                locale: loc,
                accessibilityMode: false,
                userContext: [],
                onboardingSeenVersion: 1,
                isTripGuardActive: false,
                isLineBound: false,
                tripGuardSubscriptionId: null,
                tripGuardSummary: null
            },
            version: 0
        };
        localStorage.setItem('lutagu-user-storage', JSON.stringify(payload));
    }, locale);
}

async function waitForActiveTabByIndex(page: any, index: number): Promise<void> {
    await page.waitForFunction(() => {
        const tablists = Array.from(document.querySelectorAll('[role="tablist"]')) as HTMLElement[];
        const nodeTablist = tablists.find(tl => tl.querySelector('[role="tab"]'));
        if (nodeTablist) return true;
        const hubsSection = document.querySelector('[aria-labelledby="onboarding-hubs-title"]');
        return Boolean(hubsSection);
    }, { timeout: 60_000 });

    await page.evaluate(() => {
        const tablists = Array.from(document.querySelectorAll('[role="tablist"]')) as HTMLElement[];
        const nodeTablist = tablists.find(tl => tl.querySelector('[role="tab"]'));
        if (nodeTablist) return;
        const hubsSection = document.querySelector('[aria-labelledby="onboarding-hubs-title"]');
        const firstHub = hubsSection?.querySelector('button') as HTMLButtonElement | null;
        if (firstHub) firstHub.click();
    });

    await page.waitForFunction((i: number) => {
        const tablists = Array.from(document.querySelectorAll('[role="tablist"]')) as HTMLElement[];
        const nodeTablist = tablists.find(tl => tl.querySelector('[role="tab"]'));
        if (!nodeTablist) return false;
        const tabs = Array.from(nodeTablist.querySelectorAll('[role="tab"]')) as HTMLElement[];
        return tabs.length > i;
    }, { timeout: 60_000 }, index);

    await page.evaluate((i: number) => {
        const tablists = Array.from(document.querySelectorAll('[role="tablist"]')) as HTMLElement[];
        const nodeTablist = tablists.find(tl => tl.querySelector('[role="tab"]'));
        if (!nodeTablist) return;
        const tabs = Array.from(nodeTablist.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
        const t = tabs[i];
        if (!t) return;
        if (t.getAttribute('aria-selected') !== 'true') t.click();
    }, index);

    await page.waitForFunction((i: number) => {
        const tablists = Array.from(document.querySelectorAll('[role="tablist"]')) as HTMLElement[];
        const nodeTablist = tablists.find(tl => tl.querySelector('[role="tab"]'));
        if (!nodeTablist) return false;
        const tabs = Array.from(nodeTablist.querySelectorAll('[role="tab"]')) as HTMLElement[];
        const t = tabs[i];
        return Boolean(t) && t.getAttribute('aria-selected') === 'true';
    }, { timeout: 60_000 }, index);
}

test('L2 UI shows delay severity and translates disruption cause', { timeout: 180_000 }, async (t) => {
    const port = pickAvailablePort();
    const server = await startNextDev(port);
    t.after(async () => {
        await server.close();
    });

    const puppeteerHome = preparePuppeteerHome(`lutagu-ui-home-l2-${port}`);
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
    await seedUserStorage(page, 'en');
    await page.setRequestInterception(true);

    page.on('request', (req) => {
        const url = req.url();

        if (url.includes('/api/l2/status')) {
            const payload = {
                congestion: 2,
                line_status: [
                    {
                        railway_id: 'odpt.Railway:TokyoMetro.Ginza',
                        name: { ja: '銀座線', en: 'Ginza Line', zh: '銀座線' },
                        operator: 'TokyoMetro',
                        color: '#F9A825',
                        status: 'delay',
                        status_detail: 'delay_major',
                        delay_minutes: 45,
                        message: '変電所の電気設備故障'
                    },
                    {
                        railway_id: 'odpt.Railway:TokyoMetro.Hibiya',
                        name: { ja: '日比谷線', en: 'Hibiya Line', zh: '日比谷線' },
                        operator: 'TokyoMetro',
                        color: '#B71C1C',
                        status: 'delay',
                        status_detail: 'delay_minor',
                        delay_minutes: 10,
                        message: '信号トラブル'
                    }
                ],
                weather: { temp: 20, condition: 'Clear', wind: 2 },
                updated_at: new Date().toISOString()
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

    await page.goto(`${server.url}/en/?node=odpt.Station:TokyoMetro.Ginza.Ueno&sheet=1&nodeTab=live`, { waitUntil: 'domcontentloaded' });

    await page.waitForFunction(() => {
        return Boolean((window as any).__LUTAGU_NODE_STORE__) && Boolean((window as any).__LUTAGU_UI_STORE__);
    }, { timeout: 60_000 });

    await page.evaluate(() => {
        const nodeStore = (window as any).__LUTAGU_NODE_STORE__;
        const uiStore = (window as any).__LUTAGU_UI_STORE__;
        nodeStore.getState().setCurrentNode('odpt.Station:TokyoMetro.Ginza.Ueno');
        uiStore.getState().setBottomSheetOpen(true);
        uiStore.getState().setNodeActiveTab('live');
    });


    try {
        await waitForActiveTabByIndex(page, 1);
    } catch {
        // If tabs are not rendered yet, continue and let content assertions fail if needed.
    }

    await page.waitForFunction(() => {
        const text = (document.body?.innerText || '').replace(/\s+/g, ' ');
        return text.includes('Delay 45 min') && text.includes('Delay 10 min') && text.includes('Substation equipment failure') && text.includes('Signal trouble');
    }, { timeout: 60_000 });

    await page.waitForFunction(() => {
        const major = document.querySelectorAll('.border-orange-500').length;
        const minor = document.querySelectorAll('.border-amber-400').length;
        return major >= 1 && minor >= 1;
    }, { timeout: 60_000 });

    assert.ok(true);
});

test('L2 UI shows delay severity and translates disruption cause (zh-TW)', { timeout: 180_000 }, async (t) => {
    const port = pickAvailablePort();
    const server = await startNextDev(port);
    t.after(async () => {
        await server.close();
    });

    const puppeteerHome = preparePuppeteerHome(`lutagu-ui-home-l2-zh-${port}`);
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
    await seedUserStorage(page, 'zh-TW');
    await page.setRequestInterception(true);

    page.on('request', (req) => {
        const url = req.url();

        if (url.includes('/api/l2/status')) {
            const payload = {
                congestion: 2,
                line_status: [
                    {
                        railway_id: 'odpt.Railway:TokyoMetro.Ginza',
                        name: { ja: '銀座線', en: 'Ginza Line', zh: '銀座線' },
                        operator: 'TokyoMetro',
                        color: '#F9A825',
                        status: 'delay',
                        status_detail: 'delay_major',
                        delay_minutes: 45,
                        message: '変電所の電気設備故障'
                    },
                    {
                        railway_id: 'odpt.Railway:TokyoMetro.Hibiya',
                        name: { ja: '日比谷線', en: 'Hibiya Line', zh: '日比谷線' },
                        operator: 'TokyoMetro',
                        color: '#B71C1C',
                        status: 'delay',
                        status_detail: 'delay_minor',
                        delay_minutes: 10,
                        message: '信号トラブル'
                    }
                ],
                weather: { temp: 20, condition: 'Clear', wind: 2 },
                updated_at: new Date().toISOString()
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

    await page.goto(`${server.url}/zh-TW/?node=odpt.Station:TokyoMetro.Ginza.Ueno&sheet=1&nodeTab=live`, { waitUntil: 'domcontentloaded' });

    await page.waitForFunction(() => {
        return Boolean((window as any).__LUTAGU_NODE_STORE__) && Boolean((window as any).__LUTAGU_UI_STORE__);
    }, { timeout: 60_000 });

    await page.evaluate(() => {
        const nodeStore = (window as any).__LUTAGU_NODE_STORE__;
        const uiStore = (window as any).__LUTAGU_UI_STORE__;
        nodeStore.getState().setCurrentNode('odpt.Station:TokyoMetro.Ginza.Ueno');
        uiStore.getState().setBottomSheetOpen(true);
        uiStore.getState().setNodeActiveTab('live');
    });


    try {
        await waitForActiveTabByIndex(page, 1);
    } catch {
        // If tabs are not rendered yet, continue and let content assertions fail if needed.
    }

    await page.waitForFunction(() => {
        const text = (document.body?.innerText || '').replace(/\s+/g, ' ');
        return text.includes('延誤 45 分') && text.includes('延誤 10 分') && text.includes('變電站設備故障') && text.includes('信號故障');
    }, { timeout: 60_000 });

    await page.waitForFunction(() => {
        const major = document.querySelectorAll('.border-orange-500').length;
        const minor = document.querySelectorAll('.border-amber-400').length;
        return major >= 1 && minor >= 1;
    }, { timeout: 60_000 });

    assert.ok(true);
});
