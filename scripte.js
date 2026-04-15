    /**
 * Flight Tickets Booking System
 * Handles ticket display, search, and news functionality
 */

// Global variables
let grid = null;
let allTickets = [];
let searchButton = null;
let menuToggle = null;
let navLinks = null;
let navItems = [];

/**
 * DOM Elements
 */
const DOM = {
    get grid() { return document.getElementById('grid'); },
    get searchButton() { return document.getElementById('rus'); },
    get menuToggle() { return document.getElementById('menuToggle'); },
    get navLinks() { return document.querySelector('.nav-links'); },
    get navItems() { return document.querySelectorAll('.navbar'); }
};

/**
 * Initialize the application
 */
function initializeApp() {
    // Initialize DOM elements
    grid = DOM.grid;
    searchButton = DOM.searchButton;
    menuToggle = DOM.menuToggle;
    navLinks = DOM.navLinks;
    navItems = Array.from(DOM.navItems);

    // Initialize autocomplete system
    autocompleteSystem = new AutocompleteSystem();
    autocompleteSystem.init().catch(console.error);

    // Initialize features based on current page
    if (grid) {
        loadTickets().catch(console.error);
    }

    if (menuToggle && navLinks) {
        setupMobileMenu();
    }
}

/**
 * Display tickets in the grid
 * @param {Array} tickets - Array of ticket objects to display
 */
function displayTickets(tickets = []) {
    if (!grid) return;

    // Clear the grid
    grid.innerHTML = '';

    if (!tickets.length) {
        grid.innerHTML = '<p class="no-results">لا توجد نتائج مطابقة للبحث</p>';
        return;
    }

    // Create document fragment for better performance
    const fragment = document.createDocumentFragment();

    tickets.forEach(ticket => {
        const ticketElement = createTicketElement(ticket);
        fragment.appendChild(ticketElement);
    });

    grid.appendChild(fragment);
}

/**
 * Create a ticket element
 * @param {Object} ticket - Ticket data
 * @returns {HTMLElement} - Created ticket element
 */
function createTicketElement(ticket) {
    const ticketElement = document.createElement('div');
    ticketElement.className = 'ticket';
    
    // Add premium class styling based on ticket class
    const ticketClass = getTicketClassColor(ticket.daraga);
    if (ticketClass === 'business') {
        ticketElement.classList.add('business-class');
    } else if (ticketClass === 'first-class') {
        ticketElement.classList.add('first-class-card');
    }
    
    ticketElement.innerHTML = `
        <div class="ticket-header">
            <img src="/img/${ticket.img}" alt="صورة الرحلة" class="ticket-image" loading="lazy">
        </div>
        <div class="airline-info">
            <img src="/logo/${ticket.logo}" alt="شعار الطيران" class="airline-logo" loading="lazy">
            <h3 class="airline-name">${escapeHtml(ticket.arlinename || 'شركة الطيران')}</h3>
        </div>
        <div class="ticket-details">
            <div class="route">
                <div class="city from">
                    <span class="city-name">${escapeHtml(ticket.namecity || 'المدينة')}</span>
                    <span class="city-code">${escapeHtml(ticket.citycodename || '---')}</span>
                </div>
                <div class="flight-direction">
                    <span class="to-text">إلى</span>
                    <div class="flight-icon">
                        <i class="fas fa-arrow-left"></i>
                    </div>
                </div>
                <div class="city to">
                    <span class="city-name">${escapeHtml(ticket.direction || 'الوجهة')}</span>
                    <span class="city-code">${escapeHtml(ticket.directioncode || '---')}</span>
                </div>
            </div>
            <div class="flight-details">
                <div class="detail">
                    <span class="label">الدرجة:</span>
                    <span class="value ${getTicketClassColor(ticket.daraga)}">${escapeHtml(ticket.daraga || 'اقتصادية')}</span>
                </div>
                <div class="detail">
                    <span class="label">أيام الرحلات:</span>
                    <span class="value">${escapeHtml(ticket.daysfly || 'يوميًا')}</span>
                </div>
            </div>
            <div class="prices">
                <div class="price-option">
                    <span class="price">$${escapeHtml(ticket.pricego || '---')}</span>
                    <span class="type">ذهاب فقط</span>
                    <button class="book-btn" onclick="openBookingModal(${JSON.stringify(ticket).replace(/"/g, '&quot;')}, 'ذهاب فقط')">احجز الآن</button>
                </div>
                <div class="price-option highlight">
                    <span class="price">$${escapeHtml(ticket.priceback || '---')}</span>
                    <span class="type">ذهاب وعودة</span>
                    <button class="book-btn primary" onclick="openBookingModal(${JSON.stringify(ticket).replace(/"/g, '&quot;')}, 'ذهاب وعودة')">احجز الآن</button>
                </div>
            </div>
        </div>`;
    
    // Set background color for first class tickets after HTML is created
    if (ticketClass === 'first-class') {
        const detailElements = ticketElement.querySelectorAll('.detail');
        detailElements.forEach(detail => {
            detail.style.backgroundColor = 'beige';
        });
    }
    else if (ticketClass === 'business') {
        const detailElements = ticketElement.querySelectorAll('.detail');
        detailElements.forEach(detail => {
            detail.style.backgroundColor = 'rgb(113 127 248 / 28%)';
        });
    }
    return ticketElement;
}

