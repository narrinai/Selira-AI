/**
 * Selira AI Age Verification System
 * Shows 18+ popup on first visit to the website
 */

// Initialize age verification when DOM loads
document.addEventListener('DOMContentLoaded', function() {
  checkAgeVerification();
});

// Check if user needs age verification
function checkAgeVerification() {
  // Always show age verification on first visit (no localStorage check)
  // Only show once per session
  if (!sessionStorage.getItem('selira_age_verified_session')) {
    showAgeVerificationPopup();
  }
}

// Show age verification popup
function showAgeVerificationPopup() {
  createAgeVerificationHTML();
  
  const overlay = document.getElementById('age-verification-overlay');
  overlay.classList.add('show');
  
  // Prevent scrolling
  document.body.style.overflow = 'hidden';
}

// Create age verification HTML
function createAgeVerificationHTML() {
  // Check if already exists
  if (document.getElementById('age-verification-overlay')) return;

  const ageVerification = document.createElement('div');
  ageVerification.id = 'age-verification-overlay';
  ageVerification.className = 'age-verification-overlay';
  ageVerification.innerHTML = `
    <div class="age-verification-modal">
      <div class="age-verification-content">
        <div class="age-verification-logo-section">
          <img src="/selira-logo-gold.svg" alt="Selira AI" class="age-verification-logo-img" />
        </div>

        <div class="age-verification-body">
          <h2 class="age-verification-title">Age Verification</h2>
          <p class="age-verification-description">
            You must be at least 18 years old to use Selira.
          </p>
        </div>

        <div class="age-verification-footer">
          <button class="age-btn age-btn-confirm" onclick="confirmAgeVerification()">
            Yes, I am 18+
          </button>
          <button class="age-btn age-btn-deny" onclick="denyAgeVerification()">
            No, I am not
          </button>
        </div>

        <div class="age-verification-disclaimer">
          By continuing, you confirm that you are at least 18 years old and agree to our <a href="/terms-and-conditions" target="_blank">Terms of Service</a> and <a href="/privacy-policy" target="_blank">Privacy Policy</a>.
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(ageVerification);
  addAgeVerificationStyles();
}

// Add age verification styles
function addAgeVerificationStyles() {
  if (document.getElementById('age-verification-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'age-verification-styles';
  styles.textContent = `
    .age-verification-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(10, 10, 10, 0.98);
      backdrop-filter: blur(10px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 20px;
    }

    .age-verification-overlay.show {
      display: flex;
    }

    .age-verification-modal {
      background: #1a1a1a;
      border-radius: 24px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7);
      animation: ageVerificationSlideIn 0.4s ease;
      overflow: hidden;
    }

    .age-verification-content {
      padding: 0;
    }

    .age-verification-logo-section {
      text-align: center;
      padding: 48px 32px 32px;
    }

    .age-verification-logo-img {
      height: 60px;
      width: auto;
      margin: 0 auto;
      display: block;
    }

    .age-verification-body {
      padding: 0 40px 32px;
      text-align: center;
    }

    .age-verification-title {
      font-family: 'Inter', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 16px 0;
      letter-spacing: -0.5px;
    }

    .age-verification-description {
      color: #9ca3af;
      font-size: 16px;
      line-height: 1.6;
      margin: 0;
    }

    .age-verification-footer {
      padding: 0 40px 40px;
      display: flex;
      gap: 12px;
      flex-direction: row;
    }

    .age-btn {
      flex: 1;
      padding: 16px 24px;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: 'Inter', sans-serif;
    }

    .age-btn-confirm {
      background: #10b981;
      color: white;
    }

    .age-btn-confirm:hover {
      background: #059669;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    .age-btn-deny {
      background: #374151;
      color: #d1d5db;
    }

    .age-btn-deny:hover {
      background: #4b5563;
      color: #ffffff;
    }

    .btn-icon {
      font-size: 16px;
      font-weight: 700;
    }

    .age-verification-disclaimer {
      padding: 24px 40px 32px;
      font-size: 13px;
      color: #6b7280;
      text-align: center;
      line-height: 1.6;
    }

    .age-verification-disclaimer a {
      color: #d4a574;
      text-decoration: none;
    }

    .age-verification-disclaimer a:hover {
      text-decoration: underline;
    }

    /* Mobile responsiveness */
    @media (max-width: 480px) {
      .age-verification-modal {
        margin: 20px;
        max-width: none;
        border-radius: 20px;
      }

      .age-verification-logo-section {
        padding: 40px 24px 24px;
      }

      .age-verification-logo {
        font-size: 40px;
      }

      .age-verification-body {
        padding: 0 24px 24px;
      }

      .age-verification-title {
        font-size: 24px;
      }

      .age-verification-description {
        font-size: 15px;
      }

      .age-verification-footer {
        padding: 0 24px 32px;
        flex-direction: column;
      }

      .age-btn {
        padding: 14px 20px;
        font-size: 15px;
      }

      .age-verification-disclaimer {
        padding: 20px 24px 28px;
        font-size: 12px;
      }
    }

    @keyframes ageVerificationSlideIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
  `;
  
  document.head.appendChild(styles);
}

// Confirm age verification
function confirmAgeVerification() {
  // Store verification in sessionStorage (only for current session, not persistent)
  sessionStorage.setItem('selira_age_verified_session', 'true');

  // Hide popup
  hideAgeVerificationPopup();
}

// Deny age verification
function denyAgeVerification() {
  // Redirect to Google.com
  window.location.href = 'https://www.google.com';
}

// Hide age verification popup
function hideAgeVerificationPopup() {
  const overlay = document.getElementById('age-verification-overlay');
  if (overlay) {
    overlay.classList.remove('show');

    // Remove element after animation
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 300);
  }

  // Restore scrolling - always execute this even if overlay doesn't exist
  document.body.style.overflow = '';
}

// Export functions for external use
window.SeliraAgeVerification = {
  show: showAgeVerificationPopup,
  hide: hideAgeVerificationPopup,
  reset: () => {
    sessionStorage.removeItem('selira_age_verified_session');
  },
  isVerified: () => {
    return sessionStorage.getItem('selira_age_verified_session') === 'true';
  }
};