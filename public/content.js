function scrapeContent() {
    // Prefer <article> tag
    let content = '';
    const article = document.querySelector('article');

    if (article) {
        content = article.innerText;
    } else {
        // Fallback to visible <p> elements
        const paragraphs = Array.from(document.querySelectorAll('p'))
            .filter(p => {
                const style = window.getComputedStyle(p);
                return style.display !== 'none' && style.visibility !== 'hidden' && p.innerText.length > 20;
            });
        content = paragraphs.map(p => p.innerText).join('\n');
    }

    // Clean up text
    content = content
        .replace(/\s+/g, ' ')
        .trim();

    // Limit to max 400 words
    const words = content.split(' ');
    if (words.length > 400) {
        content = words.slice(0, 400).join(' ');
    }

    return content;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrape') {
        const text = scrapeContent();
        sendResponse({ text, url: window.location.href });
    }
    return true;
});
