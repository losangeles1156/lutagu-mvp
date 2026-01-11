import { Page } from 'puppeteer';
import { BaseCrawler } from './base_crawler';
import { CrawlerResult } from './types';

export class TokyoLetsgojpCrawler extends BaseCrawler {
    protected async extractData(page: Page, url: string): Promise<CrawlerResult> {
        const pageTitle = await page.title();
        console.log(`[TokyoLetsgojp] Page Title from Browser: ${pageTitle}`);

        return await page.evaluate((url) => {
            const title = document.querySelector('h1')?.textContent?.trim() || 
                          document.querySelector('.article-title')?.textContent?.trim() ||
                          document.querySelector('.entry-title')?.textContent?.trim() || 
                          document.querySelector('.title-area h1')?.textContent?.trim() || '';
            
            const contentElement = document.querySelector('article') || 
                                  document.querySelector('.article-content') || 
                                  document.querySelector('.entry-content') ||
                                  document.querySelector('#main-content') ||
                                  document.querySelector('.article-body');
            
            // Remove scripts, styles, and ads from content
            if (contentElement) {
                const cleanContent = contentElement.cloneNode(true) as HTMLElement;
                cleanContent.querySelectorAll('script, style, .ads, .ad-container').forEach(el => el.remove());
                var content = cleanContent.textContent?.trim() || '';
            } else {
                var content = '';
            }
            
            const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
            const author = document.querySelector('.author-name')?.textContent?.trim() || 
                          document.querySelector('.entry-author')?.textContent?.trim() || '';
            const publishedAt = document.querySelector('.publish-date')?.textContent?.trim() || 
                              document.querySelector('time')?.getAttribute('datetime') || 
                              document.querySelector('.entry-date')?.textContent?.trim() || '';
            
            const tags: string[] = [];
            document.querySelectorAll('.tag-item, .article-tags a, .entry-tags a').forEach(tag => {
                const tagText = tag.textContent?.trim();
                if (tagText) tags.push(tagText);
            });

            const category = document.querySelector('.breadcrumb-item:nth-last-child(2)')?.textContent?.trim() || 
                            document.querySelector('.entry-category')?.textContent?.trim() || '';

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
                const anchorElements = document.querySelectorAll('a');
                const urls: string[] = [];
                anchorElements.forEach(a => {
                    const href = a.href;
                    if (href && href.includes('/articles/') && !href.includes('/category/')) {
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
