
        // Contact Page JavaScript

        class ContactPage {

            constructor() {

                this.form = document.getElementById('contactForm');

                this.init();

            }



            init() {

                this.setupFormValidation();

                this.setupEmailHandlers();

                this.setupPhoneHandlers();

                this.setupMapHandler();

                this.setupAnimations();

            }



            setupFormValidation() {

                if (!this.form) return;



                this.form.addEventListener('submit', (e) => {

                    e.preventDefault();

                    

                    if (this.validateForm()) {

                        this.submitForm();

                    }

                });



                // Real-time validation

                const inputs = this.form.querySelectorAll('input, select, textarea');

                inputs.forEach(input => {

                    input.addEventListener('blur', () => {

                        this.validateField(input);

                    });



                    input.addEventListener('input', () => {

                        if (input.parentElement.classList.contains('error')) {

                            this.validateField(input);

                        }

                    });

                });

            }



            validateField(field) {

                const formGroup = field.parentElement;

                const value = field.value.trim();

                let isValid = true;



                formGroup.classList.remove('error');



                if (field.hasAttribute('required') && !value) {

                    isValid = false;

                }



                if (field.type === 'email' && value && !this.isValidEmail(value)) {

                    isValid = false;

                }



                if (field.type === 'tel' && value && !this.isValidPhone(value)) {

                    isValid = false;

                }



                if (!isValid) {

                    formGroup.classList.add('error');

                }



                return isValid;

            }



            validateForm() {

                const formGroups = this.form.querySelectorAll('.form-group');

                let isValid = true;



                formGroups.forEach(group => {

                    const field = group.querySelector('input, select, textarea');

                    if (field && !this.validateField(field)) {

                        isValid = false;

                    }

                });



                return isValid;

            }



            isValidEmail(email) {

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                return emailRegex.test(email);

            }



            isValidPhone(phone) {

                const phoneRegex = /^[\d\s\-\+\(\)]+$/;

                return phoneRegex.test(phone) && phone.length >= 10;

            }



            submitForm() {

                const formData = new FormData(this.form);

                const data = Object.fromEntries(formData);



                // Show loading state

                const submitBtn = this.form.querySelector('.submit-btn');

                const originalText = submitBtn.innerHTML;

                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

                submitBtn.disabled = true;



                // Send using Formspree

                fetch('https://formspree.io/f/xeelgdej', {

                    method: 'POST',

                    headers: {

                        'Content-Type': 'application/json',

                        'Accept': 'application/json'

                    },

                    body: JSON.stringify({

                        name: data.name,

                        email: data.email,

                        phone: data.phone || 'لم يتم إدخاله',

                        subject: data.subject,

                        message: data.message,

                        _subject: `رسالة جديدة من موقع جلجامش - ${data.subject}`

                    })

                })

                .then(response => {

                    if (response.ok) {

                        this.showSuccessMessage();

                        this.form.reset();

                    } else {

                        this.showErrorMessage();

                    }

                })

                .catch(error => {

                    this.showErrorMessage();

                })

                .finally(() => {

                    submitBtn.innerHTML = originalText;

                    submitBtn.disabled = false;

                });

            }



            showSuccessMessage() {

                const successDiv = document.createElement('div');

                successDiv.className = 'success-message';

                successDiv.innerHTML = `

                    <div class="success-content">

                        <i class="fas fa-check-circle"></i>

                        <h3>تم الإرسال بنجاح!</h3>

                        <p>شكراً لتواصلك معنا. سنرد عليك في أقرب وقت ممكن.</p>

                    </div>

                `;

                successDiv.style.cssText = `

                    position: fixed;

                    top: 50%;

                    left: 50%;

                    transform: translate(-50%, -50%);

                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);

                    color: white;

                    padding: 40px;

                    border-radius: 20px;

                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);

                    z-index: 10000;

                    text-align: center;

                    animation: fadeInUp 0.5s ease;

                    max-width: 400px;

                `;



                const successContent = successDiv.querySelector('.success-content');

                successContent.style.cssText = `

                    display: flex;

                    flex-direction: column;

                    align-items: center;

                    gap: 15px;

                `;



                const icon = successDiv.querySelector('i');

                icon.style.cssText = `

                    font-size: 3rem;

                    color: white;

                `;



                const heading = successDiv.querySelector('h3');

                heading.style.cssText = `

                    font-size: 1.5rem;

                    margin: 0;

                `;



                const paragraph = successDiv.querySelector('p');

                paragraph.style.cssText = `

                    font-size: 1rem;

                    margin: 0;

                    opacity: 0.9;

                `;



                document.body.appendChild(successDiv);



                // Add backdrop

                const backdrop = document.createElement('div');

                backdrop.className = 'success-backdrop';

                backdrop.style.cssText = `

                    position: fixed;

                    top: 0;

                    left: 0;

                    right: 0;

                    bottom: 0;

                    background: rgba(0,0,0,0.5);

                    z-index: 9999;

                    animation: fadeIn 0.3s ease;

                `;

                document.body.appendChild(backdrop);



                // Remove after 3 seconds

                setTimeout(() => {

                    successDiv.style.animation = 'fadeOutDown 0.5s ease';

                    backdrop.style.animation = 'fadeOut 0.3s ease';

                    setTimeout(() => {

                        successDiv.remove();

                        backdrop.remove();

                    }, 500);

                }, 3000);



                // Close on backdrop click

                backdrop.addEventListener('click', () => {

                    successDiv.style.animation = 'fadeOutDown 0.5s ease';

                    backdrop.style.animation = 'fadeOut 0.3s ease';

                    setTimeout(() => {

                        successDiv.remove();

                        backdrop.remove();

                    }, 500);

                });

            }



            showErrorMessage() {

                const errorDiv = document.createElement('div');

                errorDiv.className = 'error-message';

                errorDiv.innerHTML = `

                    <div class="error-content">

                        <i class="fas fa-exclamation-triangle"></i>

                        <h3>حدث خطأ!</h3>

                        <p>عذراً، لم نتمكن من إرسال رسالتك. يرجى المحاولة مرة أخرى.</p>

                    </div>

                `;

                errorDiv.style.cssText = `

                    position: fixed;

                    top: 50%;

                    left: 50%;

                    transform: translate(-50%, -50%);

                    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);

                    color: white;

                    padding: 40px;

                    border-radius: 20px;

                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);

                    z-index: 10000;

                    text-align: center;

                    animation: fadeInUp 0.5s ease;

                    max-width: 400px;

                `;

                const errorContent = errorDiv.querySelector('.error-content');

                errorContent.style.cssText = `

                    display: flex;

                    flex-direction: column;

                    align-items: center;

                    gap: 15px;

                `;

                const icon = errorDiv.querySelector('i');

                icon.style.cssText = `

                    font-size: 3rem;

                    color: white;

                `;

                const heading = errorDiv.querySelector('h3');

                heading.style.cssText = `

                    font-size: 1.5rem;

                    margin: 0;

                `;

                const paragraph = errorDiv.querySelector('p');

                paragraph.style.cssText = `

                    font-size: 1rem;

                    margin: 0;

                    opacity: 0.9;

                `;

                document.body.appendChild(errorDiv);

                // Add backdrop

                const backdrop = document.createElement('div');

                backdrop.className = 'error-backdrop';

                backdrop.style.cssText = `

                    position: fixed;

                    top: 0;

                    left: 0;

                    right: 0;

                    bottom: 0;

                    background: rgba(0,0,0,0.5);

                    z-index: 9999;

                    animation: fadeIn 0.3s ease;

                `;

                document.body.appendChild(backdrop);

                // Remove after 3 seconds

                setTimeout(() => {

                    errorDiv.style.animation = 'fadeOutDown 0.5s ease';

                    backdrop.style.animation = 'fadeOut 0.3s ease';

                    setTimeout(() => {

                        errorDiv.remove();

                        backdrop.remove();

                    }, 500);

                }, 3000);

                // Close on backdrop click

                backdrop.addEventListener('click', () => {

                    errorDiv.style.animation = 'fadeOutDown 0.5s ease';

                    backdrop.style.animation = 'fadeOut 0.3s ease';

                    setTimeout(() => {

                        errorDiv.remove();

                        backdrop.remove();

                    }, 500);

                });

            }



            setupEmailHandlers() {

                // Email cards click handlers

                const emailCards = document.querySelectorAll('.email-card');

                emailCards.forEach(card => {

                    card.addEventListener('click', () => {

                        const email = card.getAttribute('data-email');

                        this.sendEmail(email);

                    });

                });

            }



            setupPhoneHandlers() {

                // Phone button handlers

                const phoneCards = document.querySelectorAll('.phone-card');

                phoneCards.forEach(card => {

                    const phone = card.getAttribute('data-phone');

                    

                    card.querySelector('.call-btn')?.addEventListener('click', (e) => {

                        e.stopPropagation();

                        this.makeCall(phone);

                    });

                    

                    card.querySelector('.whatsapp-btn')?.addEventListener('click', (e) => {

                        e.stopPropagation();

                        this.sendWhatsApp(phone);

                    });

                    

                    card.querySelector('.copy-btn')?.addEventListener('click', (e) => {

                        e.stopPropagation();

                        this.copyPhone(phone);

                    });

                });

            }



            setupMapHandler() {

                const mapBtn = document.querySelector('.map-btn');

                if (mapBtn) {

                    mapBtn.addEventListener('click', () => {

                        this.openGoogleMaps();

                    });

                }

            }



            setupAnimations() {

                // Scroll animations
                const observerOptions = {

                    threshold: 0.05,

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



                // Observe all sections except email contacts on mobile
                const sections = document.querySelectorAll('section');
                const isMobile = window.innerWidth <= 768;

                sections.forEach(section => {
                    // Skip email contacts section on mobile
                    if (isMobile && section.querySelector('.contact-grid .contact-category:first-child')) {
                        // Keep email section visible without animation on mobile
                        const emailCategory = section.querySelector('.contact-category:first-child');
                        if (emailCategory) {
                            emailCategory.style.opacity = '1';
                            emailCategory.style.transform = 'translateY(0)';
                            emailCategory.style.transition = 'none';
                        }
                        return; // Skip this section
                    }

                    section.style.opacity = '0';

                    section.style.transform = 'translateY(30px)';

                    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';

                    observer.observe(section);

                });



                // Stagger animation for cards

                const cards = document.querySelectorAll('.email-card, .phone-card, .social-card');

                cards.forEach((card, index) => {

                    card.style.animationDelay = `${index * 0.1}s`;

                    card.style.animation = 'fadeInUp 0.6s ease forwards';

                });

            }



            // Contact functions

            sendEmail(email) {
                // Check if mobile device
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                if (isMobile) {
                    // Try to open Gmail app first
                    const gmailAppUrl = `mailto:${email}`;
                    window.location.href = gmailAppUrl;
                    
                    // Fallback to Gmail web if app doesn't open after a short delay
                    setTimeout(() => {
                        const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}`;
                        window.open(gmailWebUrl, '_blank');
                    }, 1000);
                } else {
                    // Desktop: open Gmail web directly
                    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}`;
                    window.open(gmailUrl, '_blank');
                }
            }



            makeCall(phone) {

                window.open(`tel:${phone}`, '_blank');

            }



            sendWhatsApp(phone) {
                const message = `مرحباً.. أود الاستفسار عن خدماتكم السياحية �✈️`;

                window.open(`https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${message}`, '_blank');

            }



            copyPhone(phone) {

                navigator.clipboard.writeText(phone).then(() => {

                    this.showToast('تم نسخ رقم الهاتف!');

                }).catch(() => {

                    // Fallback for older browsers

                    const textArea = document.createElement('textarea');

                    textArea.value = phone;

                    document.body.appendChild(textArea);

                    textArea.select();

                    document.execCommand('copy');

                    document.body.removeChild(textArea);

                    this.showToast('تم نسخ رقم الهاتف!');

                });

            }



            openGoogleMaps() {

                const address = encodeURIComponent('جامع الأكرم، مزة شرقية، دمشق، سوريا');

                window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');

            }



            showToast(message) {

                const toast = document.createElement('div');

                toast.className = 'toast';

                toast.textContent = message;

                toast.style.cssText = `

                    position: fixed;

                    bottom: 30px;

                    left: 50%;

                    transform: translateX(-50%);

                    background: linear-gradient(135deg, #002e6e 0%, #0057b8 100%);

                    color: white;

                    padding: 15px 30px;

                    border-radius: 25px;

                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);

                    z-index: 10000;

                    animation: slideUp 0.5s ease;

                    font-weight: 600;

                `;



                document.body.appendChild(toast);



                setTimeout(() => {

                    toast.style.animation = 'slideDown 0.5s ease';

                    setTimeout(() => {

                        toast.remove();

                    }, 500);

                }, 2000);

            }

        }




        // Global functions for onclick handlers

        function sendEmail(email) {
            // Check if mobile device
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile) {
                // Try to open Gmail app first
                const gmailAppUrl = `mailto:${email}`;
                window.location.href = gmailAppUrl;
                
                // Fallback to Gmail web if app doesn't open after a short delay
                setTimeout(() => {
                    const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}`;
                    window.open(gmailWebUrl, '_blank');
                }, 1000);
            } else {
                // Desktop: open Gmail web directly
                const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}`;
                window.open(gmailUrl, '_blank');
            }
        }

        function makeCall(phone) {
            window.open(`tel:${phone}`, '_blank');
        }



        function sendWhatsApp(phone) {

            const message = `مرحباً.. أود الاستفسار عن خدماتكم السياحية �✈️`;

            window.open(`https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${message}`, '_blank');

        }



        function copyPhone(phone) {

            navigator.clipboard.writeText(phone).then(() => {

                showToast('تم نسخ رقم الهاتف!');

            }).catch(() => {

                // Fallback for older browsers

                const textArea = document.createElement('textarea');

                textArea.value = phone;

                document.body.appendChild(textArea);

                textArea.select();

                document.execCommand('copy');

                document.body.removeChild(textArea);

                showToast('تم نسخ رقم الهاتف!');

            });

        }



        function openGoogleMaps() {

            const address = encodeURIComponent('جامع الأكرم، مزة شرقية، دمشق، سوريا');

            window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');

        }



        function showToast(message) {

            const toast = document.createElement('div');

            toast.className = 'toast';

            toast.textContent = message;

            toast.style.cssText = `

                position: fixed;

                bottom: 30px;

                left: 50%;

                transform: translateX(-50%);

                background: linear-gradient(135deg, #002e6e 0%, #0057b8 100%);

                color: white;

                padding: 15px 30px;

                border-radius: 25px;

                box-shadow: 0 10px 30px rgba(0,0,0,0.3);

                z-index: 10000;

                animation: slideUp 0.5s ease;

                font-weight: 600;

            `;



            document.body.appendChild(toast);



            setTimeout(() => {

                toast.style.animation = 'slideDown 0.5s ease';

                setTimeout(() => {

                    toast.remove();

                }, 500);

            }, 2000);

        }



        // Add additional animations

        const style = document.createElement('style');

        style.textContent = `

            @keyframes fadeIn {

                from { opacity: 0; }

                to { opacity: 1; }

            }



            @keyframes fadeOut {

                from { opacity: 1; }

                to { opacity: 0; }

            }



            @keyframes fadeOutDown {

                from {

                    opacity: 1;

                    transform: translate(-50%, -50%) translateY(0);

                }

                to {

                    opacity: 0;

                    transform: translate(-50%, -50%) translateY(30px);

                }

            }



            @keyframes slideUp {

                from {

                    opacity: 0;

                    transform: translate(-50%, 30px);

                }

                to {

                    opacity: 1;

                    transform: translate(-50%, 0);

                }

            }



            @keyframes slideDown {

                from {

                    opacity: 1;

                    transform: translate(-50%, 0);

                }

                to {

                    opacity: 0;

                    transform: translate(-50%, 30px);

                }

            }

        `;

        document.head.appendChild(style);



        // Initialize contact page when DOM is ready

        document.addEventListener('DOMContentLoaded', () => {

            const contactPage = new ContactPage();

            window.contactPage = contactPage;

        });

