

// About Us Page JavaScript
class AboutUsPage {
    constructor() {
        this.statsObserver = null;
        this.statsAnimated = false;
    }

    init() {
        this.setupGoogleMapsButton();
        this.setupStatisticsCounter();
        this.setupSmoothScrolling();
        this.setupParallaxEffect();
    }

    setupGoogleMapsButton() {
        const mapBtn = document.querySelector('.map-btn');
        if (mapBtn) {
            mapBtn.addEventListener('click', () => {
                // Open Google Maps with the company location
                const address = encodeURIComponent('جامع الأكرم، مزة شرقية، دمشق، سوريا');
                const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${address}`;
                window.open(googleMapsUrl, '_blank');
            });
        }
    }

    setupStatisticsCounter() {
        const statNumbers = document.querySelectorAll('.stat-number');
        if (statNumbers.length === 0) return;

        const observerOptions = {
            threshold: 0.5,
            rootMargin: '0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.statsAnimated) {
                    this.statsAnimated = true;
                    statNumbers.forEach(stat => {
                        const target = parseInt(stat.textContent.replace(/\D/g, ''));
                        let current = 0;
                        const increment = target / 50;
                        const timer = setInterval(() => {
                            current += increment;
                            if (current >= target) {
                                current = target;
                                clearInterval(timer);
                            }
                            stat.textContent = Math.floor(current) + (stat.textContent.includes('%') ? '%' : '+');
                        }, 30);
                    });
                }
            });
        }, observerOptions);

        const statsSection = document.querySelector('.statistics-section');
        if (statsSection) {
            observer.observe(statsSection);
        }
    }


    setupSmoothScrolling() {
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Add smooth scroll behavior to all internal links
        document.querySelectorAll('a[href*=".html"]').forEach(link => {
            link.addEventListener('click', function(e) {
                // Only apply to links on the same domain
                if (this.hostname === window.location.hostname) {
                    // Add fade transition effect
                    document.body.style.opacity = '0';
                    document.body.style.transition = 'opacity 0.3s ease';
                    
                    setTimeout(() => {
                        window.location.href = this.href;
                    }, 300);
                }
            });
        });
    }

    setupParallaxEffect() {
        const heroSection = document.querySelector('.about-hero');
        if (!heroSection) return;

        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallax = heroSection.querySelector('.hero-content');
            if (parallax) {
                const speed = 0.5;
                parallax.style.transform = `translateY(${scrolled * speed}px)`;
                parallax.style.opacity = 1 - (scrolled / 600);
            }
        });
    }

    destroy() {
        if (this.statsObserver) {
            this.statsObserver.disconnect();
        }
        
        // Remove event listeners
        const mapBtn = document.querySelector('.map-btn');
        if (mapBtn) {
            mapBtn.removeEventListener('click', this.setupGoogleMapsButton);
        }
    }
}

// Initialize About Us page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the About Us page
    if (window.location.pathname.includes('uss.html') || document.querySelector('.about-hero')) {
        const aboutUsPage = new AboutUsPage();
        aboutUsPage.init();
        
        // Make it globally accessible
        window.aboutUsPage = aboutUsPage;
    }
});

// Enhanced animations for value cards and social media cards
document.addEventListener('DOMContentLoaded', () => {
    // Add stagger animation to value cards
    const valueCards = document.querySelectorAll('.value-card');
    valueCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.style.animation = 'fadeInUp 0.6s ease forwards';
    });

    // Add hover effect with sound (optional)
    const socialCards = document.querySelectorAll('.social-card');
    socialCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            // Add subtle scale animation
            card.style.transform = 'translateY(-5px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });

});

// Add scroll reveal animations
document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px 150px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all sections
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
});

// Add interactive contact form validation (if contact form exists)
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Basic validation
            const name = contactForm.querySelector('input[name="name"]');
            const email = contactForm.querySelector('input[name="email"]');
            const message = contactForm.querySelector('textarea[name="message"]');
            
            let isValid = true;
            
            if (!name.value.trim()) {
                name.classList.add('error');
                isValid = false;
            }
            
            if (!email.value.trim() || !email.value.includes('@')) {
                email.classList.add('error');
                isValid = false;
            }
            
            if (!message.value.trim()) {
                message.classList.add('error');
                isValid = false;
            }
            
            if (isValid) {
                // Show success message
                alert('تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.');
                contactForm.reset();
            }
        });
    }
});

// Google Maps function
function openGoogleMaps() {
    const address = encodeURIComponent('جامع الأكرم، مزة شرقية، دمشق، سوريا');
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
}

