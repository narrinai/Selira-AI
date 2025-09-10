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
  const ageVerified = localStorage.getItem('selira_age_verified');
  const verificationDate = localStorage.getItem('selira_age_verification_date');
  
  // Check if verification is valid (within 30 days)
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const isVerificationExpired = verificationDate && parseInt(verificationDate) < thirtyDaysAgo;
  
  if (!ageVerified || isVerificationExpired) {
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
  ageVerification.innerHTML = `
    <div class="age-verification-overlay">
      <div class="age-verification-modal">
        <div class="age-verification-content">
          <div class="age-verification-header">
            <div class="age-verification-logo">
              <div class="logo-icon">🔞</div>
              <div class="logo-text">Selira AI</div>
            </div>
          </div>
          
          <div class="age-verification-body">
            <h2 class="age-verification-title">Age Verification Required</h2>
            <p class="age-verification-description">
              You must be 18 years or older to access Selira AI. Our platform contains 
              mature content and AI companions designed for adult users only.
            </p>
            
            <div class="age-verification-warning">
              <div class="warning-icon">⚠️</div>
              <div class="warning-text">
                <strong>Adult Content Notice:</strong><br>
                This site contains AI-generated adult conversations and mature themes.
              </div>
            </div>
            
            <div class="age-verification-question">
              <h3>Are you 18 years of age or older?</h3>
            </div>
          </div>
          
          <div class="age-verification-footer">
            <button class="age-btn age-btn-deny" onclick="denyAgeVerification()">
              <span class="btn-icon">❌</span>
              <span>No, I'm under 18</span>
            </button>
            <button class="age-btn age-btn-confirm" onclick="confirmAgeVerification()">
              <span class="btn-icon">✅</span>
              <span>Yes, I'm 18 or older</span>
            </button>
          </div>
          
          <div class="age-verification-disclaimer">
            By clicking "Yes, I'm 18 or older", you confirm that you are of legal age 
            and consent to viewing adult content.
          </div>
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
      background: rgba(0, 0, 0, 0.95);
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
      background: var(--bg-secondary, #1a1a1a);
      border: 2px solid var(--accent, #d4a574);
      border-radius: var(--radius-lg, 16px);
      max-width: 500px;
      width: 100%;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      animation: ageVerificationSlideIn 0.4s ease;
      overflow: hidden;
    }
    
    .age-verification-content {
      padding: 0;
    }
    
    .age-verification-header {
      background: linear-gradient(135deg, var(--accent, #d4a574) 0%, var(--accent-hover, #c19456) 100%);
      padding: 24px;
      text-align: center;
    }
    
    .age-verification-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }
    
    .logo-icon {
      font-size: 32px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }
    
    .logo-text {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      font-weight: 700;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    .age-verification-body {
      padding: 32px 24px;
      text-align: center;
    }
    
    .age-verification-title {
      font-family: 'Playfair Display', serif;
      font-size: 24px;
      font-weight: 600;
      color: var(--text-primary, #ffffff);
      margin: 0 0 20px 0;
    }
    
    .age-verification-description {
      color: var(--text-secondary, #b3b3b3);
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    
    .age-verification-warning {
      background: var(--bg-tertiary, #2a2a2a);
      border: 1px solid rgba(255, 165, 0, 0.3);
      border-radius: var(--radius-md, 12px);
      padding: 16px;
      margin-bottom: 24px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    
    .warning-icon {
      font-size: 20px;
      flex-shrink: 0;
    }
    
    .warning-text {
      color: var(--text-primary, #ffffff);
      font-size: 14px;
      line-height: 1.5;
    }
    
    .age-verification-question {
      margin-top: 24px;
    }
    
    .age-verification-question h3 {
      font-family: 'Inter', sans-serif;
      font-size: 18px;
      font-weight: 600;
      color: var(--accent, #d4a574);
      margin: 0;
    }
    
    .age-verification-footer {
      padding: 0 24px 24px;
      display: flex;
      gap: 16px;
      flex-direction: column;
    }
    
    .age-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 16px 24px;
      border: none;
      border-radius: var(--radius-md, 12px);
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-family: 'Inter', sans-serif;
    }
    
    .age-btn-confirm {
      background: var(--accent, #d4a574);
      color: white;
      border: 2px solid var(--accent, #d4a574);
    }
    
    .age-btn-confirm:hover {
      background: var(--accent-hover, #c19456);
      border-color: var(--accent-hover, #c19456);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(212, 165, 116, 0.3);
    }
    
    .age-btn-deny {
      background: transparent;
      color: var(--text-secondary, #b3b3b3);
      border: 2px solid var(--border, #333333);
    }
    
    .age-btn-deny:hover {
      background: var(--bg-tertiary, #2a2a2a);
      color: var(--text-primary, #ffffff);
      border-color: #666666;
    }
    
    .btn-icon {
      font-size: 18px;
    }
    
    .age-verification-disclaimer {
      padding: 16px 24px 24px;
      font-size: 12px;
      color: var(--text-muted, #888888);
      text-align: center;
      line-height: 1.4;
      border-top: 1px solid var(--border, #333333);
      background: var(--bg-primary, #0a0a0a);
    }
    
    /* Mobile responsiveness */
    @media (max-width: 480px) {
      .age-verification-modal {
        margin: 20px;
        max-width: none;
      }
      
      .age-verification-header {
        padding: 20px;
      }
      
      .logo-text {
        font-size: 24px;
      }
      
      .age-verification-body {
        padding: 24px 20px;
      }
      
      .age-verification-title {
        font-size: 20px;
      }
      
      .age-verification-footer {
        padding: 0 20px 20px;
      }
      
      .age-btn {
        padding: 14px 20px;
        font-size: 15px;
      }
    }
    
    @keyframes ageVerificationSlideIn {
      from { 
        opacity: 0; 
        transform: scale(0.9) translateY(-20px); 
      }
      to { 
        opacity: 1; 
        transform: scale(1) translateY(0); 
      }
    }
    
    /* Pulse animation for confirm button */
    .age-btn-confirm {
      animation: confirmPulse 2s infinite;
    }
    
    @keyframes confirmPulse {
      0%, 100% { 
        box-shadow: 0 0 0 0 rgba(212, 165, 116, 0.4);
      }
      50% { 
        box-shadow: 0 0 0 8px rgba(212, 165, 116, 0);
      }
    }
  `;
  
  document.head.appendChild(styles);
}

