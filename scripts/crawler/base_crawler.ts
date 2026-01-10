import puppeteer, { Browser, Page } from 'puppeteer';
import { CrawlerResult } from './types';

export abstract class BaseCrawler {
    protected browser: Browser | null = null;
    protected userAgents: string[] = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
    ];

    constructor(protected delayMs: number = 2000) {}

    async init() {
        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    protected getRandomUserAgent(): string {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    protected async sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async crawl(url: string): Promise<CrawlerResult | null> {
        if (!this.browser) await this.init();
        
        const page = await this.browser!.newPage();
        try {
            await page.setUserAgent(this.getRandomUserAgent());
            await page.setViewport({ width: 1280, height: 800 });
            
            console.log(`[Crawler] Visiting: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Wait for dynamic content if needed
            await this.sleep(1000);

            const result = await this.extractData(page, url);
            await this.sleep(this.delayMs);
            return result;
        } catch (error) {
            console.error(`[Crawler] Error crawling ${url}:`, error);
            return null;
        } finally {
            await page.close();
        }
    }

    protected abstract extractData(page: Page, url: string): Promise<CrawlerResult>;
}
