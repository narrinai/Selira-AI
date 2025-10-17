// ===== GOOGLE ANALYTICS EVENT TRACKING FOR SELIRA AI =====
// Centralized event tracking system for GA4 conversion tracking
// Mirrors Facebook Pixel event structure with Google Analytics naming conventions

class GoogleAnalyticsTracking {
  constructor() {
    this.gtagLoaded = typeof gtag !== 'undefined';
    this.eventsTracked = new Set();

    if (!this.gtagLoaded) {
      console.warn('⚠️ Google Analytics (gtag) not loaded yet');
      return;
    }

    console.log('✅ Google Analytics Tracking initialized');
    this.initializeTracking();
  }

  // Check if gtag is available
  checkGtag() {
    if (!this.gtagLoaded && typeof gtag !== 'undefined') {
      this.gtagLoaded = true;
      console.log('✅ Google Analytics (gtag) now available');
    }
    return this.gtagLoaded;
  }

  // Track event with deduplication
  trackEvent(eventName, parameters = {}, eventId = null) {
    if (!this.checkGtag()) {
      console.warn(`⚠️ Cannot track ${eventName}: gtag not loaded`);
      return;
    }

    // Generate unique event ID if not provided
    const uniqueEventId = eventId || `${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prevent duplicate tracking
    if (this.eventsTracked.has(uniqueEventId)) {
      console.log(`⏭️ Skipping duplicate GA4 event: ${eventName}`);
      return;
    }

    try {
      gtag('event', eventName, parameters);
      this.eventsTracked.add(uniqueEventId);
      console.log(`📊 Google Analytics tracked: ${eventName}`, parameters);
    } catch (error) {
      console.error(`❌ Error tracking ${eventName}:`, error);
    }
  }

  // Initialize all event listeners
  initializeTracking() {
    this.trackPageView();
    this.trackViewItem();
    this.trackBeginCheckout();
    this.trackSignUp();
    this.trackGenerateLead();
    this.trackSearch();
    this.trackPurchase();
  }

  // Track page_view (automatic on every page load)
  trackPageView() {
    // PageView is already tracked by gtag config
    console.log('📄 page_view tracked automatically by gtag config');
  }

  // Track view_item - when user views a character/companion (equivalent to ViewContent)
  trackViewItem() {
    // Track on chat.html when character loads
    if (window.location.pathname.includes('/chat.html') || window.location.pathname.includes('/chat')) {
      const urlParams = new URLSearchParams(window.location.search);
      const characterSlug = urlParams.get('character');
      const characterId = urlParams.get('id');

      if (characterSlug || characterId) {
        // Wait a bit for character data to load
        setTimeout(() => {
          const characterName = document.querySelector('.character-name')?.textContent || characterSlug;

          this.trackEvent('view_item', {
            item_name: characterName || 'Unknown Character',
            item_category: 'AI Character',
            item_id: characterSlug || characterId,
            content_type: 'product'
          });
        }, 1000);
      }
    }

    // Track on index.html when viewing character cards
    document.addEventListener('click', (e) => {
      const characterCard = e.target.closest('.character-card, .companion-card');
      if (characterCard) {
        const characterName = characterCard.querySelector('.character-name, .companion-name')?.textContent;
        const characterSlug = characterCard.querySelector('a')?.href?.split('character=')[1]?.split('&')[0];

        if (characterName || characterSlug) {
          this.trackEvent('view_item', {
            item_name: characterName || 'Character',
            item_category: 'AI Character',
            item_id: characterSlug,
            content_type: 'product'
          }, `view_item_${characterSlug}`);
        }
      }
    });
  }

  // Track begin_checkout - when user clicks upgrade to Basic/Premium (equivalent to InitiateCheckout)
  // NOTE: This is now a stub. begin_checkout should be triggered manually
  // from pricing.html and affiliate-program.html AFTER authentication check
  trackBeginCheckout() {
    // Removed automatic tracking to prevent false events
    // begin_checkout is now triggered explicitly in checkout flows after auth check
    console.log('✅ begin_checkout tracking ready (manual trigger only)');
  }

  // Track sign_up - when user successfully registers (equivalent to CompleteRegistration)
  trackSignUp() {
    // Listen for Supabase registration success
    window.addEventListener('supabase-registration-complete', (event) => {
      this.trackEvent('sign_up', {
        method: 'Supabase',
        content_name: 'User Registration'
      }, `signup_${event.detail?.email || Date.now()}`);
    });

    // Also listen for generic registration complete event (backward compatibility)
    window.addEventListener('registration-complete', (event) => {
      this.trackEvent('sign_up', {
        method: 'Supabase',
        content_name: 'User Registration'
      }, `signup_${event.detail?.email || Date.now()}`);
    });

    // Also check localStorage for recent registration
    const checkRegistrationState = () => {
      const justRegistered = localStorage.getItem('just_registered');
      const userEmail = localStorage.getItem('user_email');

      if (justRegistered === 'true' && userEmail) {
        this.trackEvent('sign_up', {
          method: 'Supabase',
          content_name: 'User Registration'
        }, `signup_${userEmail}`);

        // Clear flag to prevent duplicate tracking
        localStorage.removeItem('just_registered');
      }
    };

    // Check on load and periodically
    setTimeout(checkRegistrationState, 1000);
    setInterval(checkRegistrationState, 5000);
  }

  // Track generate_lead - when user submits contact form (equivalent to Lead)
  trackGenerateLead() {
    // Contact form submission
    const trackContactForm = () => {
      const contactForms = document.querySelectorAll('form[name="contact"], .contact-form');

      contactForms.forEach(form => {
        if (!form.dataset.gtagTracked) {
          form.addEventListener('submit', (e) => {
            const email = form.querySelector('input[name="email"]')?.value;

            this.trackEvent('generate_lead', {
              content_name: 'Contact Form Submission',
              content_category: 'Contact',
              currency: 'USD',
              value: 0
            }, `lead_contact_${email || Date.now()}`);
          });
          form.dataset.gtagTracked = 'true';
        }
      });
    };

    trackContactForm();

    // Check for dynamically loaded forms
    setTimeout(trackContactForm, 2000);
  }

  // Track search - when user searches for characters
  trackSearch() {
    // Listen for search input
    const trackSearchInput = () => {
      const searchInputs = document.querySelectorAll('input[type="search"], .search-input, #search');

      searchInputs.forEach(input => {
        if (!input.dataset.gtagTracked) {
          input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
              this.trackEvent('search', {
                search_term: input.value.trim(),
                content_category: 'AI Character'
              }, `search_${input.value.trim()}_${Date.now()}`);
            }
          });
          input.dataset.gtagTracked = 'true';
        }
      });
    };

    trackSearchInput();
    setTimeout(trackSearchInput, 2000);

    // Also track search results page visits
    if (window.location.pathname.includes('/search') || window.location.search.includes('search')) {
      const urlParams = new URLSearchParams(window.location.search);
      const searchQuery = urlParams.get('search') || urlParams.get('q');

      if (searchQuery) {
        this.trackEvent('search', {
          search_term: searchQuery,
          content_category: 'AI Character'
        }, `search_${searchQuery}`);
      }
    }
  }

  // Track purchase - when user successfully purchases Basic/Premium plan or image credits
  trackPurchase() {
    // Listen for Stripe payment success
    window.addEventListener('stripe-payment-success', (event) => {
      const details = event.detail || {};

      this.trackEvent('purchase', {
        transaction_id: details.transactionId || `txn_${Date.now()}`,
        value: details.amount || 0,
        currency: details.currency || 'USD',
        items: [{
          item_name: details.planName || 'Subscription Plan',
          item_category: 'Subscription',
          price: details.amount || 0,
          quantity: 1
        }]
      }, `purchase_${details.transactionId || Date.now()}`);
    });

    // Check URL for payment success parameters
    const urlParams = new URLSearchParams(window.location.search);

    // Check for credit purchase success
    if (urlParams.get('purchase') === 'credits') {
      // Try to get credit info from localStorage first, then URL params as fallback
      let creditData = null;

      const creditsPurchased = localStorage.getItem('credits_purchased');
      if (creditsPurchased) {
        creditData = JSON.parse(creditsPurchased);
        localStorage.removeItem('credits_purchased');
      } else {
        // Fallback to URL parameters
        const credits = urlParams.get('credits');
        const amount = urlParams.get('amount');

        if (credits && amount) {
          creditData = {
            credits: parseInt(credits),
            amount: parseFloat(amount)
          };
        }
      }

      if (creditData) {
        this.trackEvent('purchase', {
          transaction_id: `credits_${Date.now()}`,
          value: creditData.amount || 0,
          currency: 'USD',
          items: [{
            item_name: `${creditData.credits} Image Credits`,
            item_category: 'Image Credits',
            price: creditData.amount || 0,
            quantity: 1
          }]
        }, `purchase_credits_${creditData.credits}_${Date.now()}`);
      }
    }

    // Check for subscription purchase success
    if (urlParams.get('payment') === 'success' || urlParams.get('checkout') === 'success') {
      const planType = urlParams.get('plan') || 'Unknown';
      const amount = urlParams.get('amount') || (planType.toLowerCase() === 'premium' ? 9.99 : 4.99);

      this.trackEvent('purchase', {
        transaction_id: `sub_${planType}_${Date.now()}`,
        value: parseFloat(amount),
        currency: 'USD',
        items: [{
          item_name: `${planType} Plan`,
          item_category: 'Subscription',
          price: parseFloat(amount),
          quantity: 1
        }]
      }, `purchase_${planType}_${Date.now()}`);
    }

    // Also listen for localStorage payment success flag
    const checkPaymentSuccess = () => {
      const paymentSuccess = localStorage.getItem('payment_success');
      const planPurchased = localStorage.getItem('plan_purchased');

      if (paymentSuccess === 'true' && planPurchased) {
        const planData = JSON.parse(planPurchased);

        this.trackEvent('purchase', {
          transaction_id: planData.id || `txn_${Date.now()}`,
          value: planData.amount || 0,
          currency: planData.currency || 'USD',
          items: [{
            item_name: planData.name || 'Subscription Plan',
            item_category: 'Subscription',
            price: planData.amount || 0,
            quantity: 1
          }]
        }, `purchase_${planData.id || Date.now()}`);

        // Clear flags
        localStorage.removeItem('payment_success');
        localStorage.removeItem('plan_purchased');
      }
    };

    setTimeout(checkPaymentSuccess, 1000);
  }
}

// Initialize tracking when DOM is ready - wrapped in try-catch to prevent breaking other scripts
try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      try {
        window.seliraGATracking = new GoogleAnalyticsTracking();
      } catch (error) {
        console.warn('⚠️ Google Analytics Tracking initialization failed:', error);
      }
    });
  } else {
    window.seliraGATracking = new GoogleAnalyticsTracking();
  }

  // Also initialize after a short delay to ensure gtag is loaded
  setTimeout(() => {
    try {
      if (!window.seliraGATracking) {
        window.seliraGATracking = new GoogleAnalyticsTracking();
      }
    } catch (error) {
      console.warn('⚠️ Google Analytics Tracking delayed initialization failed:', error);
    }
  }, 1000);

  console.log('📊 Google Analytics Events script loaded');
} catch (error) {
  console.warn('⚠️ Google Analytics Events script failed to initialize:', error);
}
