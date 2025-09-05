// ===== AUTH0 AUTHENTICATION SYSTEM FOR SELIRA AI =====
// Modern login modal for Selira AI platform

class Auth0LoginModal {
  constructor(config) {
    this.config = {
      domain: config.domain || 'YOUR_AUTH0_DOMAIN.auth0.com',
      clientId: config.clientId || 'YOUR_AUTH0_CLIENT_ID',
      redirectUri: config.redirectUri || window.location.origin + '/profile',
      ...config
    };
    
    this.isOpen = false;
    this.auth0Client = null;
    this.user = null;
    
    this.init();
  }

  async init() {
    try {
      // Load Auth0 SDK
      await this.loadAuth0SDK();
      
      // Initialize Auth0 client
      this.auth0Client = new auth0.Auth0Client({
        domain: this.config.domain,
        clientId: this.config.clientId,
        authorizationParams: {
          redirect_uri: this.config.redirectUri,
          audience: this.config.audience,
          scope: 'openid profile email'
        }
      });

      // Check if user is already authenticated
      await this.checkAuth();
      
      console.log('✅ Auth0 initialized successfully for Selira AI');
    } catch (error) {
      console.error('❌ Auth0 initialization failed:', error);
    }
  }

  async loadAuth0SDK() {
    return new Promise((resolve, reject) => {
      if (window.auth0) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.auth0.com/js/auth0-spa-js/2.0/auth0-spa-js.production.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async checkAuth() {
    try {
      const isAuthenticated = await this.auth0Client.isAuthenticated();
      
      if (isAuthenticated) {
        this.user = await this.auth0Client.getUser();
        this.updateAuthState(true);
        console.log('✅ User is authenticated:', this.user.email);
      } else {
        // Check for callback after redirect
        const query = window.location.search;
        if (query.includes('code=') && query.includes('state=')) {
          await this.handleCallback();
        } else {
          this.updateAuthState(false);
        }
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      this.updateAuthState(false);
    }
  }

  async handleCallback() {
    try {
      await this.auth0Client.handleRedirectCallback();
      this.user = await this.auth0Client.getUser();
      this.updateAuthState(true);
      
      // Sync user to Airtable
      await this.syncUserToAirtable(this.user);
      
      // Get return URL or default to category page
      const returnUrl = localStorage.getItem('auth_return_url') || '/category';
      localStorage.removeItem('auth_return_url');
      
      console.log('✅ Authentication callback handled:', this.user.email);
      console.log('🔄 Redirecting to:', returnUrl);
      
      // Redirect to original page or category
      window.location.href = returnUrl;
      
    } catch (error) {
      console.error('❌ Callback handling failed:', error);
      // Fallback redirect on error
      window.location.href = '/category';
    }
  }

  async syncUserToAirtable(user) {
    try {
      console.log('🔄 Syncing user to Airtable:', user.email);
      
      const response = await fetch('/.netlify/functions/auth0-user-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth0_id: user.sub,
          email: user.email,
          name: user.name || user.nickname || user.email.split('@')[0],
          picture: user.picture
        })
      });
      
      if (!response.ok) {
        throw new Error(`User sync failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ User synced to Airtable successfully:', result);
      
    } catch (error) {
      console.error('❌ User sync to Airtable failed:', error);
      // Don't block login flow even if sync fails
    }
  }

  createModal(mode = 'login') {
    if (document.getElementById('auth0-modal')) {
      document.getElementById('auth0-modal').remove();
    }

    const modal = document.createElement('div');
    modal.id = 'auth0-modal';
    modal.className = 'auth0-modal-overlay';
    
    const isSignup = mode === 'signup';
    const title = isSignup ? 'Join Selira AI' : 'Welcome Back';
    const subtitle = isSignup ? 'Start chatting with thousands of AI companions' : 'Connect with your AI companions';
    
    modal.innerHTML = `
      <div class="auth0-modal-content">
        <button class="auth0-modal-close" aria-label="Close">&times;</button>
        
        <div class="auth0-modal-header">
          <div class="auth0-logo">
            <span class="logo-icon">🌟</span>
            <h2>${title}</h2>
          </div>
          <p class="auth0-subtitle">${subtitle}</p>
        </div>

        <div class="auth0-modal-body">
          <!-- Social Login Options -->
          <div class="auth0-social-buttons">
            <button class="auth0-social-btn auth0-google-btn" data-provider="google">
              <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" class="social-icon">
              <span>Continue with Google</span>
            </button>
            

            <button class="auth0-social-btn auth0-facebook-btn" data-provider="facebook">
              <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Continue with Facebook</span>
            </button>
            
            <button class="auth0-social-btn auth0-apple-btn" data-provider="apple">
              <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.51-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span>Continue with Apple</span>
            </button>
            
            <button class="auth0-social-btn auth0-twitter-btn" data-provider="twitter">
              <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span>Continue with X (Twitter)</span>
            </button>
            
            <button class="auth0-social-btn auth0-linkedin-btn" data-provider="linkedin">
              <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span>Continue with LinkedIn</span>
            </button>
          </div>

          <!-- Divider -->
          <div class="auth0-divider">
            <span>or</span>
          </div>

          <!-- Email/Password Form -->
          <form class="auth0-form" id="auth0-form">
            <div class="auth0-input-group">
              <input 
                type="email" 
                id="auth0-email" 
                class="auth0-input" 
                placeholder="Enter your email"
                required
              >
            </div>
            
            <div class="auth0-input-group auth0-password-group" style="display: none;">
              <input 
                type="password" 
                id="auth0-password" 
                class="auth0-input" 
                placeholder="Enter your password"
              >
            </div>

            <button type="submit" class="auth0-submit-btn">
              <span class="btn-text">Continue</span>
              <div class="btn-loader" style="display: none;">
                <div class="spinner"></div>
              </div>
            </button>
          </form>

          <!-- Terms Notice -->
          <div class="auth0-terms">
            By continuing, you agree to our 
            <a href="/terms-and-conditions.html" target="_blank">Terms of Service</a> 
            and 
            <a href="/privacy-policy.html" target="_blank">Privacy Policy</a>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.attachModalEvents();
  }

  attachModalEvents() {
    const modal = document.getElementById('auth0-modal');
    const closeBtn = modal.querySelector('.auth0-modal-close');
    const form = modal.querySelector('#auth0-form');
    const socialBtns = modal.querySelectorAll('.auth0-social-btn');

    // Close modal events
    closeBtn.addEventListener('click', () => this.closeModal());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal();
    });

    // Social login buttons
    socialBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const provider = btn.dataset.provider;
        await this.loginWithSocial(provider);
      });
    });

    // Email form
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleEmailSubmit();
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeModal();
      }
    });
  }

  async loginWithSocial(provider) {
    try {
      console.log(`🔄 Logging in with ${provider}...`);
      
      // Store current page URL for redirect after login
      const returnUrl = window.location.pathname + window.location.search;
      localStorage.setItem('auth_return_url', returnUrl);
      
      // Map provider names to Auth0 connection names
      const connectionMap = {
        'google': 'google-oauth2',
        'facebook': 'facebook',
        'apple': 'apple',
        'twitter': 'twitter',
        'linkedin': 'linkedin'
      };

      await this.auth0Client.loginWithRedirect({
        authorizationParams: {
          connection: connectionMap[provider]
        }
      });
      
    } catch (error) {
      console.error(`❌ ${provider} login failed:`, error);
      this.showError(`Failed to login with ${provider}. Please try again.`);
    }
  }

  async handleEmailSubmit() {
    const email = document.getElementById('auth0-email').value;
    const passwordGroup = document.querySelector('.auth0-password-group');
    const submitBtn = document.querySelector('.auth0-submit-btn');
    
    this.setLoading(true);

    try {
      if (passwordGroup.style.display === 'none') {
        // First step - show password field
        passwordGroup.style.display = 'block';
        document.getElementById('auth0-password').focus();
        submitBtn.querySelector('.btn-text').textContent = 'Sign In';
        this.setLoading(false);
      } else {
        // Store current page URL for redirect after login
        const returnUrl = window.location.pathname + window.location.search;
        localStorage.setItem('auth_return_url', returnUrl);
        
        // Second step - authenticate
        await this.auth0Client.loginWithRedirect({
          authorizationParams: {
            login_hint: email
          }
        });
      }
    } catch (error) {
      console.error('❌ Email login failed:', error);
      this.showError('Login failed. Please check your credentials.');
      this.setLoading(false);
    }
  }

  setLoading(loading) {
    const submitBtn = document.querySelector('.auth0-submit-btn');
    const btnText = submitBtn?.querySelector('.btn-text');
    const btnLoader = submitBtn?.querySelector('.btn-loader');
    
    if (loading) {
      btnText.style.display = 'none';
      btnLoader.style.display = 'flex';
      submitBtn.disabled = true;
    } else {
      btnText.style.display = 'block';
      btnLoader.style.display = 'none';
      submitBtn.disabled = false;
    }
  }

  showError(message) {
    // Remove existing error
    const existingError = document.querySelector('.auth0-error');
    if (existingError) {
      existingError.remove();
    }

    // Create new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'auth0-error';
    errorDiv.textContent = message;
    
    const form = document.querySelector('.auth0-form');
    form?.insertBefore(errorDiv, form.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  openModal(mode = 'login') {
    this.createModal(mode);
    const modal = document.getElementById('auth0-modal');
    
    this.isOpen = true;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Focus first input
    setTimeout(() => {
      document.getElementById('auth0-email')?.focus();
    }, 100);
  }

  closeModal() {
    const modal = document.getElementById('auth0-modal');
    if (modal) {
      this.isOpen = false;
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  async logout() {
    try {
      await this.auth0Client.logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      });
      
      this.user = null;
      this.updateAuthState(false);
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Logout failed:', error);
    }
  }

  updateAuthState(isAuthenticated) {
    // Update nav links
    const navMenu = document.querySelector('.nav-menu');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (isAuthenticated && this.user) {
      // Update desktop nav
      this.updateDesktopNav(navMenu, true);
      // Update mobile nav
      this.updateMobileNav(mobileMenu, true);
    } else {
      // Update desktop nav
      this.updateDesktopNav(navMenu, false);
      // Update mobile nav
      this.updateMobileNav(mobileMenu, false);
    }

    // Store auth state
    if (isAuthenticated && this.user) {
      localStorage.setItem('user_email', this.user.email);
      localStorage.setItem('user_uid', this.user.sub);
      localStorage.setItem('user_name', this.user.name || this.user.email.split('@')[0]);
      localStorage.setItem('user_auth_timestamp', Date.now().toString());
      
      // Store for compatibility
      localStorage.setItem('user', JSON.stringify({
        email: this.user.email,
        uid: this.user.sub,
        name: this.user.name
      }));
    } else {
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_uid');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_auth_timestamp');
      localStorage.removeItem('user');
    }

    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('auth-state-changed', {
      detail: { isAuthenticated, user: this.user }
    }));
  }

  updateDesktopNav(navMenu, isAuthenticated) {
    if (!navMenu) return;
    
    // Find existing auth buttons or create them
    let loginBtn = navMenu.querySelector('.login-btn');
    let signupBtn = navMenu.querySelector('.signup-btn');
    let profileBtn = navMenu.querySelector('.profile-btn');
    
    if (isAuthenticated) {
      // Remove login/signup, add profile
      loginBtn?.remove();
      signupBtn?.remove();
      
      if (!profileBtn) {
        profileBtn = document.createElement('a');
        profileBtn.href = '/profile.html';
        profileBtn.className = 'nav-link profile-btn';
        profileBtn.textContent = this.user.name || 'Profile';
        
        // Insert before the CTA button
        const ctaBtn = navMenu.querySelector('.cta-btn');
        navMenu.insertBefore(profileBtn, ctaBtn);
      }
      
    } else {
      // Remove profile, add login/signup
      profileBtn?.remove();
      
      if (!loginBtn) {
        loginBtn = document.createElement('a');
        loginBtn.href = '#';
        loginBtn.className = 'nav-link login-btn';
        loginBtn.textContent = 'Login';
        loginBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.openModal('login');
        });
        
        // Insert before CTA button
        const ctaBtn = navMenu.querySelector('.cta-btn');
        navMenu.insertBefore(loginBtn, ctaBtn);
      }
      
      if (!signupBtn) {
        signupBtn = document.createElement('a');
        signupBtn.href = '#';
        signupBtn.className = 'nav-link signup-btn';
        signupBtn.textContent = 'Sign Up';
        signupBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.openModal('signup');
        });
        
        // Insert before CTA button
        const ctaBtn = navMenu.querySelector('.cta-btn');
        navMenu.insertBefore(signupBtn, ctaBtn);
      }
    }
  }

  updateMobileNav(mobileMenu, isAuthenticated) {
    if (!mobileMenu) return;
    
    // Find existing auth links
    let loginLink = mobileMenu.querySelector('.mobile-login-link');
    let signupLink = mobileMenu.querySelector('.mobile-signup-link');
    let profileLink = mobileMenu.querySelector('.mobile-profile-link');
    
    if (isAuthenticated) {
      // Remove login/signup, add profile
      loginLink?.remove();
      signupLink?.remove();
      
      if (!profileLink) {
        profileLink = document.createElement('a');
        profileLink.href = '/profile.html';
        profileLink.className = 'mobile-profile-link';
        profileLink.textContent = `👤 ${this.user.name || 'Profile'}`;
        
        // Insert before CTA
        const ctaBtn = mobileMenu.querySelector('.cta-btn');
        mobileMenu.insertBefore(profileLink, ctaBtn);
      }
      
    } else {
      // Remove profile, add login/signup
      profileLink?.remove();
      
      if (!loginLink) {
        loginLink = document.createElement('a');
        loginLink.href = '#';
        loginLink.className = 'mobile-login-link';
        loginLink.textContent = '🔑 Login';
        loginLink.addEventListener('click', (e) => {
          e.preventDefault();
          this.openModal('login');
        });
        
        const ctaBtn = mobileMenu.querySelector('.cta-btn');
        mobileMenu.insertBefore(loginLink, ctaBtn);
      }
      
      if (!signupLink) {
        signupLink = document.createElement('a');
        signupLink.href = '#';
        signupLink.className = 'mobile-signup-link';
        signupLink.textContent = '✨ Sign Up';
        signupLink.addEventListener('click', (e) => {
          e.preventDefault();
          this.openModal('signup');
        });
        
        const ctaBtn = mobileMenu.querySelector('.cta-btn');
        mobileMenu.insertBefore(signupLink, ctaBtn);
      }
    }
  }

  // Public methods
  isAuthenticated() {
    return !!this.user;
  }

  getUser() {
    return this.user;
  }

  getUserToken() {
    return this.auth0Client?.getTokenSilently();
  }
}

