/**
 * Unverified Email Banner
 * Shows a banner for users who tried to login but haven't verified their email yet
 * Includes a "Resend Email" button to trigger verification email again
 */

(function() {
  'use strict';

  let bannerShown = false;

  // Create and show the banner
  function showUnverifiedBanner(userEmail) {
    // Don't show if already shown
    if (bannerShown) return;

    // Don't show if user dismissed it this session
    if (sessionStorage.getItem('unverifiedBannerDismissed') === 'true') return;

    // Remove existing banner if any
    const existing = document.getElementById('unverifiedEmailBanner');
    if (existing) existing.remove();

    bannerShown = true;

    const banner = document.createElement('div');
    banner.id = 'unverifiedEmailBanner';
    banner.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border-bottom: 2px solid #f59e0b;
        padding: 16px 20px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        animation: slideDown 0.4s ease-out;
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
          <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 280px;">
            <span style="font-size: 24px; flex-shrink: 0;">⚠️</span>
            <div>
              <div style="color: #92400e; font-size: 15px; font-weight: 700; margin-bottom: 4px;">
                Email Verification Required
              </div>
              <div style="color: #78350f; font-size: 14px; line-height: 1.4;">
                Please verify your email to sign in. Check your inbox${userEmail ? ` at <strong>${userEmail}</strong>` : ''} or click resend below.
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: center;">
            <button id="resendVerificationBtn" style="
              background: #f59e0b;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 10px;
              font-size: 14px;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.3s ease;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
            ">
              Resend Email
            </button>
            <button id="closeBannerBtn" style="
              background: transparent;
              border: none;
              color: #92400e;
              font-size: 24px;
              cursor: pointer;
              padding: 4px 8px;
              line-height: 1;
              transition: opacity 0.2s ease;
            ">
              ×
            </button>
          </div>
        </div>
      </div>
    `;

    // Add animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes slideUp {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(-100%);
          opacity: 0;
        }
      }
      #resendVerificationBtn:hover {
        background: #d97706;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
      }
      #closeBannerBtn:hover {
        opacity: 0.7;
      }
      @media (max-width: 640px) {
        #unverifiedEmailBanner > div > div:first-child {
          flex-direction: column;
          align-items: flex-start;
        }
        #unverifiedEmailBanner > div > div:last-child {
          width: 100%;
          justify-content: stretch;
        }
        #resendVerificationBtn {
          flex: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(banner);

    // Adjust body padding to prevent content jump
    document.body.style.paddingTop = banner.offsetHeight + 'px';

    // Add event listeners
    const closeBtn = document.getElementById('closeBannerBtn');
    const resendBtn = document.getElementById('resendVerificationBtn');

    closeBtn.addEventListener('click', () => {
      banner.querySelector('div').style.animation = 'slideUp 0.4s ease-in';
      setTimeout(() => {
        banner.remove();
        document.body.style.paddingTop = '0';
        sessionStorage.setItem('unverifiedBannerDismissed', 'true');
      }, 400);
    });

    resendBtn.addEventListener('click', async () => {
      await resendVerificationEmail(resendBtn, userEmail);
    });
  }

  // Resend verification email
  async function resendVerificationEmail(btn, userEmail) {
    const originalText = btn.textContent;
    const originalBg = btn.style.background;

    try {
      btn.disabled = true;
      btn.textContent = 'Sending...';
      btn.style.opacity = '0.7';
      btn.style.cursor = 'not-allowed';

      // Get the user ID from Auth0
      let userId = null;

      // Try to get from localStorage (stored during failed login attempt)
      const storedUserId = localStorage.getItem('pendingVerificationUserId');

      if (storedUserId) {
        userId = storedUserId;
      } else if (userEmail) {
        // If we have email, we can construct the user ID (auth0|email format)
        // This is a fallback - we'll need the actual user_id
        console.warn('⚠️ No user ID found, using email fallback');
      }

      if (!userId) {
        throw new Error('Unable to identify user. Please try logging in again.');
      }

      console.log('📧 Requesting verification email resend...');

      const response = await fetch('/.netlify/functions/resend-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Verification email sent successfully');
        btn.textContent = '✓ Email Sent!';
        btn.style.background = '#10b981';

        // Clear the stored user ID
        localStorage.removeItem('pendingVerificationUserId');

        // Show success for 3 seconds
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = originalBg;
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
        }, 3000);
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('❌ Error resending verification email:', error);
      btn.textContent = '✗ Failed';
      btn.style.background = '#ef4444';

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = originalBg;
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }, 3000);
    }
  }

  // Listen for login errors from Auth0
  window.addEventListener('auth0LoginError', (event) => {
    const error = event.detail;

    // Check if error is related to email verification
    if (error && (
      error.error === 'unauthorized' ||
      error.error_description?.toLowerCase().includes('verify') ||
      error.error_description?.toLowerCase().includes('email')
    )) {
      console.log('⚠️ Login blocked - email not verified');

      // Store user info if available
      if (error.userId) {
        localStorage.setItem('pendingVerificationUserId', error.userId);
      }

      // Show banner
      setTimeout(() => {
        showUnverifiedBanner(error.email || null);
      }, 500);
    }
  });

  // Also check on page load if there's a pending verification
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const pendingUserId = localStorage.getItem('pendingVerificationUserId');
      if (pendingUserId) {
        setTimeout(() => showUnverifiedBanner(null), 1000);
      }
    });
  } else {
    const pendingUserId = localStorage.getItem('pendingVerificationUserId');
    if (pendingUserId) {
      setTimeout(() => showUnverifiedBanner(null), 1000);
    }
  }

})();