/**
 * Get ticket class color based on daraga value
 * @param {string} daraga - Ticket class
 * @returns {string} CSS class name
 */
function getTicketClassColor(daraga) {
    if (!daraga) return 'economy';
    
    switch (daraga) {
        case 'الدرجة الإقتصادية':
            return 'economy';
        case 'درجة رجال الأعمال':
            return 'business';
        case 'الدرجة الأولى':
            return 'first-class';
        default:
            return 'economy';
    }
}
 
/**
 * Set destination input value
 * @param {string} value - Value to set
 */
function setDestination(value) {
    const destinationInput = document.getElementById('destinationInput');
    if (destinationInput) {
        destinationInput.value = value;
    }
}

/**
 * Filter tickets based on search criteria
 */
function filterTickets() {
    if (!grid) return;

    // Show loading notification
    showSearchNotification('جاري البحث عن التذاكر...');

    const departure = (document.getElementById('locationInputnow')?.value || '').trim();
    const destination = (document.getElementById('destinationInput')?.value || '').trim();
    const airline = (document.getElementById('airlineInput')?.value || '').trim();

    const filteredTickets = allTickets.filter(ticket => {
        const matchesDeparture = !departure || 
            arabicTextMatch(departure, ticket.namecity) ||
            arabicTextMatch(departure, ticket.citycodename);
        
        const matchesDestination = !destination || 
            arabicTextMatch(destination, ticket.direction) ||
            arabicTextMatch(destination, ticket.directioncode);
        
        const matchesAirline = !airline || 
            arabicTextMatch(airline, ticket.arlinename);
        
        return matchesDeparture && matchesDestination && matchesAirline;
    });

    // Display tickets
    displayTickets(filteredTickets);

    // Scroll to results after a short delay
    setTimeout(() => {
        scrollToResults();
        
        // Update notification based on results
        if (filteredTickets.length > 0) {
            showSearchNotification(`تم العثور على ${filteredTickets.length} تذكرة`, 'success');
        } else {
            showSearchNotification('لا توجد نتائج مطابقة للبحث', 'warning');
        }
    }, 500);
}

/**
 * Scroll to results section
 */
function scrollToResults() {
    const resultsSection = document.getElementById('grid');
    if (resultsSection) {
        // Check if mobile device
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Mobile-specific scroll behavior
            const rect = resultsSection.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const targetPosition = rect.top + scrollTop - 80; // 80px offset for mobile
            
            // Use different scroll method for mobile
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
            
            // Add highlight effect for mobile
            setTimeout(() => {
                resultsSection.style.animation = 'highlightResults 1s ease';
                setTimeout(() => {
                    resultsSection.style.animation = '';
                }, 1000);
            }, 300);
            
        } else {
            // Desktop scroll behavior
            resultsSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });

            // Add small offset to ensure it's below search bar
            setTimeout(() => {
                const currentScroll = window.pageYOffset;
                window.scrollTo({
                    top: currentScroll + 0, // إضافة 50px فقط تحت شريط البحث
                    behavior: 'smooth'
                });
            }, 200);

            // Add highlight effect to results
            resultsSection.style.animation = 'highlightResults 1s ease';
            setTimeout(() => {
                resultsSection.style.animation = '';
            }, 1000);
        }
    }
}

/**
 * Show search notification
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (loading, success, warning)
 */
