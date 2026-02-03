export interface ScrapedContent {
    text: string;
    url: string;
    title: string;
}

class URLScraperService {
    private readonly CORS_PROXY = 'https://api.allorigins.win/get?url=';

    async scrapeURL(url: string): Promise<ScrapedContent> {
        try {
            // Fetch the HTML content via CORS proxy
            const response = await fetch(this.CORS_PROXY + encodeURIComponent(url));

            if (!response.ok) {
                throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const htmlContent = data.contents;

            // Parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');

            // Extract content using the same logic as content.js
            const scrapedText = this.extractContent(doc);
            const title = this.extractTitle(doc);

            return {
                text: scrapedText,
                url: url,
                title: title
            };
        } catch (error: any) {
            console.error('URL Scraping Error:', error);
            throw new Error(`Unable to scrape content from URL: ${error.message}`);
        }
    }

    private extractTitle(doc: Document): string {
        // Try to get the article title
        const titleEl = doc.querySelector('h1') ||
            doc.querySelector('[class*="title"]') ||
            doc.querySelector('[class*="headline"]');

        if (titleEl) {
            return titleEl.textContent?.trim() || '';
        }

        // Fallback to document title
        return doc.title || '';
    }

    private extractContent(doc: Document): string {
        let content = '';

        // Strategy 1: Look for common article containers (most reliable)
        const articleSelectors = [
            'article',
            '[role="article"]',
            '[itemtype*="Article"]',
            '.article-body',
            '.article-content',
            '.story-body',
            '.post-content',
            '.entry-content',
            '.content-body',
            '[class*="article-text"]',
            '[class*="story-content"]',
            '[class*="post-body"]',
            'main article',
            '#article-body',
            '.body-content'
        ];

        for (const selector of articleSelectors) {
            const el = doc.querySelector(selector);
            if (el && el.textContent && el.textContent.length > 200) {
                content = el.textContent;
                break;
            }
        }

        // Strategy 2: If no article container found, get paragraphs from main content area
        if (!content) {
            const mainSelectors = ['main', '[role="main"]', '#content', '.content', '#main'];
            let mainEl: Element | null = null;

            for (const selector of mainSelectors) {
                mainEl = doc.querySelector(selector);
                if (mainEl) break;
            }

            const container = mainEl || doc.body;

            // Get paragraphs, filtering out likely navigation/footer/sidebar content
            const paragraphs = Array.from(container.querySelectorAll('p'))
                .filter(p => {
                    const textContent = p.textContent || '';
                    if (textContent.length < 50) return false; // Skip short paragraphs

                    // Skip paragraphs inside nav, footer, sidebar, ads
                    const parent = p.closest('nav, footer, aside, [class*="sidebar"], [class*="footer"], [class*="nav"], [class*="menu"], [class*="cookie"], [class*="subscribe"], [class*="newsletter"], [class*="comment"], [class*="related"], [class*="recommend"], [class*="advertisement"], [class*="promo"]');
                    if (parent) return false;

                    // Skip paragraphs with too many links (likely navigation)
                    const links = p.querySelectorAll('a');
                    if (links.length > 3 && textContent.length < 200) return false;

                    return true;
                });

            content = paragraphs.map(p => p.textContent?.trim() || '').join('\n\n');
        }

        // Clean up the content
        content = content
            .replace(/\s+/g, ' ')           // Normalize whitespace
            .replace(/\n\s*\n/g, '\n\n')    // Normalize line breaks
            .replace(/Read more.*$/gi, '')   // Remove "Read more" footers
            .replace(/Share this.*$/gi, '')  // Remove share prompts
            .replace(/Subscribe.*$/gi, '')   // Remove subscribe prompts
            .replace(/Advertisement/gi, '')  // Remove ad markers
            .replace(/Cookie.*policy/gi, '') // Remove cookie notices
            .trim();

        // Limit to max 500 words (increased from 400 for better context)
        const words = content.split(/\s+/);
        if (words.length > 500) {
            content = words.slice(0, 500).join(' ') + '...';
        }

        return content;
    }
}

export const urlScraperService = new URLScraperService();
