/**
 * News System
 * Handles news loading, display, and "read more" functionality
 */

/**
 * Initialize read more functionality for news items
 */
function initReadMore() {
    const newsTexts = document.querySelectorAll('.news-text p');
    
    newsTexts.forEach(p => {
        // Save the full text
        const fullText = p.textContent.trim();
        p.setAttribute('data-fulltext', fullText);
        
        // Check if text is likely to be more than 2 lines
        const textLength = fullText.length;
        const lineLength = 60; // Approximate characters per line
        const estimatedLines = Math.ceil(textLength / lineLength);
        
        if (estimatedLines > 2) {
            // Create read more button
            const readMoreBtn = document.createElement('button');
            readMoreBtn.textContent = 'المزيد';
            readMoreBtn.style.cssText = `
                margin-right: 5px;
                cursor: pointer;
                color: #1a73e8;
                font-weight: 600;
                background: none;
                border: none;
                padding: 0 4px;
                text-decoration: underline;
                font-family: inherit;
                font-size: inherit;
                display: block;
                margin-top: 5px;
            `;
            
            // Set initial state (collapsed)
            p.style.overflow = 'hidden';
            p.style.display = '-webkit-box';
            p.style.webkitLineClamp = '2';
            p.style.webkitBoxOrient = 'vertical';
            p.style.textOverflow = 'ellipsis';
            p.style.margin = '0';
            p.style.padding = '0';
            p.style.lineHeight = '1.6';
            p.style.minHeight = 'auto';
            p.style.maxHeight = 'none';
            
            // Toggle function
            const toggleText = (isExpanded) => {
                if (isExpanded) {
                    p.style.webkitLineClamp = 'unset';
                    readMoreBtn.textContent = 'رجوع';
                } else {
                    p.style.webkitLineClamp = '2';
                    readMoreBtn.textContent = 'المزيد';
                }
            };
            
            // Click handler
            readMoreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isExpanded = p.style.webkitLineClamp === 'unset';
                toggleText(!isExpanded);
            });
            
            // Add button after the paragraph
            p.parentNode.appendChild(readMoreBtn);
        }
    });
}

/**
 * Load news from the server
 */
async function loadNews() {
    const newsList = document.querySelector('.news-list');
    if (!newsList) return;

    try {
        const response = await fetch('news.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data.news)) {
            throw new Error('Invalid news data format');
        }

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();

        data.news.forEach(item => {
            const newsItem = document.createElement('div');
            newsItem.className = 'news-item';
            newsItem.innerHTML = `
                <div class="news-header">
                    <img src="logo-gilgamesh.png" alt="جلجامش" class="news-avatar" loading="lazy">
                    <span class="news-company">Gilgamesh Travel
                        <p>الأخبار الرسمية</p>
                    </span>
                </div>
                <div class="news-content">
                    <img src="imgnews/${escapeHtml(item.img)}" alt="News Image" class="news-image" loading="lazy">
                    <h1>${escapeHtml(item.h1)}</h1>
                    <div class="news-text">
                        <p>${escapeHtml(item.p)}</p>
                    </div>
                </div>
            `;
            fragment.appendChild(newsItem);
        });

        newsList.innerHTML = '';
        newsList.appendChild(fragment);
        initReadMore();
    } catch (error) {
        console.error('Error loading news:', error);
        newsList.innerHTML = '<p class="error">حدث خطأ في تحميل الأخبار. يرجى المحاولة مرة أخرى لاحقاً.</p>';
    }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Initialize news system when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Check if news list exists
    const newsList = document.querySelector('.news-list');
    if (newsList) {
        loadNews().catch(console.error);
    }
});