function showSearchNotification(message, type = 'loading') {
    // Remove existing notification
    const existingNotification = document.querySelector('.search-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'search-notification';
    notification.textContent = message;

    // Set styles based on type
    let bgColor, textColor, icon;
    switch (type) {
        case 'success':
            bgColor = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
            textColor = '#ffffff';
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'warning':
            bgColor = 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)';
            textColor = '#ffffff';
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        default: // loading
            bgColor = 'linear-gradient(135deg, #1a3b6b 0%, #2c5282 100%)';
            textColor = '#ffffff';
            icon = '<i class="fas fa-search"></i>';
    }

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: ${textColor};
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 250px;
        animation: slideInNotification 0.3s ease;
    `;

    notification.innerHTML = `${icon} ${message}`;

    // Add animation styles
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInNotification {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            @keyframes highlightResults {
                0% {
                    box-shadow: 0 0 0 rgba(0, 87, 184, 0);
                }
                50% {
                    box-shadow: 0 0 20px rgba(0, 87, 184, 0.3);
                }
                100% {
                    box-shadow: 0 0 0 rgba(0, 87, 184, 0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Add to body
    document.body.appendChild(notification);

    // Auto-remove for loading notifications
    if (type === 'loading') {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInNotification 0.3s ease reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 2000);
    } else {
        // Remove success/warning notifications after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInNotification 0.3s ease reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }
}

/**
 * Load tickets from the server
 */
async function loadTickets() {
    if (!grid) return;

    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        allTickets = Array.isArray(data.data) ? data.data : [];
        
        if (searchButton) {
            searchButton.addEventListener('click', filterTickets);
        }
        
        displayTickets(allTickets);
    } catch (error) {
        console.error('Error loading tickets:', error);
        if (grid) {
            grid.innerHTML = '<p class="error">حدث خطأ في تحميل بيانات التذاكر. يرجى المحاولة مرة أخرى لاحقًا.</p>';
        }
    }
}

/**
 * Set up mobile menu functionality
 */
function setupMobileMenu() {
    if (!menuToggle || !navLinks) return;

    const closeMenu = () => {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.classList.remove('menu-open');
        navLinks.style.display = 'none';
    };

    // Toggle menu on button click
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.classList.toggle('menu-open');
        navLinks.style.display = isOpen ? 'flex' : 'none';
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            !menuToggle.contains(e.target) && 
            !navLinks.contains(e.target)) {
            closeMenu();
        }
    });

    // Close menu when clicking on a nav item
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeMenu();
            }
            setActiveNav(item);
        });
    });

    // Handle window resize
    const handleResize = () => {
        if (window.innerWidth > 768) {
            // Desktop view
            closeMenu();
            navLinks.style.display = 'flex';
        } else {
            // Mobile view
            menuToggle.style.display = 'flex';
            if (!navLinks.classList.contains('active')) {
                navLinks.style.display = 'none';
            }
        }
    };

    // Initial setup
    handleResize();
    window.addEventListener('resize', handleResize);
}

/**
 * Set active navigation item
 * @param {HTMLElement} activeItem - The active navigation item
 */
function setActiveNav(activeItem = null) {
    if (!navItems.length) return;

    navItems.forEach(item => {
        item.classList.remove('active-nav');
    });

    if (activeItem) {
        activeItem.classList.add('active-nav');
        return;
    }

    // Auto-detect active nav based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    navItems.forEach(item => {
        const itemHref = item.getAttribute('href');
        if (currentPage === itemHref || 
            (currentPage === '' && itemHref === 'index.html') ||
            (currentPage.includes(itemHref) && itemHref !== 'index.html')) {
            item.classList.add('active-nav');
        }
    });
}


/**
 * Normalize Arabic text for better matching
 * @param {string} str - String to normalize
 * @returns {string} - Normalized string
 */
function normalizeArabicText(str) {
    if (typeof str !== 'string') return '';
    
    return str
        // Remove diacritics (تشكيل)
        .replace(/[\u064B-\u0652]/g, '')
        // Replace Arabic letter variations
        .replace(/أ/g, 'ا')
        .replace(/إ/g, 'ا')
        .replace(/آ/g, 'ا')
        .replace(/ه/g, 'ة')
        // Remove all spaces first for flexible matching
        .replace(/\s+/g, '')
        .trim()
        .toLowerCase();
}

/**
 * Check if two Arabic strings match (flexible matching)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {boolean} - True if strings match
 */
function arabicTextMatch(str1, str2) {
    if (!str1 || !str2) return false;
    
    const normalized1 = normalizeArabicText(str1);
    const normalized2 = normalizeArabicText(str2);
    
    // Direct match or partial match
    if (normalized1 === normalized2 || 
        normalized1.includes(normalized2) || 
        normalized2.includes(normalized1)) {
        return true;
    }
    
    // Special case for airline keywords - check word by word
    const words1 = str1.trim().split(/\s+/);
    const words2 = str2.trim().split(/\s+/);
    
    // Check if any word from str1 matches any word from str2
    for (const word1 of words1) {
        if (word1.length < 2) continue; // Skip very short words
        
        const normalizedWord1 = normalizeArabicText(word1);
        for (const word2 of words2) {
            if (word2.length < 2) continue;
            
            const normalizedWord2 = normalizeArabicText(word2);
            if (normalizedWord1 === normalizedWord2 || 
                normalizedWord1.includes(normalizedWord2) || 
                normalizedWord2.includes(normalizedWord1)) {
                return true;
            }
        }
    }
    
    return false;
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

// Initialize the application when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOMContentLoaded has already fired
    setTimeout(initializeApp, 0);
}

/**
 * Autocomplete functionality for search inputs
 */

class AutocompleteSystem {
    constructor() {
        this.cities = [];
        this.airlines = [];
        this.currentInput = null;
        this.currentSuggestions = null;
        this.selectedIndex = -1;
        this.debounceTimer = null;
    }

    /**
     * Initialize autocomplete system
     */
    async init() {
        await this.loadData();
        this.setupEventListeners();
    }

    /**
     * Load data from JSON file
     */
    async loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error('Failed to load data');
            
            const data = await response.json();
            const tickets = Array.isArray(data.data) ? data.data : [];
            
            // Extract unique cities and airlines
            const citiesSet = new Set();
            const airlinesSet = new Set();
            
            tickets.forEach(ticket => {
                // Add departure cities only for location input
                if (ticket.namecity) {
                    citiesSet.add(ticket.namecity);
                }
                
                // Add destination cities only for destination input
                if (ticket.direction) {
                    if (ticket.directioncode) {
                        citiesSet.add(`${ticket.direction} `);
                    }
                }
                
                // Add airlines
                if (ticket.arlinename) {
                    airlinesSet.add(ticket.arlinename);
                }
            });
            
            this.cities = Array.from(citiesSet).sort();
            this.airlines = Array.from(airlinesSet).sort();
            
        } catch (error) {
            console.error('Error loading autocomplete data:', error);
        }
    }

    /**
     * Setup event listeners for search inputs
     */
    setupEventListeners() {
        // Location input
        const locationInput = document.getElementById('locationInputnow');
        if (locationInput) {
            this.setupInputListeners(locationInput, 'current');
        }
        
        // Destination input
        const destinationInput = document.getElementById('destinationInput');
        if (destinationInput) {
            this.setupInputListeners(destinationInput, 'destination');
        }
        
        // Airline input
        const airlineInput = document.getElementById('airlineInput');
        if (airlineInput) {
            this.setupInputListeners(airlineInput, 'airline');
        }
        
        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-input-container')) {
                this.hideAllSuggestions();
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.currentSuggestions && this.currentSuggestions.style.display !== 'none') {
                this.handleKeyNavigation(e);
            }
        });
        
    }

    /**
     * Setup listeners for a specific input
     */
    setupInputListeners(input, type) {
        const suggestionsContainer = input.parentElement.querySelector('.suggestions');
        
        // Input event with debouncing
        input.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.handleInput(e.target, type, suggestionsContainer);
            }, 150);
        });
    }

    /**
     * Handle input and show suggestions
     */
    handleInput(input, type, suggestionsContainer) {
        const query = input.value.trim();
        
        if (query.length < 1) {
            suggestionsContainer.style.display = 'none';
            suggestionsContainer.innerHTML = "";
            return;
        }
        
        let suggestions = [];
        
        if (type === 'airline') {
            suggestions = this.airlines.filter(item => 
                arabicTextMatch(query, item)
            );
        } else if (type === 'current') {
            // Show only departure cities for current location
            suggestions = this.getDepartureCities().filter(item => 
                arabicTextMatch(query, item)
            );
        } else {
            // Show all cities for destination
            suggestions = this.cities.filter(item => 
                arabicTextMatch(query, item)
            );
        }
        
        this.showSuggestions(suggestions, input, suggestionsContainer, type);
    }

    /**
     * Get only departure cities
     */
    getDepartureCities() {
        const departureCities = new Set();
        if (this.state && this.state.data) {
            this.state.data.forEach(ticket => {
                if (ticket.namecity) {
                    departureCities.add(ticket.namecity);
                }
            });
        }
        return Array.from(departureCities).sort();
    }

    /**
     * Show suggestions dropdown
     */
    showSuggestions(suggestions, input, container, type) {
        this.currentInput = input;
        this.currentSuggestions = container;
        this.selectedIndex = -1;
        
        // Remove duplicates and limit suggestions
        const uniqueSuggestions = [...new Set(suggestions)];
        
        if (uniqueSuggestions.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        // Limit suggestions to 8 items
        const limitedSuggestions = uniqueSuggestions.slice(0, 8);
        
        container.innerHTML = limitedSuggestions.map((suggestion, index) => {
            const displayName = this.escapeHtml(suggestion);
            const highlightedName = this.highlightMatch(suggestion, input.value.trim());
            
            return `
                <div class="suggestion-item" data-index="${index}" data-value="${displayName}">
                    <i class="fas ${type === 'airline' ? 'fa-plane' : 'fa-map-marker-alt'}"></i>
                    <span class="suggestion-text">${highlightedName}</span>
                </div>
            `;
        }).join('');
        
        container.style.display = 'block';
        
        // Add click listeners to suggestion items
        container.querySelectorAll('.suggestion-item').forEach(item => {
            
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                const value = item.getAttribute('data-value');
                input.value = value;
                
                container.style.display = 'none';
                container.innerHTML = "";
                
                // Hide all suggestions immediately
                document.querySelectorAll('.suggestions').forEach(s => {
                    s.style.display = 'none';
                    s.innerHTML = "";
                });
                
                // Reset current suggestions reference
                this.currentSuggestions = null;
                this.currentInput = null;
                this.selectedIndex = -1;
                
            });
            
        });
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyNavigation(e) {
        const items = this.currentSuggestions.querySelectorAll('.suggestion-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
            this.updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
            this.updateSelection(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
                items[this.selectedIndex].click();
                
                
            }
        } else if (e.key === 'Escape') {
            this.hideAllSuggestions();
        }
    }

    /**
     * Update selected item styling
     */
    updateSelection(items) {
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    /**
     * Hide all suggestion containers
     */
    hideAllSuggestions() {
        document.querySelectorAll('.suggestions').forEach(container => {
            container.style.display = 'none';
        });
        this.currentInput = null;
        this.currentSuggestions = null;
        this.selectedIndex = -1;
    }

    /**
     * Highlight matching text
     */
    highlightMatch(text, query) {
        if (!query) return this.escapeHtml(text);
        
        const escapedText = this.escapeHtml(text);
        const escapedQuery = this.escapeHtml(query);
        
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return escapedText.replace(regex, '<mark>$1</mark>');
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// Initialize autocomplete system
let autocompleteSystem;

function sug(i){
    const destinationInput = document.getElementById('destinationInput');
    if (destinationInput) {
        destinationInput.value = i;
        filterTickets();
    }
}

/**
 * Set up mobile menu functionality
 */
function setupMobileMenu() {
    if (!menuToggle || !navLinks) return;

    // Toggle menu on button click
    menuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        this.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.classList.toggle('menu-open');
        
        // Toggle display property
        if (navLinks.classList.contains('active')) {
            navLinks.style.display = 'flex';
        } else {
            navLinks.style.display = 'none';
        }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && !menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
            menuToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.classList.remove('menu-open');
            navLinks.style.display = 'none';
        }
    });
    
    // Close menu when clicking on a nav item
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.classList.remove('menu-open');
                navLinks.style.display = 'none';
            }
            // Update active state
            document.querySelectorAll('.navbar').forEach(navItem => {
                navItem.classList.remove('active-nav');
            });
            this.classList.add('active-nav');
        });
    });
    
    // Set active nav on page load
    setActiveNav();
    
    // Handle window resize
    const handleResize = () => {
        if (window.innerWidth > 768) {
            // Desktop view
            menuToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.classList.remove('menu-open');
            navLinks.style.display = 'flex';
        } else {
            // Mobile view
            menuToggle.style.display = 'flex';
            if (!navLinks.classList.contains('active')) {
                navLinks.style.display = 'none';
            }
        }
    };
    
    // Initial check
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
}

/**
 * Booking Modal Functions
 */

// Global variable to store current ticket info
let currentTicketDestination = null;
let currentTicketType = null;

/**
 * Open booking modal
 */
function openBookingModal(ticket, ticketType = null) {
    const modal = document.getElementById('bookingModal');
    if (modal) {
        // Store ticket destination if provided
        if (ticket) {
            currentTicketDestination = ticket.direction || 'الرحلات المتاحة';
            // Store ticket type from parameter or determine from prices
            if (ticketType) {
                currentTicketType = ticketType;
            } else {
                // Default logic: if both prices exist, assume return trip
                if (ticket.priceback && ticket.priceback !== '---') {
                    currentTicketType = 'ذهاب وعودة';
                } else if (ticket.pricego && ticket.pricego !== '---') {
                    currentTicketType = 'ذهاب فقط';
                } else {
                    currentTicketType = null;
                }
            }
        }
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent body scroll
    }
}

/**
 * Close booking modal
 */
function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore body scroll
        // Clear stored ticket info
        currentTicketDestination = null;
        currentTicketType = null;
    }
}

/**
 * Copy phone number to clipboard
 */
function copyPhoneNumber() {
    const phoneNumber = document.getElementById('phoneNumber').textContent;
    const copyBtn = event.target.closest('.copy-btn');
    
    // Create temporary textarea to copy text
    const textarea = document.createElement('textarea');
    textarea.value = phoneNumber;
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    
    // Select and copy text
    textarea.select();
    document.execCommand('copy');
    
    // Remove textarea
    document.body.removeChild(textarea);
    
    // Show copied state
    if (copyBtn) {
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        
        // Reset button after 2 seconds
        setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
    }
    
    // Show notification
    showNotification('تم نسخ الرقم بنجاح!');
}

/**
 * Open WhatsApp with pre-filled message
 */
function openWhatsApp() {
    const phoneNumber = document.getElementById('phoneNumber').textContent;
    
    // Use stored destination first, then try to get from hovered ticket
    let destination = currentTicketDestination;
    
    if (!destination) {
        const activeTicket = document.querySelector('.ticket:hover, .ticket.selected, .ticket-card:hover');
        if (activeTicket) {
            const destinationElement = activeTicket.querySelector('.city.to .city-name, .direction');
            if (destinationElement) {
                destination = destinationElement.textContent.trim();
            }
        }
    }
    
    // Fallback to default
    if (!destination) {
        destination = 'الرحلات المتاحة';
    }
    
    // Build message with ticket type if available
    let message = `مرحباً.. أود الاستفسار عن رحلة إلى ${destination}`;
    if (currentTicketType) {
        message += ` (${currentTicketType})`;
    }
    message += ` ✈️`;
    
    // Remove spaces and special characters from phone number
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');
}

/**
 * Show notification message
 * @param {string} message - Message to display
 */
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        z-index: 10000;
        font-weight: 600;
        animation: slideInRight 0.3s ease;
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `;
    document.head.appendChild(style);
    
    // Add to body
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

/**
 * Close modal on ESC key
 */
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeBookingModal();
    }
});

