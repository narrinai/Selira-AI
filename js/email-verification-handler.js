/**
 * Email Verification Handler
 * Checks if user just verified their email and shows success message + opens login
 * Include this script on all pages that should handle post-verification redirects
 */

(function() {
  'use strict';

  // Show success message
  function showSuccessMessage() {
    // Remove existing message if any
    const existing = document.getElementById('emailVerifiedSuccess');
    if (existing) existing.remove();

    const successDiv = document.createElement('div');
    successDiv.id = 'emailVerifiedSuccess';
    successDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 20px 24px;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
        z-index: 100000;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideInRight 0.4s ease-out;
        max-width: 400px;
      ">
        <span style="font-size: 28px;">✓</span>
        <div>
          <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">Email Verified!</div>
          <div style="font-size: 14px; opacity: 0.95;">You can now sign in to access all features</div>
        </div>
      </div>
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(500px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(500px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(successDiv);

    // Auto-hide after 6 seconds
    setTimeout(() => {
      successDiv.querySelector('div').style.animation = 'slideOutRight 0.4s ease-in';
      setTimeout(() => successDiv.remove(), 400);
    }, 6000);
  }

  // Check if user just verified their email
  function checkEmailVerification() {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('verified') === 'true') {
      console.log('✅ Email verified - showing success message and opening sign in modal');

      // Remove the parameter from URL (clean URL)
      const newUrl = window.location.pathname +
        (window.location.search.replace(/[?&]verified=true(&|$)/, '$1').replace(/^&/, '?') || '');
      window.history.replaceState({}, document.title, newUrl);

      // Show success message
      setTimeout(showSuccessMessage, 300);

      // Open the auth modal in sign-in mode after a short delay
      setTimeout(() => {
        if (window.seliraAuth) {
          window.seliraAuth.openModal('signin');
        } else if (window.openLoginModal) {
          window.openLoginModal('signin');
        } else {
          console.warn('⚠️ Auth modal not found. Please sign in manually.');
        }
      }, 800);
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkEmailVerification);
  } else {
    // DOM already loaded
    checkEmailVerification();
  }
})();
