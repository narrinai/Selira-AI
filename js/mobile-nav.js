/**
 * Universal Mobile Navigation System for Selira AI
 * Provides consistent mobile navigation across all pages
 */

// Initialize mobile navigation when DOM loads
document.addEventListener('DOMContentLoaded', function() {
  createMobileNav();
  attachMobileNavEvents();
  initAuthStateListener();
});

// Listen for auth state changes and update mobile nav
function initAuthStateListener() {
  // Check initial auth state
  setTimeout(() => {
    updateMobileNavAuthState();
  }, 1000);

  // Listen for auth state changes
  window.addEventListener('auth-state-changed', function(event) {
    updateMobileNavAuthState(event.detail);
  });
}

// Update mobile nav based on auth state
function updateMobileNavAuthState(authDetail = null) {
  const profileBtn = document.getElementById('mobileProfileBtn');
  const profileText = profileBtn?.querySelector('.profile-text');
  const loginLinks = document.querySelectorAll('.mobile-menu-nav .login-link, .mobile-menu-nav .signup-link');
  const profileLink = document.querySelector('.mobile-menu-nav .profile-link');

  if (!profileBtn || !profileText) return;

  let isAuthenticated = false;
  if (authDetail) {
    isAuthenticated = authDetail.isAuthenticated;
  } else if (window.isUserAuthenticated) {
    isAuthenticated = window.isUserAuthenticated();
  }

  // Update profile button text and style
  if (isAuthenticated) {
    profileText.textContent = 'Image Deals';
    profileBtn.style.background = 'var(--accent, #ce93d8)';
    profileBtn.style.color = 'white';
    profileBtn.style.borderRadius = '8px';
    profileBtn.style.padding = '8px 16px';
    profileBtn.style.fontSize = '13px';
    profileBtn.style.fontWeight = '600';
    profileBtn.style.width = 'auto';
    profileBtn.style.height = 'auto';
    profileBtn.style.border = '1px solid transparent';
    // Show Profile link in menu for authenticated users
    if (profileLink) profileLink.style.display = 'flex';
    // Hide login/signup links in menu
    loginLinks.forEach(link => link.style.display = 'none');
  } else {
    // Always show "Register" on mobile header button
    profileText.textContent = 'Register';
    profileBtn.style.background = 'var(--accent, #ce93d8)';
    profileBtn.style.color = 'white';
    profileBtn.style.borderRadius = '8px';
    profileBtn.style.padding = '8px 16px';
    profileBtn.style.fontSize = '13px';
    profileBtn.style.fontWeight = '600';
    profileBtn.style.width = 'auto';
    profileBtn.style.height = 'auto';
    profileBtn.style.border = '1px solid transparent';
    // Hide Profile link in menu for non-authenticated users
    if (profileLink) profileLink.style.display = 'none';
    // Show login/signup links in menu
    loginLinks.forEach(link => link.style.display = 'flex');
  }
}