/**
 * Close modal on overlay click
 */
document.addEventListener('click', function(event) {
    const modal = document.getElementById('bookingModal');
    if (modal && event.target === modal.querySelector('.modal-overlay')) {
        closeBookingModal();
    }
});

/**
 * Professional Carousel System
 * Advanced carousel with dynamic data loading, smooth animations, and responsive design
 */
class ProfessionalCarousel {
    constructor(options = {}) {
        // Configuration options
        this.options = {
            containerSelector: '.tickets-carousel',
            trackSelector: '#ticketsTrack',
            prevBtnSelector: '#prevBtn', // Fixed selector
            nextBtnSelector: '#nextBtn', // Fixed selector
            dataUrl: 'data.json',
            autoPlay: true,
            autoPlayInterval: 4000,
            pauseOnHover: true,
            slidesPerView: this.calculateSlidesPerView(),
            spaceBetween: 20,
            transitionDuration: 500,
            transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            infiniteLoop: true, // Enable infinite loop
            ...options
        };

        // State management
        this.state = {
            currentIndex: 0,
            totalSlides: 0,
            isAnimating: false,
            isAutoPlaying: false,
            isPaused: false,
            touchStartX: 0,
            touchEndX: 0,
            slides: [],
            data: [],
            isLoading: false,
            hasError: false
        };

        // DOM elements cache
        this.elements = {};
        
        // Auto-play timer
        this.autoPlayTimer = null;

        // Performance optimization
        this.rafId = null;
        this.resizeDebounceTimer = null;
    }

