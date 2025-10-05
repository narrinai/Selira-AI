// ===== FACEBOOK PIXEL EVENT TRACKING FOR SELIRA AI =====
// Centralized event tracking system for Meta Pixel conversion tracking

class FacebookPixelTracking {
  constructor() {
    this.pixelLoaded = typeof fbq !== 'undefined';
    this.eventsTracked = new Set();

    if (!this.pixelLoaded) {
      console.warn('⚠️ Facebook Pixel not loaded yet');
      return;
    }

    console.log('✅ Facebook Pixel Tracking initialized');
    this.initializeTracking();
  }

  // Check if pixel is available
  checkPixel() {
    if (!this.pixelLoaded && typeof fbq !== 'undefined') {
      this.pixelLoaded = true;
      console.log('✅ Facebook Pixel now available');
    }
    return this.pixelLoaded;
  }

  // Track standard event with deduplication
  trackEvent(eventName, parameters = {}, eventId = null) {
    if (!this.checkPixel()) {
      console.warn(`⚠️ Cannot track ${eventName}: Pixel not loaded`);
      return;
    }

    // Generate unique event ID if not provided
    const uniqueEventId = eventId || `${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prevent duplicate tracking
    if (this.eventsTracked.has(uniqueEventId)) {
      console.log(`⏭️ Skipping duplicate event: ${eventName}`);
      return;
    }

    try {
      fbq('track', eventName, parameters);
      this.eventsTracked.add(uniqueEventId);
      console.log(`📊 Facebook Pixel tracked: ${eventName}`, parameters);
    } catch (error) {
      console.error(`❌ Error tracking ${eventName}:`, error);
    }
  }

  // Initialize all event listeners
  initializeTracking() {
    this.trackPageView();
    this.trackViewContent();
    this.trackInitiateCheckout();
    this.trackCompleteRegistration();
    this.trackLead();
    this.trackSearch();
    this.trackPurchase();
  }

  // Track PageView (automatic on every page load)
  trackPageView() {
    // PageView is already tracked by base pixel code
    console.log('📄 PageView tracked automatically by base pixel');
  }

  // Track ViewContent - when user views a character/companion
  trackViewContent() {
    // Track on chat.html when character loads
    if (window.location.pathname.includes('/chat.html') || window.location.pathname.includes('/chat')) {
      const urlParams = new URLSearchParams(window.location.search);
      const characterSlug = urlParams.get('character');
      const characterId = urlParams.get('id');

      if (characterSlug || characterId) {
        // Wait a bit for character data to load
        setTimeout(() => {
          const characterName = document.querySelector('.character-name')?.textContent || characterSlug;

          this.trackEvent('ViewContent', {
            content_name: characterName || 'Unknown Character',
            content_category: 'AI Character',
            content_ids: [characterSlug || characterId],
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
          this.trackEvent('ViewContent', {
            content_name: characterName || 'Character',
            content_category: 'AI Character',
            content_ids: [characterSlug],
            content_type: 'product'
          }, `viewcontent_${characterSlug}`);
        }
      }
    });
  }

  // Track InitiateCheckout - when user clicks upgrade to Basic/Premium
  trackInitiateCheckout() {
    // Listen for upgrade popup opens
    const checkForUpgradeButtons = () => {
      // Find all upgrade buttons dynamically
      const upgradeButtons = document.querySelectorAll(
        '[data-upgrade], .upgrade-btn, .premium-btn, .basic-btn, [onclick*="upgrade"], [onclick*="pricing"]'
      );

      upgradeButtons.forEach(button => {
        if (!button.dataset.pixelTracked) {
          button.addEventListener('click', () => {
            const planType = button.textContent.toLowerCase().includes('premium') ? 'Premium' : 'Basic';

            this.trackEvent('InitiateCheckout', {
              content_name: `${planType} Plan`,
              content_category: 'Subscription',
              value: planType === 'Premium' ? 9.99 : 4.99,
              currency: 'USD',
              content_type: 'product'
            }, `checkout_${planType}_${Date.now()}`);
          });
          button.dataset.pixelTracked = 'true';
        }
      });
    };

    // Check initially and on DOM changes
    checkForUpgradeButtons();

    // Use MutationObserver to catch dynamically added buttons
    const observer = new MutationObserver(checkForUpgradeButtons);
    observer.observe(document.body, { childList: true, subtree: true });

    // Also listen for pricing page visits
    if (window.location.pathname.includes('/pricing')) {
      setTimeout(() => {
        this.trackEvent('InitiateCheckout', {
          content_name: 'Pricing Page Visit',
          content_category: 'Subscription',
          content_type: 'product'
        }, 'checkout_pricing_visit');
      }, 500);
    }
  }

  // Track CompleteRegistration - when user successfully registers
  trackCompleteRegistration() {
    // Listen for Auth0 registration success
    window.addEventListener('auth0-registration-complete', (event) => {
      this.trackEvent('CompleteRegistration', {
        content_name: 'User Registration',
        status: true
      }, `registration_${event.detail?.email || Date.now()}`);
    });

    // Also check localStorage for recent registration
    const checkRegistrationState = () => {
      const justRegistered = localStorage.getItem('just_registered');
      const userEmail = localStorage.getItem('user_email');

      if (justRegistered === 'true' && userEmail) {
        this.trackEvent('CompleteRegistration', {
          content_name: 'User Registration',
          status: true
        }, `registration_${userEmail}`);

        // Clear flag to prevent duplicate tracking
        localStorage.removeItem('just_registered');
      }
    };

    // Check on load and periodically
    setTimeout(checkRegistrationState, 1000);
    setInterval(checkRegistrationState, 5000);
  }

  // Track Lead - when user submits contact form
  trackLead() {
    // Contact form submission
    const trackContactForm = () => {
      const contactForms = document.querySelectorAll('form[name="contact"], .contact-form');

      contactForms.forEach(form => {
        if (!form.dataset.pixelTracked) {
          form.addEventListener('submit', (e) => {
            const email = form.querySelector('input[name="email"]')?.value;

            this.trackEvent('Lead', {
              content_name: 'Contact Form Submission',
              content_category: 'Contact'
            }, `lead_contact_${email || Date.now()}`);
          });
          form.dataset.pixelTracked = 'true';
        }
      });
    };

    trackContactForm();

    // Check for dynamically loaded forms
    setTimeout(trackContactForm, 2000);
  }

  // Track Search - when user searches for characters
  trackSearch() {
    // Listen for search input
    const trackSearchInput = () => {
      const searchInputs = document.querySelectorAll('input[type="search"], .search-input, #search');

      searchInputs.forEach(input => {
        if (!input.dataset.pixelTracked) {
          input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
              this.trackEvent('Search', {
                search_string: input.value.trim(),
                content_category: 'AI Character'
              }, `search_${input.value.trim()}_${Date.now()}`);
            }
          });
          input.dataset.pixelTracked = 'true';
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
        this.trackEvent('Search', {
          search_string: searchQuery,
          content_category: 'AI Character'
        }, `search_${searchQuery}`);
      }
    }
  }

  // Track Purchase - when user successfully purchases Basic/Premium plan or image credits
  trackPurchase() {
    // Listen for Stripe payment success
    window.addEventListener('stripe-payment-success', (event) => {
      const details = event.detail || {};

      this.trackEvent('Purchase', {
        content_name: details.planName || 'Subscription Plan',
        value: details.amount || 0,
        currency: details.currency || 'USD',
        content_type: 'product',
        content_category: 'Subscription'
      }, `purchase_${details.transactionId || Date.now()}`);
    });

    // Check URL for payment success parameters
    const urlParams = new URLSearchParams(window.location.search);

    // Check for credit purchase success
    if (urlParams.get('purchase') === 'credits') {
      const creditsPurchased = localStorage.getItem('credits_purchased');

      if (creditsPurchased) {
        const creditData = JSON.parse(creditsPurchased);

        this.trackEvent('Purchase', {
          content_name: `${creditData.credits} Image Credits`,
          value: creditData.amount || 0,
          currency: 'USD',
          content_type: 'product',
          content_category: 'Image Credits'
        }, `purchase_credits_${creditData.credits}_${Date.now()}`);

        // Clear flag
        localStorage.removeItem('credits_purchased');
      }
    }

    // Check for subscription purchase success
    if (urlParams.get('payment') === 'success' || urlParams.get('checkout') === 'success') {
      const planType = urlParams.get('plan') || 'Unknown';
      const amount = urlParams.get('amount') || (planType.toLowerCase() === 'premium' ? 9.99 : 4.99);

      this.trackEvent('Purchase', {
        content_name: `${planType} Plan`,
        value: parseFloat(amount),
        currency: 'USD',
        content_type: 'product',
        content_category: 'Subscription'
      }, `purchase_${planType}_${Date.now()}`);
    }

    // Also listen for localStorage payment success flag
    const checkPaymentSuccess = () => {
      const paymentSuccess = localStorage.getItem('payment_success');
      const planPurchased = localStorage.getItem('plan_purchased');

      if (paymentSuccess === 'true' && planPurchased) {
        const planData = JSON.parse(planPurchased);

        this.trackEvent('Purchase', {
          content_name: planData.name || 'Subscription Plan',
          value: planData.amount || 0,
          currency: planData.currency || 'USD',
          content_type: 'product',
          content_category: 'Subscription'
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
        window.seliraPixelTracking = new FacebookPixelTracking();
      } catch (error) {
        console.warn('⚠️ Facebook Pixel Tracking initialization failed:', error);
      }
    });
  } else {
    window.seliraPixelTracking = new FacebookPixelTracking();
  }

  // Also initialize after a short delay to ensure fbq is loaded
  setTimeout(() => {
    try {
      if (!window.seliraPixelTracking) {
        window.seliraPixelTracking = new FacebookPixelTracking();
      }
    } catch (error) {
      console.warn('⚠️ Facebook Pixel Tracking delayed initialization failed:', error);
    }
  }, 1000);

  console.log('📊 Facebook Pixel Events script loaded');
} catch (error) {
  console.warn('⚠️ Facebook Pixel Events script failed to initialize:', error);
}
