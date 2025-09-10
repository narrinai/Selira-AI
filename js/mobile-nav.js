/**
 * Universal Mobile Navigation System for Selira AI
 * Provides consistent mobile navigation across all pages
 */

// Initialize mobile navigation when DOM loads
document.addEventListener('DOMContentLoaded', function() {
  createMobileNav();
  attachMobileNavEvents();
});

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
        <a href="/category" class="mobile-logo">Selira</a>
      </div>
      
      <div class="mobile-nav-right">
        <button class="mobile-nav-btn mobile-search-btn" id="mobileSearchBtn">
          <span class="search-icon">🔍</span>
        </button>
        <button class="mobile-nav-btn mobile-profile-btn" id="mobileProfileBtn">
          <span class="profile-icon">👤</span>
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
      
      /* Add padding to body to account for mobile nav */
      body {
        padding-top: 60px;
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
      }
      
      .app-container {
        flex-direction: column;
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
  
  // Profile button
  profileBtn.addEventListener('click', function() {
    window.location.href = '/profile';
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