    /**
     * Calculate slides per view based on screen size
     */
    calculateSlidesPerView() {
        const width = window.innerWidth;
        if (width >= 1200) return 3;
        if (width >= 768) return 2;
        return 1;
    }

    /**
     * Initialize the carousel
     */
    async init() {
        try {
            this.cacheElements();
            this.setupEventListeners();
            await this.loadData();
            
            if (this.state.data.length > 0) {
                this.createSlides();
                this.updateIndicators();
                this.updateButtons();
                this.startAutoPlay();
                this.setupAccessibility();
            } else {
                this.showError('لا توجد بيانات متاحة');
            }
        } catch (error) {
            console.error('Carousel initialization error:', error);
            this.showError('فشل في تحميل الكاروسيل');
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            container: document.querySelector(this.options.containerSelector),
            track: document.querySelector(this.options.trackSelector),
            prevBtn: document.querySelector(this.options.prevBtnSelector),
            nextBtn: document.querySelector(this.options.nextBtnSelector)
        };

        // Validate elements
        Object.entries(this.elements).forEach(([key, element]) => {
            if (!element) {
                throw new Error(`Element not found: ${key}`);
            }
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation buttons
        this.elements.prevBtn.addEventListener('click', () => this.prev());
        this.elements.nextBtn.addEventListener('click', () => this.next());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.next(); // Left arrow = next in RTL
            if (e.key === 'ArrowRight') this.prev(); // Right arrow = previous in RTL
            if (e.key === ' ') {
                e.preventDefault();
                this.toggleAutoPlay();
            }
        });

        // Touch events for mobile
        this.elements.track.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        this.elements.track.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });

        // Mouse events for desktop
        this.elements.track.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.elements.track.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.elements.track.addEventListener('mouseleave', () => this.handleMouseLeave());

        // Pause on hover
        if (this.options.pauseOnHover) {
            this.elements.container.addEventListener('mouseenter', () => this.pause());
            this.elements.container.addEventListener('mouseleave', () => this.resume());
        }

        // Window resize with debouncing
        window.addEventListener('resize', () => this.handleResize());

        // Visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
    }

    /**
     * Load data from JSON file
     */
    async loadData() {
        this.state.isLoading = true;
        this.showLoading();

        try {
            const response = await fetch(this.options.dataUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.state.data = Array.isArray(data.data) ? data.data : [];
            this.state.totalSlides = this.state.data.length;
            this.state.isLoading = false;
            this.hideLoading();

        } catch (error) {
            this.state.isLoading = false;
            this.state.hasError = true;
            this.hideLoading();
            throw error;
        }
    }

    /**
     * Create slide elements from data
     */
    createSlides() {
        if (!this.elements.track) return;

        // Clear existing slides
        this.elements.track.innerHTML = '';
        this.state.slides = [];

        // Create document fragment for performance
        const fragment = document.createDocumentFragment();

        this.state.data.forEach((ticket, index) => {
            const slide = this.createSlideElement(ticket, index);
            fragment.appendChild(slide);
            this.state.slides.push(slide);
        });

        // Append all slides at once
        this.elements.track.appendChild(fragment);

        // Apply initial transform
        this.updateSlidePosition();
    }

    /**
     * Create individual slide element
     */
    createSlideElement(ticket, index) {
        const slide = document.createElement('div');
        slide.className = 'ticket-card';
        slide.setAttribute('data-index', index);
        slide.setAttribute('aria-hidden', 'false'); // Always active
        slide.setAttribute('role', 'tabpanel');
        slide.setAttribute('aria-label', `رحلة ${index + 1} من ${this.state.totalSlides}`);

        // Get ticket class styling
        const ticketClass = this.getTicketClassColor(ticket.daraga);

        slide.innerHTML = `
            <img src="img/${ticket.img}" alt="${this.escapeHtml(ticket.direction)}" class="ticket-image" loading="lazy">
            <div class="ticket-info-overlay">
                <h3 class="ticket-destination">${this.escapeHtml(ticket.direction)}</h3>
                <p class="ticket-airline">${this.escapeHtml(ticket.arlinename)}</p>
                <div class="ticket-price">
                </div>
                <button class="ticket-learn-more" onclick="window.location.href='book.html'">
                    <span>احجز الآن</span>
                    <i class="fas fa-arrow-left"></i>
                </button>
            </div>
        `;

        // Add entrance animation
        slide.style.opacity = '0';
        slide.style.transform = 'translateY(20px)';
        
        // Animate entrance with stagger
        setTimeout(() => {
            slide.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            slide.style.opacity = '1';
            slide.style.transform = 'translateY(0)';
        }, index * 100);

        // Add hover effects
        slide.addEventListener('mouseenter', () => this.handleSlideHover(slide, true));
        slide.addEventListener('mouseleave', () => this.handleSlideHover(slide, false));

        return slide;
    }

    /**
     * Get ticket class color
     */
    getTicketClassColor(daraga) {
        if (!daraga) return 'economy';
        
        switch (daraga) {
            case 'الدرجة الإقتصادية': return 'economy';
            case 'درجة رجال الأعمال': return 'business';
            case 'الدرجة الأولى': return 'first-class';
            default: return 'economy';
        }
    }

    /**
     * Handle slide hover effects
     */
    handleSlideHover(slide, isHovering) {
        if (isHovering) {
            slide.style.transform = 'translateY(-8px) scale(1.02)';
            slide.style.zIndex = '10';
        } else {
            slide.style.transform = '';
            slide.style.zIndex = '';
        }
    }

    /**
     * Update indicators
     */
    updateIndicators() {
        if (!this.elements.indicators) return;

        this.elements.indicators.innerHTML = '';

        for (let i = 0; i < this.state.totalSlides; i++) {
            const indicator = document.createElement('button');
            indicator.className = `indicator ${i === this.state.currentIndex ? 'active' : ''}`;
            indicator.setAttribute('aria-label', `Go to slide ${i + 1}`);
            indicator.setAttribute('data-slide', i);
            
            indicator.addEventListener('click', () => this.goToSlide(i));
            this.elements.indicators.appendChild(indicator);
        }
    }

    /**
     * Update navigation buttons state
     */
    updateButtons() {
        if (!this.elements.prevBtn || !this.elements.nextBtn) return;

        // For infinite loop, buttons are always enabled
        if (this.options.infiniteLoop) {
            this.elements.prevBtn.disabled = false;
            this.elements.nextBtn.disabled = false;
            
            // Update ARIA labels
            this.elements.prevBtn.setAttribute('aria-label', `Previous slide`);
            this.elements.nextBtn.setAttribute('aria-label', `Next slide`);
        } else {
            // Normal navigation with boundaries
            const isAtStart = this.state.currentIndex === 0;
            const isAtEnd = this.state.currentIndex >= this.state.totalSlides - 1;

            this.elements.prevBtn.disabled = isAtStart;
            this.elements.nextBtn.disabled = isAtEnd;

            // Update ARIA labels
            this.elements.prevBtn.setAttribute('aria-label', 
                isAtStart ? 'No previous slides' : `Go to slide ${this.state.currentIndex + 1}`);
            this.elements.nextBtn.setAttribute('aria-label', 
                isAtEnd ? 'No more slides' : `Go to slide ${this.state.currentIndex + 1}`);
        }
    }

    /**
     * Navigate to previous slide
     */
    prev() {
        if (this.state.isAnimating) return;
        
        if (this.options.infiniteLoop) {
            // Infinite loop - always allow navigation
            this.state.currentIndex--;
            if (this.state.currentIndex < 0) {
                this.state.currentIndex = this.state.totalSlides - 1;
            }
            this.animateTransition();
        } else {
            // Normal navigation with boundaries
            if (this.state.currentIndex <= 0) return;
            this.state.currentIndex--;
            this.animateTransition();
        }
    }

    /**
     * Navigate to next slide
     */
    next() {
        if (this.state.isAnimating) return;
        
        if (this.options.infiniteLoop) {
            // Infinite loop - always allow navigation
            this.state.currentIndex++;
            if (this.state.currentIndex >= this.state.totalSlides) {
                this.state.currentIndex = 0;
            }
            this.animateTransition();
        } else {
            // Normal navigation with boundaries
            if (this.state.currentIndex >= this.state.totalSlides - 1) return;
            this.state.currentIndex++;
            this.animateTransition();
        }
    }

    /**
     * Go to specific slide
     */
    goToSlide(index) {
        if (this.state.isAnimating || index === this.state.currentIndex) return;
        
        if (index >= 0 && index < this.state.totalSlides) {
            this.state.currentIndex = index;
            this.animateTransition();
        }
    }

    /**
     * Animate slide transition
     */
    animateTransition() {
        this.state.isAnimating = true;
        
        // Update slide positions
        this.updateSlidePosition();
        
        // Update indicators and buttons
        this.updateIndicators();
        this.updateButtons();
        
        // Update ARIA attributes
        this.updateAccessibility();
        
        // Reset animation flag after transition
        setTimeout(() => {
            this.state.isAnimating = false;
        }, this.options.transitionDuration);
    }

    /**
     * Update slide positions using CSS transforms
     */
    updateSlidePosition() {
        if (!this.elements.track) return;

        const slideWidth = this.state.slides[0]?.offsetWidth || 360;
        const spaceBetween = this.options.spaceBetween;
        // For RTL direction, we need positive offset
        const offset = this.state.currentIndex * (slideWidth + spaceBetween);
        
        // Use transform for better performance - positive for RTL
        this.elements.track.style.transform = `translateX(${offset}px)`;
        
        // Remove all aria-hidden - all slides are always active
        this.state.slides.forEach((slide, index) => {
            slide.setAttribute('aria-hidden', 'false');
            // No visual changes - all slides look the same and are always active
        });
    }

    /**
     * Touch event handlers
     */
    handleTouchStart(e) {
        this.state.touchStartX = e.touches[0].clientX;
    }

    handleTouchEnd(e) {
        this.state.touchEndX = e.changedTouches[0].clientX;
        this.handleSwipe();
    }

    /**
     * Mouse event handlers for desktop swipe
     */
    handleMouseDown(e) {
        this.state.touchStartX = e.clientX;
        this.elements.track.style.cursor = 'grabbing';
    }

    handleMouseUp(e) {
        this.state.touchEndX = e.clientX;
        this.elements.track.style.cursor = 'grab';
        this.handleSwipe();
    }

    handleMouseLeave() {
        this.elements.track.style.cursor = 'grab';
    }

    /**
     * Handle swipe gesture
     */
    handleSwipe() {
        const swipeThreshold = 50;
        const diff = this.state.touchStartX - this.state.touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left (finger moves right to left) = previous in RTL
                this.prev();
            } else {
                // Swipe right (finger moves left to right) = next in RTL
                this.next();
            }
        }
    }

    /**
     * Handle window resize with debouncing
     */
    handleResize() {
        // Clear existing timer
        if (this.resizeDebounceTimer) {
            clearTimeout(this.resizeDebounceTimer);
        }
        
        // Debounce resize handler
        this.resizeDebounceTimer = setTimeout(() => {
            this.options.slidesPerView = this.calculateSlidesPerView();
            // Reset position to ensure it's within bounds
            if (this.state.currentIndex >= this.state.totalSlides) {
                this.state.currentIndex = this.state.totalSlides - 1;
            }
            this.updateSlidePosition();
        }, 250);
    }

    /**
     * Auto-play functionality
     */
    startAutoPlay() {
        if (!this.options.autoPlay || this.state.totalSlides <= 1) return;
        
        this.state.isAutoPlaying = true;
        this.state.isPaused = false;
        
        this.autoPlayTimer = setInterval(() => {
            if (!this.state.isPaused && !this.state.isAnimating) {
                if (this.options.infiniteLoop) {
                    // Infinite loop - always move to next
                    this.state.currentIndex++;
                    if (this.state.currentIndex >= this.state.totalSlides) {
                        this.state.currentIndex = 0;
                    }
                } else {
                    // Normal loop with boundaries
                    if (this.state.currentIndex >= this.state.totalSlides - 1) {
                        this.state.currentIndex = 0; // Reset to start
                    } else {
                        this.state.currentIndex++;
                    }
                }
                this.animateTransition();
            }
        }, this.options.autoPlayInterval);
    }

    /**
     * Stop auto-play
     */
    stopAutoPlay() {
        this.state.isAutoPlaying = false;
        if (this.autoPlayTimer) {
            clearInterval(this.autoPlayTimer);
            this.autoPlayTimer = null;
        }
    }

    /**
     * Pause auto-play temporarily
     */
    pause() {
        if (this.state.isAutoPlaying) {
            this.state.isPaused = true;
        }
    }

    /**
     * Resume auto-play
     */
    resume() {
        if (this.state.isAutoPlaying) {
            this.state.isPaused = false;
        }
    }

    /**
     * Toggle auto-play
     */
    toggleAutoPlay() {
        if (this.state.isAutoPlaying) {
            this.stopAutoPlay();
        } else {
            this.startAutoPlay();
        }
    }

    /**
     * Setup accessibility features
     */
    setupAccessibility() {
        if (!this.elements.container) return;
        
        this.elements.container.setAttribute('role', 'region');
        this.elements.container.setAttribute('aria-label', 'Ticket carousel');
        this.elements.container.setAttribute('aria-roledescription', 'carousel');
        
        this.updateAccessibility();
    }

    /**
     * Update accessibility attributes
     */
    updateAccessibility() {
        if (!this.elements.container) return;
        
        this.elements.container.setAttribute('aria-label', 
            `Ticket carousel, slide ${this.state.currentIndex + 1} of ${this.state.totalSlides}`);
    }

    /**
     * Show loading state
     */
    showLoading() {
        if (!this.elements.track) return;
        
        this.elements.track.innerHTML = `
            <div class="loading-placeholder">
                <i class="fas fa-spinner fa-spin"></i>
                <p>جاري تحميل الرحلات...</p>
            </div>
        `;
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        // Loading will be hidden when slides are created
    }

    /**
     * Show error message
     */
    showError(message) {
        if (!this.elements.track) return;
        
        this.elements.track.innerHTML = `
            <div class="loading-placeholder">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button class="ticket-learn-more" onclick="location.reload()">
                    <span>إعادة المحاولة</span>
                    <i class="fas fa-redo"></i>
                </button>
            </div>
        `;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Destroy carousel and cleanup
     */
    destroy() {
        // Stop auto-play
        this.stopAutoPlay();
        
        // Clear timers
        if (this.resizeDebounceTimer) {
            clearTimeout(this.resizeDebounceTimer);
        }
        
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        // Remove event listeners
        // Note: In a real implementation, you'd want to store references to event handlers
        
        // Clear DOM
        if (this.elements.track) {
            this.elements.track.innerHTML = '';
        }
        
        if (this.elements.indicators) {
            this.elements.indicators.innerHTML = '';
        }
        
        // Reset state
        this.state = {
            currentIndex: 0,
            totalSlides: 0,
            isAnimating: false,
            isAutoPlaying: false,
            isPaused: false,
            touchStartX: 0,
            touchEndX: 0,
            slides: [],
            data: [],
            isLoading: false,
            hasError: false
        };
    }
}

// Initialize carousel when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if carousel container exists
    const carouselContainer = document.querySelector('.tickets-carousel');
    if (carouselContainer) {
        // Create and initialize carousel
        const carousel = new ProfessionalCarousel({
            autoPlay: true, // Enable auto-play
            autoPlayInterval: 4000, // 4 seconds
            pauseOnHover: true,
            infiniteLoop: true // Enable circular carousel
        });
        
        carousel.init().catch(error => {
            console.error('Failed to initialize carousel:', error);
        });
        
        // Make carousel globally accessible for debugging
        window.ticketCarousel = carousel;
    }
});