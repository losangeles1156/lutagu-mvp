import { Page } from 'puppeteer';
import { BaseCrawler } from './base_crawler';
import { CrawlerResult } from './types';

export class MatchaJpCrawler extends BaseCrawler {
    protected async extractData(page: Page, url: string): Promise<CrawlerResult> {
        return await page.evaluate((url) => {
            const title = document.querySelector('h1')?.textContent?.trim() || '';
            const content = document.querySelector('.article__main')?.textContent?.trim() ||
                           document.querySelector('article')?.textContent?.trim() || '';

            const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
            const author = document.querySelector('.article__author-name')?.textContent?.trim() || '';
            const publishedAt = document.querySelector('.article__date')?.textContent?.trim() ||
                              document.querySelector('time')?.getAttribute('datetime') || '';

            const tags: string[] = [];
            document.querySelectorAll('.article__tag-btn-place, .article__tag-link').forEach(tag => {
                const tagText = tag.textContent?.trim();
                if (tagText) tags.push(tagText);
            });

            const category = document.querySelector('.c-breadcrumb__item:nth-last-child(2)')?.textContent?.trim() || '';

            return {
                url,
                title,
                content,
                rawHtml: document.documentElement.outerHTML,
                metadata: {
                    author,
                    publishedAt,
                    category,
                    tags,
                    description: metaDescription
                },
                extractedAt: new Date().toISOString()
            };
        }, url);
    }

    async getArticleLinks(pageUrl: string): Promise<string[]> {
        if (!this.browser) await this.init();
        const page = await this.browser!.newPage();
        try {
            await page.setUserAgent(this.getRandomUserAgent());
            await page.goto(pageUrl, { waitUntil: 'networkidle2' });

            const links = await page.evaluate(() => {
                const anchorElements = document.querySelectorAll('a.article__title-link, a[href*="/jp/"]');
                const urls: string[] = [];
                anchorElements.forEach(a => {
                    const href = (a as HTMLAnchorElement).href;
                    // Matcha articles usually look like https://matcha-jp.com/jp/1229
                    if (href && /\/jp\/\d+$/.test(href)) {
                        urls.push(href);
                    }
                });
                return [...new Set(urls)];
            });
            return links;
        } finally {
            await page.close();
        }
    }
}
