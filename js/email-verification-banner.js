/**
 * Email Verification Banner
 * Shows a banner to users who haven't verified their email yet
 */

(function() {
  'use strict';

  // Banner HTML and styles
  const bannerHTML = `
    <div id="emailVerificationBanner" style="
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-bottom: 2px solid #f59e0b;
      padding: 12px 20px;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    ">
      <div style="
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      ">
        <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
          <span style="font-size: 20px;">⚠️</span>
          <div>
            <strong style="color: #92400e; font-size: 14px;">Please verify your email address</strong>
            <p style="color: #78350f; font-size: 13px; margin: 2px 0 0 0;">
              Check your inbox for a verification link to unlock all features.
            </p>
          </div>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <button id="resendVerificationBtn" style="
            background: #f59e0b;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            white-space: nowrap;
          ">
            Resend Email
          </button>
          <button id="closeBannerBtn" style="
            background: transparent;
            border: none;
            color: #92400e;
            font-size: 20px;
            cursor: pointer;
            padding: 4px 8px;
            line-height: 1;
          ">
            ×
          </button>
        </div>
      </div>
    </div>
  `;

  // Add banner to page
  function createBanner() {
    if (document.getElementById('emailVerificationBanner')) return;

    document.body.insertAdjacentHTML('afterbegin', bannerHTML);

    // Add event listeners
    const closeBtn = document.getElementById('closeBannerBtn');
    const resendBtn = document.getElementById('resendVerificationBtn');

    if (closeBtn) {
      closeBtn.addEventListener('click', hideBanner);
    }

    if (resendBtn) {
      resendBtn.addEventListener('click', resendVerificationEmail);
    }

    // Hover effect for resend button
    if (resendBtn) {
      resendBtn.addEventListener('mouseenter', () => {
        resendBtn.style.background = '#d97706';
        resendBtn.style.transform = 'translateY(-1px)';
      });
      resendBtn.addEventListener('mouseleave', () => {
        resendBtn.style.background = '#f59e0b';
        resendBtn.style.transform = 'translateY(0)';
      });
    }
  }

  // Show banner
  function showBanner() {
    const banner = document.getElementById('emailVerificationBanner');
    if (banner) {
      banner.style.display = 'block';
      // Adjust body padding to prevent content jump
      document.body.style.paddingTop = banner.offsetHeight + 'px';
    }
  }

  // Hide banner
  function hideBanner() {
    const banner = document.getElementById('emailVerificationBanner');
    if (banner) {
      banner.style.display = 'none';
      document.body.style.paddingTop = '0';
      // Store that user dismissed it (session storage - reappears on reload)
      sessionStorage.setItem('emailBannerDismissed', 'true');
    }
  }

  // Resend verification email
  async function resendVerificationEmail() {
    const btn = document.getElementById('resendVerificationBtn');
    const originalText = btn.textContent;

    try {
      btn.disabled = true;
      btn.textContent = 'Sending...';
      btn.style.opacity = '0.7';

      // Get user from Auth0
      if (window.auth0Client) {
        const user = await window.auth0Client.getUser();

        // Call Auth0 Management API to resend verification email
        // You'll need to implement a Netlify function for this
        const response = await fetch('/.netlify/functions/resend-verification-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.sub })
        });

        if (response.ok) {
          btn.textContent = '✓ Sent!';
          btn.style.background = '#10b981';
          setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '#f59e0b';
            btn.disabled = false;
            btn.style.opacity = '1';
          }, 3000);
        } else {
          throw new Error('Failed to resend email');
        }
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      btn.textContent = '✗ Failed';
      btn.style.background = '#ef4444';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '#f59e0b';
        btn.disabled = false;
        btn.style.opacity = '1';
      }, 3000);
    }
  }

  // Check if user needs to verify email
  async function checkEmailVerificationStatus() {
    try {
      // Check if banner was dismissed this session
      if (sessionStorage.getItem('emailBannerDismissed') === 'true') {
        return;
      }

      // Wait for Auth0 to be ready
      if (!window.auth0Client) {
        console.log('⏳ Waiting for Auth0 client...');
        setTimeout(checkEmailVerificationStatus, 500);
        return;
      }

      const isAuthenticated = await window.auth0Client.isAuthenticated();

      if (isAuthenticated) {
        const user = await window.auth0Client.getUser();

        // Show banner if email is not verified
        if (user && !user.email_verified) {
          console.log('⚠️ Email not verified - showing banner');
          createBanner();
          showBanner();
        }
      }
    } catch (error) {
      console.error('Error checking email verification:', error);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(checkEmailVerificationStatus, 1000);
    });
  } else {
    setTimeout(checkEmailVerificationStatus, 1000);
  }

  // Also check when auth state changes
  window.addEventListener('authStateChanged', checkEmailVerificationStatus);

  // Hide banner when user verifies email
  window.addEventListener('emailVerified', hideBanner);

})();
