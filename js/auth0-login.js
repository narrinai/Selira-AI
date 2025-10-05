// ===== AUTH0 AUTHENTICATION SYSTEM FOR SELIRA AI =====
// Modern login modal for Selira AI platform

class Auth0LoginModal {
  constructor(config) {
    this.config = {
      domain: config.domain || 'YOUR_AUTH0_DOMAIN.auth0.com',
      clientId: config.clientId || 'YOUR_AUTH0_CLIENT_ID',
      redirectUri: config.redirectUri || window.location.origin + '/',
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
        cacheLocation: 'localstorage', // Important: Store auth state in localStorage
        useRefreshTokens: true, // Enable refresh tokens for persistence
        authorizationParams: {
          redirect_uri: this.config.redirectUri,
          audience: this.config.audience,
          scope: 'openid profile email offline_access' // offline_access for refresh tokens
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
      console.log('🔍 Checking authentication state...', {
        currentUrl: window.location.href,
        search: window.location.search,
        pathname: window.location.pathname
      });

      // First check if we have tokens from direct email/password login
      const accessToken = localStorage.getItem('auth0_access_token');
      const idToken = localStorage.getItem('auth0_id_token');
      const tokenExpires = localStorage.getItem('auth0_token_expires');
      const userEmail = localStorage.getItem('user_email');
      const userUid = localStorage.getItem('user_uid');

      if (accessToken && idToken && tokenExpires && Date.now() < parseInt(tokenExpires)) {
        // We have valid tokens from direct login
        console.log('✅ Found valid tokens from direct login');

        // Reconstruct user object from localStorage
        this.user = {
          email: userEmail,
          sub: userUid,
          name: localStorage.getItem('user_name') || userEmail?.split('@')[0]
        };

        console.log('✅ User authenticated from stored tokens:', this.user.email);
        this.updateAuthState(true);
        return;
      }

      // If no direct login tokens, check Auth0 SDK
      const isAuthenticated = await this.auth0Client.isAuthenticated();
      console.log('🔍 Auth0 isAuthenticated result:', isAuthenticated);

      if (isAuthenticated) {
        this.user = await this.auth0Client.getUser();
        console.log('✅ User is authenticated via Auth0 SDK:', this.user);
        this.updateAuthState(true);
      } else {
        // Check for callback after redirect
        const query = window.location.search;
        if (query.includes('code=') && query.includes('state=')) {
          console.log('🔄 Processing Auth0 callback...');
          await this.handleCallback();
        } else {
          console.log('👤 User not authenticated');
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
      
      // Sync user to Airtable (don't block login flow if it fails)
      this.syncUserToAirtable(this.user).catch(error => {
        console.error('⚠️ User sync failed but continuing login:', error);
      });
      
      // Get return URL from localStorage (where user was before login)
      const returnUrl = localStorage.getItem('auth_return_url');

      if (returnUrl) {
        localStorage.removeItem('auth_return_url');
        console.log('✅ Authentication callback handled:', this.user.email);
        console.log('🔄 Redirecting back to:', returnUrl);

        // Clean up the URL by removing auth callback params and redirect
        const cleanUrl = returnUrl.split('?')[0];
        window.history.replaceState({}, document.title, cleanUrl);
        window.location.href = cleanUrl;
      } else {
        // No return URL stored - clean up current URL from auth params and stay here
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        console.log('✅ Authentication callback handled - staying on current page');
      }

    } catch (error) {
      console.error('❌ Callback handling failed:', error);
      // Fallback: clean URL and stay on current page
      const cleanUrl = window.location.pathname || '/';
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }

  async syncUserToAirtable(user) {
    try {
      console.log('🔄 Syncing user to Airtable:', {
        email: user.email,
        auth0_id: user.sub,
        name: user.name || user.nickname || user.email.split('@')[0]
      });
      
      const syncData = {
        auth0_id: user.sub,
        email: user.email,
        name: user.name || user.nickname || user.email.split('@')[0],
        picture: user.picture
      };
      
      console.log('📤 Sending sync data:', syncData);
      
      const response = await fetch('/.netlify/functions/selira-auth0-user-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncData)
      });
      
      console.log('📥 Sync response status:', response.status);
      
      const result = await response.json();
      console.log('📥 Sync response data:', result);
      
      if (!response.ok) {
        throw new Error(`User sync failed: ${response.status} - ${result.error || 'Unknown error'}`);
      }
      
      console.log('✅ User synced to Airtable successfully:', result);
      
    } catch (error) {
      console.error('❌ User sync to Airtable failed:', error);
      console.error('❌ Error details:', error.message);
      // Don't block login flow even if sync fails
    }
  }

  createModal(mode = 'login') {
    console.log('🔧 Creating Auth0 modal with mode:', mode);

    if (document.getElementById('auth0-modal')) {
      document.getElementById('auth0-modal').remove();
    }

    const modal = document.createElement('div');
    modal.id = 'auth0-modal';
    modal.className = 'auth0-modal-overlay';

    const isSignup = mode === 'signup';
    const title = isSignup ? 'Join Selira AI' : 'Welcome Back';
    const subtitle = isSignup ? 'Start chatting with thousands of AI companions' : 'Connect with your AI companions';

    console.log('🔧 Modal configuration:', { mode, isSignup, title });
    
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
                placeholder="Email address"
                required
              >
            </div>

            <div class="auth0-input-group">
              <input
                type="password"
                id="auth0-password"
                class="auth0-input"
                placeholder="Password (min 8 characters)"
                minlength="8"
                required
              >
            </div>

            ${!isSignup ? `
              <div class="auth0-forgot-password">
                <a href="#" class="auth0-forgot-link" onclick="openForgotPasswordModal(event)">Forgot password?</a>
              </div>
            ` : ''}

            <button type="submit" class="auth0-submit-btn">
              <span class="btn-text">${isSignup ? 'Create Account' : 'Sign In'}</span>
              <div class="btn-loader" style="display: none;">
                <div class="spinner"></div>
              </div>
            </button>
          </form>

          <!-- Terms Notice -->
          <div class="auth0-terms">
            By ${isSignup ? 'signing up' : 'continuing'}, you agree to our
            <a href="/terms-and-conditions.html" target="_blank">Terms of Service</a>
            and
            <a href="/privacy-policy.html" target="_blank">Privacy Policy</a>
          </div>

          <!-- Switch Mode Links -->
          <div class="auth0-switch-mode" style="display: block !important; visibility: visible !important;">
            ${isSignup ? `
              Already have an account?
              <a href="#" class="auth0-switch-link" onclick="switchToLogin(event)">Login here</a>
            ` : `
              Don't have an account?
              <a href="#" class="auth0-switch-link" onclick="switchToSignup(event)">Sign up here</a>
            `}
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

    // Email/Password form
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleEmailPasswordSubmit();
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

      // Detect if we're in signup mode based on modal title
      const modalTitle = document.querySelector('.auth0-logo h2')?.textContent;
      const isSignupMode = modalTitle?.includes('Join');

      console.log(`🔍 Modal mode detected: ${isSignupMode ? 'signup' : 'login'}`);

      // Map provider names to Auth0 connection names
      const connectionMap = {
        'google': 'google-oauth2',
        'facebook': 'facebook',
        'apple': 'apple',
        'twitter': 'twitter',
        'linkedin': 'linkedin'
      };

      const authParams = {
        connection: connectionMap[provider]
      };

      // For signup mode, use prompt=consent to force account selection
      // This allows users to choose/create a new account
      if (isSignupMode) {
        authParams.prompt = 'select_account';
      }

      await this.auth0Client.loginWithRedirect({
        authorizationParams: authParams
      });

    } catch (error) {
      console.error(`❌ ${provider} login failed:`, error);
      this.showError(`Failed to login with ${provider}. Please try again.`);
    }
  }

  async handleEmailPasswordSubmit() {
    const email = document.getElementById('auth0-email').value;
    const password = document.getElementById('auth0-password').value;

    // Validate password length
    if (password.length < 8) {
      this.showError('Password must be at least 8 characters long.');
      return;
    }

    // Detect if we're in signup mode
    const modalTitle = document.querySelector('.auth0-logo h2')?.textContent;
    const isSignupMode = modalTitle?.includes('Join');

    this.setLoading(true);

    try {
      console.log(`🔄 ${isSignupMode ? 'Creating account' : 'Logging in'} for:`, email);

      // Call our Netlify function to handle signup/login
      const response = await fetch('/.netlify/functions/auth0-signup-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isSignupMode ? 'signup' : 'login',
          email: email,
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed');
      }

      console.log('✅ Authentication successful:', data.user.email);

      // Store user data
      this.user = data.user;

      // Store tokens in localStorage for persistence
      if (data.tokens) {
        localStorage.setItem('auth0_access_token', data.tokens.access_token);
        localStorage.setItem('auth0_id_token', data.tokens.id_token);
        // Set token expiration to 30 days for better UX (users stay logged in longer)
        const expiresIn = data.tokens.expires_in || 86400; // Default 24h if not provided
        const extendedExpiration = Math.max(expiresIn, 30 * 24 * 60 * 60); // Minimum 30 days
        localStorage.setItem('auth0_token_expires', Date.now() + (extendedExpiration * 1000));
        console.log(`🔐 Token expiration set to ${Math.floor(extendedExpiration / (24*60*60))} days`);
      }

      // Track registration event for Facebook Pixel
      if (isSignupMode) {
        localStorage.setItem('just_registered', 'true');

        // Dispatch custom event for Facebook Pixel tracking
        window.dispatchEvent(new CustomEvent('auth0-registration-complete', {
          detail: { email: data.user.email }
        }));

        console.log('📊 Registration event dispatched for tracking');
      }

      // Update UI
      this.updateAuthState(true);
      this.closeModal();
      this.setLoading(false);

      // Show success message
      this.showSuccess(isSignupMode ? 'Account created successfully! 🎉' : 'Welcome back! 👋');

      // Sync user to Airtable BEFORE reloading (blocking)
      try {
        await this.syncUserToAirtable(this.user);
        console.log('✅ User synced to Airtable - reloading page');
      } catch (error) {
        console.error('⚠️ User sync failed but continuing:', error);
      }

      // Reload page to ensure all auth state is properly set
      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (error) {
      console.error('❌ Email/password authentication failed:', error);
      this.setLoading(false);

      // Show user-friendly error
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('wrong') || errorMsg.includes('invalid') || errorMsg.includes('incorrect')) {
        this.showError('Invalid email or password. Please try again.');
      } else if (errorMsg.includes('already') || errorMsg.includes('exists')) {
        this.showError('This email is already registered. Try logging in instead.');
      } else if (errorMsg.includes('weak') || errorMsg.includes('password')) {
        this.showError('Password must be at least 8 characters with letters and numbers.');
      } else if (errorMsg.includes('environment') || errorMsg.includes('configuration')) {
        this.showError('Service configuration error. Please contact support.');
      } else if (errorMsg.includes('grant') || errorMsg.includes('not enabled')) {
        this.showError('Email/password login is not enabled. Please use Google login or contact support.');
      } else {
        this.showError(error.message || 'Authentication failed. Please try again.');
      }
    }
  }

  showSuccess(message) {
    // Show success notification
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => {
      successDiv.remove();
    }, 3000);
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
      // Clear direct login tokens
      localStorage.removeItem('auth0_access_token');
      localStorage.removeItem('auth0_id_token');
      localStorage.removeItem('auth0_token_expires');

      // Logout from Auth0 SDK (for Google/social logins)
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
    console.log('🔄 Updating auth state:', { isAuthenticated, user: this.user });
    
    // Update nav links - check for different navigation structures
    const navMenu = document.querySelector('.nav-menu') || document.querySelector('.user-actions');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    console.log('🔍 Found navigation elements:', { 
      navMenu: !!navMenu, 
      mobileMenu: !!mobileMenu,
      navMenuClass: navMenu?.className,
      currentPage: window.location.pathname
    });
    
    if (isAuthenticated && this.user) {
      // Update desktop nav
      this.updateDesktopNav(navMenu, true);
      // Update mobile nav
      this.updateMobileNav(mobileMenu, true);
      // Update sidebar nav
      this.updateSidebarNav(true);
    } else {
      // Update desktop nav
      this.updateDesktopNav(navMenu, false);
      // Update mobile nav
      this.updateMobileNav(mobileMenu, false);
      // Update sidebar nav
      this.updateSidebarNav(false);
    }

    // Store auth state
    if (isAuthenticated && this.user) {
      localStorage.setItem('user_email', this.user.email);
      localStorage.setItem('user_uid', this.user.sub);
      localStorage.setItem('user_name', this.user.name || this.user.email.split('@')[0]);
      localStorage.setItem('user_auth_timestamp', Date.now().toString());
      
      // Store for Selira (use auth0_id and sub for compatibility)
      localStorage.setItem('user', JSON.stringify({
        email: this.user.email,
        sub: this.user.sub,
        auth0_id: this.user.sub,
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
    if (!navMenu) {
      console.log('⚠️ No navMenu found to update');
      return;
    }

    // Update CSS custom property for immediate visual state
    document.documentElement.style.setProperty(
      '--auth-state',
      isAuthenticated ? 'authenticated' : 'unauthenticated'
    );
    
    console.log('🔄 Updating desktop nav:', { 
      isAuthenticated, 
      element: navMenu.className,
      innerHTML: navMenu.innerHTML.substring(0, 200) + '...'
    });
    
    // Find all auth buttons
    const allLoginBtns = navMenu.querySelectorAll('.login-btn');
    const allSignupBtns = navMenu.querySelectorAll('.signup-btn');
    const allProfileBtns = navMenu.querySelectorAll('.profile-btn');

    // Filter out mobile-header buttons
    let loginBtn = null;
    let signupBtn = null;
    let profileBtn = null;

    allLoginBtns.forEach(btn => {
      if (!btn.closest('.mobile-header')) {
        loginBtn = btn;
      }
    });

    allSignupBtns.forEach(btn => {
      if (!btn.closest('.mobile-header')) {
        signupBtn = btn;
      }
    });

    allProfileBtns.forEach(btn => {
      if (!btn.closest('.mobile-header')) {
        profileBtn = btn;
      }
    });

    console.log('🔍 Found desktop buttons (excluding mobile-header):', {
      loginBtn: !!loginBtn,
      signupBtn: !!signupBtn,
      profileBtn: !!profileBtn
    });

    if (isAuthenticated) {
      console.log('✅ User authenticated - showing profile button');
      // Update existing login button to profile
      if (loginBtn) {
        loginBtn.href = '/pricing';
        loginBtn.textContent = 'Upgrade';
        loginBtn.className = loginBtn.className.replace('login-btn', 'profile-btn') + ' inverted-btn';
        loginBtn.onclick = null; // Remove modal trigger
        // Transparent button styling with gold border - inherit font-size from nav
        loginBtn.style.background = 'transparent';
        loginBtn.style.color = 'var(--accent, #d4a574)';
        loginBtn.style.border = '2px solid var(--accent, #d4a574)';
        loginBtn.style.borderRadius = '8px';
        loginBtn.style.padding = '10px 24px';
        loginBtn.style.fontSize = ''; // Remove inline font-size to inherit from nav
        loginBtn.style.fontWeight = '600';
        loginBtn.style.textDecoration = 'none';
        loginBtn.style.transition = 'all 0.2s ease';
        console.log('✅ Updated login button to transparent profile button:', loginBtn.textContent);
      }
      
      // Hide/remove signup button
      if (signupBtn) {
        signupBtn.style.display = 'none';
        console.log('✅ Hid signup button');
      }
      
    } else {
      console.log('👤 User not authenticated - showing login/signup buttons');

      // Show login button on all pages (desktop only) - styled as a link
      if (loginBtn) {
        loginBtn.href = '#';
        loginBtn.textContent = 'Login';
        loginBtn.className = loginBtn.className.replace('profile-btn', 'login-btn');
        loginBtn.onclick = (e) => {
          e.preventDefault();
          this.openModal('login');
          return false;
        };
        // Style as a text link matching sidebar links (white)
        loginBtn.style.background = 'transparent';
        loginBtn.style.color = 'rgba(255, 255, 255, 0.8)';
        loginBtn.style.border = 'none';
        loginBtn.style.borderRadius = '';
        loginBtn.style.padding = '8px 16px';
        loginBtn.style.fontSize = '13px';
        loginBtn.style.fontWeight = '600';
        loginBtn.style.textDecoration = 'none';
        loginBtn.style.display = '';
        loginBtn.style.transition = 'all 0.2s ease';
        console.log('✅ Restored login button as text link');
      }

      // Show signup button
      if (signupBtn) {
        signupBtn.style.display = '';
        signupBtn.href = '#';
        signupBtn.textContent = 'Register';
        signupBtn.onclick = (e) => {
          e.preventDefault();
          this.openModal('signup');
          return false;
        };
        console.log('✅ Restored signup button functionality');
      }
    }
  }

  updateMobileNav(mobileMenu, isAuthenticated) {
    // Check for category page specific mobile header
    const mobileHeader = document.querySelector('.mobile-header');
    const loginBtn = mobileHeader?.querySelector('.login-btn, .mobile-auth-btn');

    if (loginBtn) {
      // Handle category page mobile header
      console.log('🔄 Updating category page mobile header:', { isAuthenticated, loginBtn: loginBtn.textContent });

      if (isAuthenticated) {
        loginBtn.textContent = 'Upgrade';
        loginBtn.className = loginBtn.className.replace('login-btn', 'profile-btn') + ' inverted-btn';
        loginBtn.onclick = (e) => {
          e.preventDefault();
          // Always navigate to /pricing page
          window.location.href = '/pricing';
          return false;
        };
        // Apply transparent button styling for mobile too
        loginBtn.style.background = 'transparent';
        loginBtn.style.color = 'var(--accent, #d4a574)';
        loginBtn.style.border = '2px solid var(--accent, #d4a574)';
        console.log('✅ Updated mobile header to show transparent Upgrade button');
      } else {
        loginBtn.textContent = 'Register';
        // Keep mobile-auth-btn class, just remove profile-btn if it exists
        loginBtn.className = loginBtn.className.replace('profile-btn', '').replace('inverted-btn', '').trim();
        // Ensure mobile-auth-btn class is present
        if (!loginBtn.className.includes('mobile-auth-btn')) {
          loginBtn.className += ' mobile-auth-btn';
        }
        loginBtn.onclick = (e) => {
          e.preventDefault();
          this.openModal('signup');
          return false;
        };
        // Reset to original mobile styling
        loginBtn.style.background = 'var(--accent)';
        loginBtn.style.color = 'white';
        loginBtn.style.border = 'none';
        console.log('✅ Updated mobile header to show Register button');
      }
      return;
    }

    // Fallback to original mobile menu handling
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
        profileLink.href = '/profile';
        profileLink.className = 'mobile-profile-link';
        profileLink.textContent = '👤';

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

  updateSidebarNav(isAuthenticated) {
    // Update sidebar Profile link text on mobile when logged in
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Find the Profile nav-item in the sidebar
    const sidebarNavItems = sidebar.querySelectorAll('.nav-item');
    sidebarNavItems.forEach(item => {
      const href = item.getAttribute('href');
      const textSpan = item.querySelector('span:not(.nav-item-icon)');

      // Find the Profile link (href="/profile")
      if (href === '/profile' && textSpan) {
        // On mobile when authenticated, change to "Upgrade"
        // On desktop or when not authenticated, keep as "Profile"
        const isMobile = window.innerWidth <= 768;

        if (isAuthenticated && isMobile) {
          textSpan.textContent = 'Upgrade';
          console.log('✅ Updated sidebar Profile to Upgrade (mobile, authenticated)');
        } else {
          textSpan.textContent = 'Profile';
          console.log('✅ Kept sidebar as Profile (desktop or not authenticated)');
        }
      }
    });
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

  openForgotPasswordModal() {
    this.closeModal();

    const modal = document.createElement('div');
    modal.id = 'auth0-forgot-password-modal';
    modal.className = 'auth0-modal-overlay';

    modal.innerHTML = `
      <div class="auth0-modal-content">
        <button class="auth0-modal-close" aria-label="Close">&times;</button>

        <div class="auth0-modal-header">
          <div class="auth0-logo">
            <span class="logo-icon">🔑</span>
            <h2>Reset Password</h2>
          </div>
          <p class="auth0-subtitle">Enter your email to receive a password reset link</p>
        </div>

        <div class="auth0-modal-body">
          <form class="auth0-form" id="auth0-forgot-password-form">
            <div class="auth0-input-group">
              <input
                type="email"
                id="auth0-forgot-email"
                class="auth0-input"
                placeholder="Email address"
                required
              >
            </div>

            <button type="submit" class="auth0-submit-btn">
              <span class="btn-text">Send Reset Link</span>
              <div class="btn-loader" style="display: none;">
                <div class="spinner"></div>
              </div>
            </button>
          </form>

          <div class="auth0-switch-mode" style="display: block !important; visibility: visible !important;">
            Remember your password?
            <a href="#" class="auth0-switch-link" onclick="switchToLogin(event)">Login here</a>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.auth0-modal-close');
    const form = modal.querySelector('#auth0-forgot-password-form');

    closeBtn.addEventListener('click', () => {
      modal.remove();
      document.body.style.overflow = '';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        document.body.style.overflow = '';
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleForgotPassword();
    });

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      document.getElementById('auth0-forgot-email')?.focus();
    }, 100);
  }

  async handleForgotPassword() {
    const email = document.getElementById('auth0-forgot-email').value;
    const submitBtn = document.querySelector('#auth0-forgot-password-form .auth0-submit-btn');
    const btnText = submitBtn?.querySelector('.btn-text');
    const btnLoader = submitBtn?.querySelector('.btn-loader');

    if (btnText && btnLoader && submitBtn) {
      btnText.style.display = 'none';
      btnLoader.style.display = 'flex';
      submitBtn.disabled = true;
    }

    try {
      console.log('🔄 Requesting password reset for:', email);

      const response = await fetch('/.netlify/functions/auth0-forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send reset link');
      }

      console.log('✅ Password reset link sent successfully');

      // Show success message
      this.showForgotPasswordSuccess('Check your email for the password reset link! 📧');

      // Don't auto-close the modal - let user close it manually

    } catch (error) {
      console.error('❌ Forgot password failed:', error);

      if (btnText && btnLoader && submitBtn) {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        submitBtn.disabled = false;
      }

      this.showForgotPasswordError(error.message || 'Failed to send reset link. Please try again.');
    }
  }

  showForgotPasswordSuccess(message) {
    const form = document.querySelector('#auth0-forgot-password-form');
    const existingMsg = form?.querySelector('.auth0-success, .auth0-error');
    if (existingMsg) existingMsg.remove();

    const successDiv = document.createElement('div');
    successDiv.className = 'auth0-success';
    successDiv.textContent = message;

    form?.insertBefore(successDiv, form.firstChild);
  }

  showForgotPasswordError(message) {
    const form = document.querySelector('#auth0-forgot-password-form');
    const existingMsg = form?.querySelector('.auth0-success, .auth0-error');
    if (existingMsg) existingMsg.remove();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'auth0-error';
    errorDiv.textContent = message;

    form?.insertBefore(errorDiv, form.firstChild);

    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
}

// ===== AUTH0 MODAL STYLES (SELIRA THEME) =====
const AUTH0_STYLES = `
<style>
/* Transparent Profile Button Styling */
.profile-btn.inverted-btn,
.inverted-btn {
  background: transparent !important;
  color: var(--accent, #d4a574) !important;
  border: 2px solid var(--accent, #d4a574) !important;
  border-radius: 8px !important;
  padding: 10px 24px !important;
  font-weight: 600 !important;
  text-decoration: none !important;
  transition: all 0.2s ease !important;
  display: inline-block !important;
}

.profile-btn.inverted-btn:hover,
.inverted-btn:hover {
  background: var(--accent, #d4a574) !important;
  color: #ffffff !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(212, 165, 116, 0.3) !important;
}

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
  padding: 24px;
  width: 90%;
  max-width: 380px;
  max-height: 95vh;
  overflow-y: auto;
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
  margin-bottom: 20px;
}

.auth0-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.logo-icon {
  font-size: 36px;
  color: #d4a574;
}

.auth0-logo h2 {
  color: #ffffff;
  font-size: 20px;
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
  gap: 6px;
  margin-bottom: 12px;
}

.auth0-social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 16px;
  border: 1px solid #333333;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  font-size: 13px;
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

.auth0-email-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 16px;
  border: 1px solid #333333;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  width: 100%;
  margin-bottom: 12px;
}

.auth0-email-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #d4a574;
  transform: translateY(-2px);
}

.auth0-divider {
  display: flex;
  align-items: center;
  margin: 12px 0;
  color: #64748b;
  font-size: 13px;
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
  gap: 10px;
}

.auth0-input-group {
  position: relative;
}

.auth0-input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #333333;
  border-radius: 10px;
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
  border-radius: 10px;
  padding: 12px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
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
  font-size: 11px;
  color: #b3b3b3;
  text-align: center;
  line-height: 1.4;
  margin-top: 8px;
}

.auth0-terms a {
  color: #d4a574;
  text-decoration: none;
}

.auth0-terms a:hover {
  text-decoration: underline;
}

.auth0-switch-mode {
  font-size: 13px;
  color: #b3b3b3;
  text-align: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #333333;
  display: block !important;
  visibility: visible !important;
}

.auth0-switch-link {
  color: #d4a574;
  text-decoration: none;
  font-weight: 600;
  margin-left: 4px;
}

.auth0-switch-link:hover {
  text-decoration: underline;
  color: #c19456;
}

.auth0-forgot-password {
  text-align: right;
  margin-top: -2px;
  margin-bottom: 8px;
}

.auth0-forgot-link {
  color: #d4a574;
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
}

.auth0-forgot-link:hover {
  text-decoration: underline;
  color: #c19456;
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

.auth0-success {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 8px;
  padding: 12px;
  color: #6ee7b7;
  font-size: 14px;
  text-align: center;
  margin-bottom: 16px;
}

/* Mobile responsive */
@media (max-width: 480px) {
  .auth0-modal-content {
    padding: 20px;
    margin: 16px;
    width: calc(100% - 32px);
    max-height: 95vh;
  }
  
  .auth0-logo h2 {
    font-size: 18px;
  }
  
  .logo-icon {
    font-size: 32px;
  }
  
  .auth0-social-btn {
    padding: 10px 14px;
    font-size: 12px;
    gap: 8px;
  }
  
  .social-icon {
    width: 16px;
    height: 16px;
  }
  
  .auth0-input {
    padding: 10px 12px;
    font-size: 13px;
  }
  
  .auth0-submit-btn {
    padding: 10px;
    font-size: 13px;
    min-height: 40px;
  }
}

@media (max-height: 700px) {
  .auth0-modal-content {
    padding: 16px;
    max-height: 95vh;
  }
  
  .auth0-modal-header {
    margin-bottom: 16px;
  }
  
  .auth0-social-buttons {
    gap: 6px;
    margin-bottom: 12px;
  }
  
  .auth0-divider {
    margin: 12px 0;
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
      redirectUri: window.location.origin + '/'
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
  console.log('🌍 openLoginModal called with mode:', mode);
  if (seliraAuth) {
    seliraAuth.openModal(mode);
  } else {
    console.error('❌ seliraAuth not initialized yet');
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

// Switch between login and signup modes
window.switchToLogin = function(event) {
  event.preventDefault();
  if (seliraAuth) {
    seliraAuth.closeModal();
    setTimeout(() => {
      seliraAuth.openModal('login');
    }, 100);
  }
};

window.switchToSignup = function(event) {
  event.preventDefault();
  if (seliraAuth) {
    seliraAuth.closeModal();
    setTimeout(() => {
      seliraAuth.openModal('signup');
    }, 100);
  }
};

// Open forgot password modal
window.openForgotPasswordModal = function(event) {
  event.preventDefault();
  if (seliraAuth) {
    seliraAuth.openForgotPasswordModal();
  }
};