// Confirm age verification
function confirmAgeVerification() {
  // Store verification in localStorage
  localStorage.setItem('selira_age_verified', 'true');
  localStorage.setItem('selira_age_verification_date', Date.now().toString());
  
  // Hide popup
  hideAgeVerificationPopup();
}

// Deny age verification
function denyAgeVerification() {
  // Redirect to age-appropriate content or block access
  showAgeRestrictionMessage();
}

// Show age restriction message
function showAgeRestrictionMessage() {
  const overlay = document.getElementById('age-verification-overlay');
  const modal = overlay.querySelector('.age-verification-modal');
  
  modal.innerHTML = `
    <div class="age-verification-content">
      <div class="age-verification-header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
        <div class="age-verification-logo">
          <div class="logo-icon">🚫</div>
          <div class="logo-text">Access Denied</div>
        </div>
      </div>
      
      <div class="age-verification-body">
        <h2 class="age-verification-title">Sorry, you must be 18 or older</h2>
        <p class="age-verification-description">
          Selira AI is designed exclusively for adults. Please come back when you're 18 or older.
        </p>
        
        <div class="age-verification-suggestion">
          <h3 style="color: var(--accent, #d4a574); margin-bottom: 16px;">Looking for age-appropriate AI?</h3>
          <p style="color: var(--text-secondary, #b3b3b3);">
            We recommend checking out family-friendly AI assistants and educational platforms 
            that are designed for younger users.
          </p>
        </div>
      </div>
      
      <div class="age-verification-footer">
        <button class="age-btn age-btn-deny" onclick="redirectAway()" style="width: 100%;">
          <span class="btn-icon">🏠</span>
          <span>Take me to a safe site</span>
        </button>
      </div>
    </div>
  `;
}

// Hide age verification popup
function hideAgeVerificationPopup() {
  const overlay = document.getElementById('age-verification-overlay');
  overlay.classList.remove('show');
  
  // Restore scrolling
  document.body.style.overflow = '';
  
  // Remove element after animation
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }, 300);
}

// Redirect away for underage users
function redirectAway() {
  window.location.href = 'https://www.google.com/search?q=educational+games+for+kids';
}

// Export functions for external use
window.SeliraAgeVerification = {
  show: showAgeVerificationPopup,
  hide: hideAgeVerificationPopup,
  reset: () => {
    localStorage.removeItem('selira_age_verified');
    localStorage.removeItem('selira_age_verification_date');
  },
  isVerified: () => {
    const ageVerified = localStorage.getItem('selira_age_verified');
    const verificationDate = localStorage.getItem('selira_age_verification_date');
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return ageVerified && verificationDate && parseInt(verificationDate) > thirtyDaysAgo;
  }
};