// ===== AUTH0 MODAL STYLES (SELIRA THEME) =====
const AUTH0_STYLES = `
<style>
.auth0-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.auth0-modal-overlay[style*="flex"] {
  opacity: 1;
}

.auth0-modal-content {
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  border: 1px solid #d4a574;
  border-radius: 20px;
  padding: 40px;
  width: 90%;
  max-width: 400px;
  position: relative;
  transform: scale(0.9) translateY(20px);
  transition: all 0.3s ease;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.auth0-modal-overlay[style*="flex"] .auth0-modal-content {
  transform: scale(1) translateY(0);
}

.auth0-modal-close {
  position: absolute;
  top: 20px;
  right: 20px;
  background: transparent;
  border: none;
  font-size: 24px;
  color: #b3b3b3;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.auth0-modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.auth0-modal-header {
  text-align: center;
  margin-bottom: 32px;
}

.auth0-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.logo-icon {
  font-size: 48px;
  color: #d4a574;
}

.auth0-logo h2 {
  color: #ffffff;
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  font-family: 'Playfair Display', serif;
}

.auth0-subtitle {
  color: #b3b3b3;
  font-size: 14px;
  margin: 0;
  font-weight: 500;
}

.auth0-social-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.auth0-social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px 20px;
  border: 1px solid #333333;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.auth0-social-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #d4a574;
  transform: translateY(-2px);
}

.social-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.auth0-google-btn:hover {
  background: rgba(66, 133, 244, 0.1);
  border-color: #4285f4;
}

.auth0-facebook-btn:hover {
  background: rgba(24, 119, 242, 0.1);
  border-color: #1877f2;
}

.auth0-apple-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #ffffff;
}

.auth0-twitter-btn:hover {
  background: rgba(29, 161, 242, 0.1);
  border-color: #1da1f2;
}

.auth0-linkedin-btn:hover {
  background: rgba(10, 102, 194, 0.1);
  border-color: #0a66c2;
}

.auth0-divider {
  display: flex;
  align-items: center;
  margin: 24px 0;
  color: #64748b;
  font-size: 14px;
}

.auth0-divider::before,
.auth0-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #333333;
}

.auth0-divider span {
  padding: 0 16px;
}

.auth0-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth0-input-group {
  position: relative;
}

.auth0-input {
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #333333;
  border-radius: 12px;
  color: #ffffff;
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.auth0-input:focus {
  outline: none;
  border-color: #d4a574;
  box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.1);
}

.auth0-input::placeholder {
  color: #b3b3b3;
}

.auth0-submit-btn {
  background: #d4a574;
  border: none;
  border-radius: 12px;
  padding: 14px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
}

.auth0-submit-btn:hover:not(:disabled) {
  background: #c19456;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(212, 165, 116, 0.3);
}

.auth0-submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-loader {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.auth0-terms {
  font-size: 12px;
  color: #b3b3b3;
  text-align: center;
  line-height: 1.5;
  margin-top: 20px;
}

.auth0-terms a {
  color: #d4a574;
  text-decoration: none;
}

.auth0-terms a:hover {
  text-decoration: underline;
}

.auth0-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 12px;
  color: #fca5a5;
  font-size: 14px;
  text-align: center;
  margin-bottom: 16px;
}

/* Mobile responsive */
@media (max-width: 480px) {
  .auth0-modal-content {
    padding: 24px;
    margin: 20px;
    width: calc(100% - 40px);
  }
  
  .auth0-social-btn {
    padding: 12px 16px;
    font-size: 13px;
  }
  
  .social-icon {
    width: 18px;
    height: 18px;
  }
}
</style>
`;

