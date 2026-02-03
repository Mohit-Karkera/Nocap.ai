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

// Selection Tool Variables
let selectionOverlay = null;
let selectionBox = null;
let startX = 0, startY = 0;
let isSelecting = false;

function startSelection() {
    // Create overlay
    selectionOverlay = document.createElement('div');
    selectionOverlay.id = 'nocap-selection-overlay';
    selectionOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.3);
        z-index: 2147483647;
        cursor: crosshair;
    `;

    // Create selection box
    selectionBox = document.createElement('div');
    selectionBox.id = 'nocap-selection-box';
    selectionBox.style.cssText = `
        position: fixed;
        border: 2px dashed #6366f1;
        background: rgba(99, 102, 241, 0.1);
        z-index: 2147483648;
        pointer-events: none;
        display: none;
    `;

    document.body.appendChild(selectionOverlay);
    document.body.appendChild(selectionBox);

    // Event handlers
    selectionOverlay.addEventListener('mousedown', handleMouseDown);
    selectionOverlay.addEventListener('mousemove', handleMouseMove);
    selectionOverlay.addEventListener('mouseup', handleMouseUp);
}

function handleMouseDown(e) {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
}

function handleMouseMove(e) {
    if (!isSelecting) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const left = Math.min(currentX, startX);
    const top = Math.min(currentY, startY);

    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
}

function handleMouseUp(e) {
    if (!isSelecting) return;
    isSelecting = false;

    const rect = selectionBox.getBoundingClientRect();
    
    // Extract text within the selection
    const selectedText = extractTextFromRect(rect);

    // Clean up overlay
    if (selectionOverlay) selectionOverlay.remove();
    if (selectionBox) selectionBox.remove();

    // Show toast notification
    showToast('Selection captured! Re-open extension to analyze.');

    // Store the selected text
    chrome.storage.local.set({ pending_selection: selectedText });
}

function extractTextFromRect(rect) {
    const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, li, a, div');
    let selectedText = '';

    elements.forEach(el => {
        const elRect = el.getBoundingClientRect();
        
        // Check if element is within selection bounds
        if (
            elRect.left >= rect.left &&
            elRect.right <= rect.right &&
            elRect.top >= rect.top &&
            elRect.bottom <= rect.bottom
        ) {
            const text = el.innerText?.trim();
            if (text && text.length > 10) {
                selectedText += text + '\n\n';
            }
        }
    });

    return selectedText.trim() || 'No text found in selection';
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1e293b;
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: 600;
        font-size: 14px;
        z-index: 2147483649;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrape') {
        const text = scrapeContent();
        const title = document.title;
        sendResponse({ text, url: window.location.href, title });
    } else if (request.action === 'start-selection') {
        startSelection();
        sendResponse({ success: true });
    }
    return true;
});