// Create mobile navigation HTML
function createMobileNav() {
  // Check if mobile nav already exists
  if (document.getElementById('selira-mobile-nav')) return;
  
  const mobileNav = document.createElement('div');
  mobileNav.id = 'selira-mobile-nav';
  mobileNav.innerHTML = `
    <div class="mobile-nav-bar">
      <div class="mobile-nav-left">
        <button class="mobile-nav-btn mobile-menu-btn" id="mobileMenuBtn">
          <div class="hamburger-lines">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>
      
      <div class="mobile-nav-center">
        <a href="/category" class="mobile-logo">Selira AI</a>
      </div>
      
      <div class="mobile-nav-right">
        <button class="mobile-nav-btn mobile-search-btn" id="mobileSearchBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <button class="mobile-nav-btn mobile-profile-btn" id="mobileProfileBtn">
          <span class="profile-text">Login</span>
        </button>
      </div>
    </div>
    
    <!-- Mobile Menu Overlay -->
    <div class="mobile-menu-overlay" id="mobileMenuOverlay">
      <div class="mobile-menu-content">
        <div class="mobile-menu-header">
          <div class="mobile-menu-logo">Selira AI</div>
          <button class="mobile-menu-close" id="mobileMenuClose">✕</button>
        </div>
        <nav class="mobile-menu-nav">
          <a href="/category" class="mobile-menu-link">
            <span class="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span>
            <span>Discover</span>
          </a>
          <a href="/my-companions" class="mobile-menu-link">
            <span class="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span>
            <span>My Companions</span>
          </a>
          <a href="/create" class="mobile-menu-link">
            <span class="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></span>
            <span>Create</span>
          </a>
          <a href="/free-nsfw-image-generator" class="mobile-menu-link">
            <span class="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></span>
            <span>Image Generator</span>
          </a>
          <div class="mobile-menu-divider"></div>
          <a href="/profile" class="mobile-menu-link profile-link" style="display: none;">
            <span class="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></span>
            <span>Profile</span>
          </a>
          <a href="/pricing" class="mobile-menu-link">
            <span class="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></span>
            <span>Pricing</span>
          </a>
          <a href="/affiliate-program" class="mobile-menu-link">
            <span class="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></span>
            <span>Affiliate Program</span>
          </a>

          <a href="#" class="mobile-menu-link login-link" onclick="openLoginModal('login'); return false;">
            <span class="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg></span>
            <span>Login</span>
          </a>
          <a href="#" class="mobile-menu-btn-register signup-link" onclick="openLoginModal('signup'); return false;">
            Register
          </a>
          <div class="mobile-menu-divider"></div>

          <!-- Footer Links Section -->
          <div class="mobile-footer-links">
            <a href="/about" class="mobile-footer-link">About</a>
            <a href="/contact" class="mobile-footer-link">Contact</a>
            <a href="/privacy-policy" class="mobile-footer-link">Privacy Policy</a>
            <a href="/terms-and-conditions" class="mobile-footer-link">Terms & Conditions</a>
            <a href="https://companionguide.ai/companions/selira-ai" target="_blank" rel="noopener noreferrer" class="mobile-footer-link">CompanionGuide.ai 9.3/10 <span style="color: #FFD700; filter: brightness(1.2);">★★★★★</span></a>
          </div>

          <!-- Payment Icons -->
          <div class="mobile-payment-icons">
            <!-- PayPal -->
            <svg class="mobile-payment-icon" viewBox="0 0 124 33" xmlns="http://www.w3.org/2000/svg">
              <path fill="#253B80" d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.985-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.704.359.42.469 1.044.332 1.906zM66.654 13.075h-3.275a.57.57 0 0 0-.563.481l-.145.916-.229-.332c-.709-1.029-2.29-1.373-3.868-1.373-3.619 0-6.71 2.741-7.312 6.586-.313 1.918.132 3.752 1.22 5.031.998 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .562.66h2.95a.95.95 0 0 0 .939-.803l1.77-11.209a.568.568 0 0 0-.561-.658zm-4.565 6.374c-.316 1.871-1.801 3.127-3.695 3.127-.951 0-1.711-.305-2.199-.883-.484-.574-.668-1.391-.514-2.301.295-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.499.589.697 1.411.554 2.317zM84.096 13.075h-3.291a.954.954 0 0 0-.787.417l-4.539 6.686-1.924-6.425a.953.953 0 0 0-.912-.678h-3.234a.57.57 0 0 0-.541.754l3.625 10.638-3.408 4.811a.57.57 0 0 0 .465.9h3.287a.949.949 0 0 0 .781-.408l10.946-15.8a.57.57 0 0 0-.468-.895z"/>
              <path fill="#179BD7" d="M94.992 6.749h-6.84a.95.95 0 0 0-.938.802l-2.766 17.537a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .938-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.971-1.142-2.694-1.746-4.983-1.746zm.789 6.405c-.373 2.454-2.248 2.454-4.062 2.454h-1.031l.725-4.583a.568.568 0 0 1 .562-.481h.473c1.234 0 2.4 0 3.002.704.359.42.468 1.044.331 1.906zM115.434 13.075h-3.273a.567.567 0 0 0-.562.481l-.145.916-.23-.332c-.709-1.029-2.289-1.373-3.867-1.373-3.619 0-6.709 2.741-7.311 6.586-.312 1.918.131 3.752 1.219 5.031 1 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .564.66h2.949a.95.95 0 0 0 .938-.803l1.771-11.209a.571.571 0 0 0-.565-.658zm-4.565 6.374c-.314 1.871-1.801 3.127-3.695 3.127-.949 0-1.711-.305-2.199-.883-.484-.574-.666-1.391-.514-2.301.297-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.501.589.699 1.411.554 2.317zM119.295 7.23l-2.807 17.858a.569.569 0 0 0 .562.658h2.822c.469 0 .867-.34.938-.803l2.768-17.536a.57.57 0 0 0-.562-.659h-3.16a.571.571 0 0 0-.561.482z"/>
              <path fill="#253B80" d="M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292a.316.316 0 0 1 .314-.268h9.38c3.114 0 5.263.648 6.385 1.927.526.6.861 1.227 1.023 1.917.17.724.173 1.589.007 2.644l-.012.077v.676l.526.298a3.69 3.69 0 0 1 1.065.812c.45.513.741 1.165.864 1.938.127.795.085 1.741-.123 2.812-.24 1.232-.628 2.305-1.152 3.183a6.547 6.547 0 0 1-1.825 2c-.696.494-1.523.869-2.458 1.109-.906.236-1.939.355-3.072.355h-.73c-.522 0-1.029.188-1.427.525a2.21 2.21 0 0 0-.744 1.328l-.055.299-.924 5.855-.042.215c-.011.068-.03.102-.058.125a.155.155 0 0 1-.096.035H7.266z"/>
              <path fill="#179BD7" d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83l-.399 2.533a.704.704 0 0 0 .695.814h4.881c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.336-1.03z"/>
              <path fill="#222D65" d="M21.754 7.151a9.757 9.757 0 0 0-1.203-.267 15.284 15.284 0 0 0-2.426-.177h-7.352a1.172 1.172 0 0 0-1.159.992L8.05 17.605l-.045.289a1.336 1.336 0 0 1 1.321-1.132h2.752c5.405 0 9.637-2.195 10.874-8.545.037-.188.068-.371.096-.55a6.594 6.594 0 0 0-1.017-.429 9.045 9.045 0 0 0-.277-.087z"/>
              <path fill="#253B80" d="M9.614 7.699a1.169 1.169 0 0 1 1.159-.991h7.352c.871 0 1.684.057 2.426.177a9.757 9.757 0 0 1 1.481.353c.365.121.704.264 1.017.429.368-2.347-.003-3.945-1.272-5.392C20.378.682 17.853 0 14.622 0h-9.38c-.66 0-1.223.48-1.325 1.133L.01 25.898a.806.806 0 0 0 .795.932h5.791l1.454-9.225 1.564-9.906z"/>
            </svg>

            <!-- Mastercard -->
            <svg class="mobile-payment-icon" viewBox="0 0 48 30" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="30" rx="3" fill="#000"/>
              <circle cx="18" cy="15" r="10" fill="#EB001B"/>
              <circle cx="30" cy="15" r="10" fill="#F79E1B"/>
              <path fill="#FF5F00" d="M24 7.5c-2.088 1.623-3.43 4.149-3.43 7s1.342 5.377 3.43 7c2.088-1.623 3.43-4.149 3.43-7s-1.342-5.377-3.43-7z"/>
            </svg>

            <!-- Apple Pay -->
            <img src="/images/apple-pay-selira-ai.svg" alt="Apple Pay" class="mobile-payment-icon">

            <!-- Bitcoin -->
            <img src="/images/bitcoin-selira-ai.webp" alt="Bitcoin" class="mobile-payment-icon">
          </div>
        </nav>
      </div>
    </div>
    
    <!-- Mobile Search Overlay -->
    <div class="mobile-search-overlay" id="mobileSearchOverlay">
      <div class="mobile-search-content">
        <div class="mobile-search-header">
          <div class="mobile-search-input-wrapper">
            <input type="text" class="mobile-search-input" placeholder="blonde" id="mobileSearchInput">
            <button class="mobile-search-close" id="mobileSearchClose">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Insert at the beginning of body
  document.body.insertBefore(mobileNav, document.body.firstChild);
  
  // Add styles
  addMobileNavStyles();
}

// Add mobile navigation styles
function addMobileNavStyles() {
  if (document.getElementById('mobile-nav-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'mobile-nav-styles';
  styles.textContent = `
    #selira-mobile-nav {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 999998;
    }
    
    .mobile-nav-bar {
      background: var(--bg-secondary, #1a1a1a);
      border-bottom: 1px solid var(--border, #333333);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 60px;
    }
    
    .mobile-nav-left,
    .mobile-nav-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .mobile-nav-center {
      flex: 1;
      display: flex;
      justify-content: center;
    }
    
    .mobile-logo {
      font-family: 'Playfair Display', serif;
      font-size: 20px;
      font-weight: 700;
      color: var(--accent, #ce93d8);
      text-decoration: none;
    }
    
    .mobile-nav-btn {
      background: none;
      border: none;
      color: var(--text-primary, #ffffff);
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: background 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
    }
    
    .mobile-nav-btn:hover {
      background: var(--bg-tertiary, #2a2a2a);
    }
    
    .hamburger-lines {
      display: flex;
      flex-direction: column;
      gap: 3px;
      width: 20px;
    }
    
    .hamburger-lines span {
      display: block;
      height: 2px;
      background: var(--text-primary, #ffffff);
      border-radius: 1px;
      transition: all 0.3s ease;
    }
    
    .mobile-menu-btn.active .hamburger-lines span:nth-child(1) {
      transform: rotate(45deg) translate(5px, 5px);
    }
    
    .mobile-menu-btn.active .hamburger-lines span:nth-child(2) {
      opacity: 0;
    }
    
    .mobile-menu-btn.active .hamburger-lines span:nth-child(3) {
      transform: rotate(-45deg) translate(7px, -6px);
    }
    
    .search-icon,
    .profile-icon {
      font-size: 18px;
    }
    
    /* Mobile Menu Overlay */
    .mobile-menu-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      display: none;
      z-index: 999999;
    }
    
    .mobile-menu-overlay.show {
      display: block;
    }
    
    .mobile-menu-content {
      background: var(--bg-secondary, #1a1a1a);
      height: 100vh;
      width: 280px;
      position: fixed;
      left: 0;
      top: 0;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      overflow-y: auto;
    }
    
    .mobile-menu-overlay.show .mobile-menu-content {
      transform: translateX(0);
    }
    
    .mobile-menu-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border, #333333);
    }
    
    .mobile-menu-logo {
      font-family: 'Playfair Display', serif;
      font-size: 20px;
      font-weight: 700;
      color: var(--accent, #ce93d8);
    }
    
    .mobile-menu-close {
      background: none;
      border: none;
      color: var(--text-primary, #ffffff);
      font-size: 20px;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: background 0.2s ease;
    }
    
    .mobile-menu-close:hover {
      background: var(--bg-tertiary, #2a2a2a);
    }
    
    .mobile-menu-nav {
      padding: 12px 0;
    }

    .mobile-menu-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 20px;
      color: var(--text-primary, #ffffff);
      text-decoration: none;
      transition: background 0.2s ease;
      font-size: 15px;
    }
    
    .mobile-menu-link:hover {
      background: var(--bg-tertiary, #2a2a2a);
    }

    .menu-icon {
      width: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .menu-icon svg {
      stroke: var(--accent, #ce93d8);
    }

    .mobile-menu-btn-register {
      display: block;
      margin: 6px 20px;
      padding: 10px 16px;
      background: var(--accent, #ce93d8);
      color: white;
      border: 1px solid transparent;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .mobile-menu-btn-register:hover {
      background: var(--accent-hover, #c49563);
    }

    .mobile-menu-divider {
      height: 1px;
      background: var(--border, #333333);
      margin: 10px 20px;
    }

    /* Mobile Footer Links */
    .mobile-footer-links {
      display: flex;
      flex-direction: column;
      padding: 0 20px 16px;
      gap: 2px;
    }

    .mobile-footer-link {
      color: rgba(255, 255, 255, 0.5);
      text-decoration: none;
      font-size: 11px;
      font-weight: 400;
      padding: 4px 0;
      transition: color 0.2s ease;
      line-height: 1.3;
    }

    .mobile-footer-link:hover {
      color: rgba(255, 255, 255, 0.8);
    }

    /* Mobile Payment Icons */
    .mobile-payment-icons {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 20px 16px;
      opacity: 0.7;
    }

    .mobile-payment-icon {
      height: 18px;
      width: auto;
      transition: opacity 0.2s ease;
    }

    .mobile-payment-icon:hover {
      opacity: 1;
    }

    /* Mobile Search Overlay */
    .mobile-search-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--bg-primary, #0a0a0a);
      display: none;
      z-index: 999999;
    }
    
    .mobile-search-overlay.show {
      display: block;
    }
    
    .mobile-search-header {
      display: flex;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid var(--border, #333333);
    }

    .mobile-search-input-wrapper {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
    }

    .mobile-search-input {
      flex: 1;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border, #333333);
      border-radius: 12px;
      padding: 12px 48px 12px 16px;
      color: var(--text-primary, #ffffff);
      font-size: 16px;
      outline: none;
      width: 100%;
    }

    .mobile-search-input:focus {
      border-color: var(--accent, #ce93d8);
    }

    .mobile-search-input::placeholder {
      color: var(--text-muted, #888888);
    }

    .mobile-search-close {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      color: var(--text-muted, #888888);
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mobile-search-close svg {
      stroke: var(--text-muted, #888888);
    }

    .mobile-search-close:hover {
      background: var(--bg-tertiary, #2a2a2a);
    }

    .mobile-search-close:hover svg {
      stroke: var(--text-primary, #ffffff);
    }
    
    /* Show mobile nav on mobile devices */
    @media (max-width: 768px) {
      #selira-mobile-nav {
        display: block;
      }
      
      /* Add padding to body to account for mobile nav - ensure scrolling works */
      body {
        padding-top: 60px !important;
        overflow-x: hidden;
        overflow-y: auto;
      }
      
      /* Ensure html can scroll */
      html {
        overflow-x: hidden;
        overflow-y: auto;
      }
      
      /* Hide desktop navigation elements */
      .sidebar,
      .top-header,
      .mobile-header {
        display: none !important;
      }
      
      /* Adjust main content */
      .main-content {
        margin-left: 0 !important;
        min-height: calc(100vh - 60px);
        overflow-y: auto;
      }
      
      .app-container {
        flex-direction: column;
        min-height: 100vh;
      }
      
      /* Fix any potential overflow issues */
      .main-content * {
        max-width: 100%;
        box-sizing: border-box;
      }
    }
    
    /* Animation for menu items */
    @keyframes slideInLeft {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    .mobile-menu-overlay.show .mobile-menu-link {
      animation: slideInLeft 0.3s ease forwards;
    }
  `;
  
  document.head.appendChild(styles);
  
  // Add mobile scrolling fix for all pages
  addMobileScrollFix();
}

// Add mobile scrolling fix
function addMobileScrollFix() {
  // Only apply on mobile devices
  if (window.innerWidth <= 768) {
    // Ensure body and html can scroll
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowY = 'auto';
    document.body.style.overflowX = 'hidden';
    
    // Fix any height constraints that might prevent scrolling
    document.body.style.minHeight = '100vh';
    document.documentElement.style.minHeight = '100vh';
    
    // Ensure proper box-sizing
    document.body.style.boxSizing = 'border-box';
    
    // Add CSS for better mobile scrolling
    const scrollFix = document.createElement('style');
    scrollFix.id = 'mobile-scroll-fix';
    scrollFix.textContent = `
      @media (max-width: 768px) {
        * {
          -webkit-overflow-scrolling: touch;
        }
        
        body, html {
          overflow-x: hidden !important;
          overflow-y: auto !important;
          height: auto !important;
        }
        
        .main-content, .profile-section, .pricing-section {
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch;
        }
      }
    `;
    
    if (!document.getElementById('mobile-scroll-fix')) {
      document.head.appendChild(scrollFix);
    }
  }
}

// Attach event listeners
function attachMobileNavEvents() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const menuClose = document.getElementById('mobileMenuClose');
  const menuOverlay = document.getElementById('mobileMenuOverlay');
  const searchBtn = document.getElementById('mobileSearchBtn');
  const searchClose = document.getElementById('mobileSearchClose');
  const searchOverlay = document.getElementById('mobileSearchOverlay');
  const searchInput = document.getElementById('mobileSearchInput');
  const profileBtn = document.getElementById('mobileProfileBtn');
  
  // Menu toggle
  menuBtn.addEventListener('click', function() {
    // Always use mobile menu on mobile - chat sidebar is desktop only
    menuOverlay.classList.add('show');
    menuBtn.classList.add('active');
  });
  
  // Menu close
  menuClose.addEventListener('click', closeMobileMenu);
  
  // Close menu on overlay click
  menuOverlay.addEventListener('click', function(e) {
    if (e.target === menuOverlay) {
      closeMobileMenu();
    }
  });
  
  // Search toggle
  searchBtn.addEventListener('click', function() {
    searchOverlay.classList.add('show');
    setTimeout(() => searchInput.focus(), 100);
  });
  
  // Search close
  searchClose.addEventListener('click', closeMobileSearch);
  
  // Close search on overlay click
  searchOverlay.addEventListener('click', function(e) {
    if (e.target === searchOverlay) {
      closeMobileSearch();
    }
  });
  
  // Profile button - handle both authenticated and non-authenticated states
  profileBtn.addEventListener('click', function() {
    if (window.isUserAuthenticated && window.isUserAuthenticated()) {
      // User is authenticated, go to pricing credits tab (Image Deals button)
      window.location.href = '/pricing?tab=credits';
    } else {
      // User not authenticated, always open signup modal
      if (window.openLoginModal) {
        window.openLoginModal('signup');
      } else {
        // Fallback to profile page which will handle login redirect
        window.location.href = '/profile';
      }
    }
  });
  
  // Search functionality
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        window.location.href = `/search-results?q=${encodeURIComponent(query)}`;
      }
    }
  });

  // Close menu when login/signup links are clicked
  const loginLink = document.querySelector('.mobile-menu-nav .login-link');
  const signupLink = document.querySelector('.mobile-menu-nav .signup-link');

  if (loginLink) {
    loginLink.addEventListener('click', function() {
      closeMobileMenu();
    });
  }

  if (signupLink) {
    signupLink.addEventListener('click', function() {
      closeMobileMenu();
    });
  }

  // Close menus on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeMobileMenu();
      closeMobileSearch();
    }
  });
}

// Close mobile menu
function closeMobileMenu() {
  const menuOverlay = document.getElementById('mobileMenuOverlay');
  const menuBtn = document.getElementById('mobileMenuBtn');
  
  menuOverlay.classList.remove('show');
  menuBtn.classList.remove('active');
}

// Close mobile search
function closeMobileSearch() {
  const searchOverlay = document.getElementById('mobileSearchOverlay');
  const searchInput = document.getElementById('mobileSearchInput');
  
  searchOverlay.classList.remove('show');
  searchInput.value = '';
}

// Export functions for external use
window.SeliraMobileNav = {
  show: () => document.getElementById('selira-mobile-nav').style.display = 'block',
  hide: () => document.getElementById('selira-mobile-nav').style.display = 'none',
  closeMenu: closeMobileMenu,
  closeSearch: closeMobileSearch
};