// ===== INITIALIZE AUTH0 =====
let seliraAuth = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
  // Inject Auth0 styles
  document.head.insertAdjacentHTML('beforeend', AUTH0_STYLES);
  
  try {
    // Load Auth0 configuration from Netlify Function
    console.log('🔄 Loading Auth0 configuration for Selira AI...');
    const response = await fetch('/.netlify/functions/auth-config');
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to load Auth0 config');
    }
    
    console.log('✅ Auth0 config loaded for Selira:', {
      domain: data.config.domain,
      clientId: data.config.clientId.substring(0, 8) + '...'
    });
    
    // Initialize Auth0 with real credentials
    seliraAuth = new Auth0LoginModal({
      domain: data.config.domain,
      clientId: data.config.clientId,
      redirectUri: window.location.origin + '/profile.html'
    });
    
    console.log('🔐 Selira Auth0 system initialized');
    
  } catch (error) {
    console.error('❌ Failed to initialize Selira Auth0:', error);
    
    // Fallback to show error to user
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      if (link.textContent.includes('Login') || link.textContent.includes('Sign Up')) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          alert('Authentication system is currently unavailable. Please try again later.');
        });
      }
    });
  }
});

// ===== GLOBAL AUTH FUNCTIONS FOR SELIRA =====
window.openLoginModal = function(mode = 'login') {
  if (seliraAuth) {
    seliraAuth.openModal(mode);
  }
};

window.openSignupModal = function() {
  if (seliraAuth) {
    seliraAuth.openModal('signup');
  }
};

window.logout = function() {
  if (seliraAuth) {
    seliraAuth.logout();
  }
};

window.getCurrentUser = function() {
  return seliraAuth?.getUser() || null;
};

window.isUserAuthenticated = function() {
  return seliraAuth?.isAuthenticated() || false;
};