function scrapeContent() {
    let content = '';
    let title = '';

    // Try to get the article title
    const titleEl = document.querySelector('h1') || document.querySelector('[class*="title"]') || document.querySelector('[class*="headline"]');
    if (titleEl) {
        title = titleEl.innerText.trim();
    }

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
        const el = document.querySelector(selector);
        if (el && el.innerText.length > 200) {
            content = el.innerText;
            break;
        }
    }

    // Strategy 2: If no article container found, get paragraphs from main content area
    if (!content) {
        const mainSelectors = ['main', '[role="main"]', '#content', '.content', '#main'];
        let mainEl = null;

        for (const selector of mainSelectors) {
            mainEl = document.querySelector(selector);
            if (mainEl) break;
        }

        const container = mainEl || document.body;

        // Get paragraphs, filtering out likely navigation/footer/sidebar content
        const paragraphs = Array.from(container.querySelectorAll('p'))
            .filter(p => {
                const style = window.getComputedStyle(p);
                if (style.display === 'none' || style.visibility === 'hidden') return false;
                if (p.innerText.length < 50) return false; // Skip short paragraphs

                // Skip paragraphs inside nav, footer, sidebar, ads
                const parent = p.closest('nav, footer, aside, [class*="sidebar"], [class*="footer"], [class*="nav"], [class*="menu"], [class*="cookie"], [class*="subscribe"], [class*="newsletter"], [class*="comment"], [class*="related"], [class*="recommend"], [class*="advertisement"], [class*="promo"]');
                if (parent) return false;

                // Skip paragraphs with too many links (likely navigation)
                const links = p.querySelectorAll('a');
                if (links.length > 3 && p.innerText.length < 200) return false;

                return true;
            });

        content = paragraphs.map(p => p.innerText.trim()).join('\n\n');
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

    // Prepend title if we have it
    if (title && !content.toLowerCase().startsWith(title.toLowerCase().substring(0, 20))) {
        content = title + '\n\n' + content;
    }

    // Limit to max 500 words (increased from 400 for better context)
    const words = content.split(/\s+/);
    if (words.length > 500) {
        content = words.slice(0, 500).join(' ') + '...';
    }

    console.log(`[NoCap.ai] Scraped ${words.length} words from ${window.location.href}`);

    return content;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrape') {
        const text = scrapeContent();
        const title = document.title;
        sendResponse({ text, url: window.location.href, title });
    }
    return true;
});
