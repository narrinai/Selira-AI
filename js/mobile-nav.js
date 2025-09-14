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

  if (!profileBtn || !profileText) return;

  let isAuthenticated = false;
  if (authDetail) {
    isAuthenticated = authDetail.isAuthenticated;
  } else if (window.isUserAuthenticated) {
    isAuthenticated = window.isUserAuthenticated();
  }

  // Update profile button text and style
  if (isAuthenticated) {
    profileText.textContent = 'Profile';
    profileBtn.style.background = 'var(--accent, #d4a574)';
    profileBtn.style.color = 'white';
    profileBtn.style.borderRadius = '25px';
    profileBtn.style.padding = '10px 20px';
    profileBtn.style.fontSize = '14px';
    profileBtn.style.fontWeight = '600';
    profileBtn.style.width = 'auto';
    profileBtn.style.height = 'auto';
    // Hide login/signup links in menu
    loginLinks.forEach(link => link.style.display = 'none');
  } else {
    profileText.textContent = 'Login';
    profileBtn.style.background = 'var(--accent, #d4a574)';
    profileBtn.style.color = 'white';
    profileBtn.style.borderRadius = '25px';
    profileBtn.style.padding = '10px 20px';
    profileBtn.style.fontSize = '14px';
    profileBtn.style.fontWeight = '600';
    profileBtn.style.width = 'auto';
    profileBtn.style.height = 'auto';
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
            <span class="menu-icon">🔍</span>
            <span>Discover</span>
          </a>
          <a href="/my-companions" class="mobile-menu-link">
            <span class="menu-icon">💬</span>
            <span>My Companions</span>
          </a>
          <a href="/create" class="mobile-menu-link">
            <span class="menu-icon">➕</span>
            <span>Create</span>
          </a>
          <a href="/memory-import" class="mobile-menu-link">
            <span class="menu-icon">📋</span>
            <span>Memory Import</span>
          </a>
          <div class="mobile-menu-divider"></div>
          <a href="/profile" class="mobile-menu-link">
            <span class="menu-icon">👤</span>
            <span>Profile</span>
          </a>
          <a href="/pricing" class="mobile-menu-link">
            <span class="menu-icon">💎</span>
            <span>Pricing</span>
          </a>
          <div class="mobile-menu-divider"></div>
          <a href="#" class="mobile-menu-link login-link" onclick="openLoginModal('login'); return false;">
            <span class="menu-icon">🔑</span>
            <span>Sign In</span>
          </a>
          <a href="#" class="mobile-menu-link signup-link" onclick="openLoginModal('signup'); return false;">
            <span class="menu-icon">✨</span>
            <span>Register</span>
          </a>
        </nav>
      </div>
    </div>
    
    <!-- Mobile Search Overlay -->
    <div class="mobile-search-overlay" id="mobileSearchOverlay">
      <div class="mobile-search-content">
        <div class="mobile-search-header">
          <input type="text" class="mobile-search-input" placeholder="Search companions..." id="mobileSearchInput">
          <button class="mobile-search-close" id="mobileSearchClose">✕</button>
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
      z-index: 1000;
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
      color: var(--accent, #d4a574);
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
      z-index: 1001;
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
      padding: 20px;
      border-bottom: 1px solid var(--border, #333333);
    }
    
    .mobile-menu-logo {
      font-family: 'Playfair Display', serif;
      font-size: 24px;
      font-weight: 700;
      color: var(--accent, #d4a574);
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
      padding: 20px 0;
    }
    
    .mobile-menu-link {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      color: var(--text-primary, #ffffff);
      text-decoration: none;
      transition: background 0.2s ease;
      font-size: 16px;
    }
    
    .mobile-menu-link:hover {
      background: var(--bg-tertiary, #2a2a2a);
    }
    
    .menu-icon {
      font-size: 20px;
      width: 24px;
      text-align: center;
    }
    
    .mobile-menu-divider {
      height: 1px;
      background: var(--border, #333333);
      margin: 16px 20px;
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
      z-index: 1001;
    }
    
    .mobile-search-overlay.show {
      display: block;
    }
    
    .mobile-search-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid var(--border, #333333);
    }
    
    .mobile-search-input {
      flex: 1;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border, #333333);
      border-radius: 12px;
      padding: 12px 16px;
      color: var(--text-primary, #ffffff);
      font-size: 16px;
      outline: none;
    }
    
    .mobile-search-input:focus {
      border-color: var(--accent, #d4a574);
    }
    
    .mobile-search-input::placeholder {
      color: var(--text-muted, #888888);
    }
    
    .mobile-search-close {
      background: none;
      border: none;
      color: var(--text-primary, #ffffff);
      font-size: 20px;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: background 0.2s ease;
    }
    
    .mobile-search-close:hover {
      background: var(--bg-tertiary, #2a2a2a);
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
      // User is authenticated, go to profile
      window.location.href = '/profile';
    } else {
      // User not authenticated, open login modal
      if (window.openLoginModal) {
        window.openLoginModal('login');
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