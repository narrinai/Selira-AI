// ===== SUPABASE AUTHENTICATION SYSTEM FOR SELIRA AI =====
// Modern login modal for Selira AI platform using Supabase

class SupabaseAuthModal {
  constructor() {
    this.isOpen = false;
    this.supabase = null;
    this.user = null;

    this.init();
  }

  async init() {
    try {
      console.log('🔄 Initializing Supabase auth for Selira AI...');

      // Wait for Supabase SDK to load
      if (typeof supabase === 'undefined') {
        console.error('❌ Supabase SDK not loaded');
        return;
      }

      // Get config
      if (!window.SUPABASE_CONFIG) {
        throw new Error('Supabase config not loaded');
      }

      const { url, anonKey } = window.SUPABASE_CONFIG;

      // Initialize Supabase client
      this.supabase = supabase.createClient(url, anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionFromUrl: true
        }
      });

      // Check if user is already authenticated
      await this.checkAuth();

      console.log('✅ Supabase initialized successfully for Selira AI');
    } catch (error) {
      console.error('❌ Supabase initialization failed:', error);
    }
  }

  async checkAuth() {
    try {
      console.log('🔍 Checking authentication state...');

      const { data: { session } } = await this.supabase.auth.getSession();

      if (session) {
        this.user = session.user;
        console.log('✅ User authenticated:', this.user.email);

        // Try to restore Airtable record ID from localStorage first
        const cachedAirtableId = localStorage.getItem('airtable_record_id');
        if (cachedAirtableId) {
          this.user.airtable_record_id = cachedAirtableId;
          console.log('🔄 Restored Airtable record ID from cache:', cachedAirtableId);
        }

        // Sync user to Airtable (will update the cached ID if needed)
        await this.syncUserToAirtable(this.user);

        this.updateAuthState(true);
      } else {
        console.log('👤 User not authenticated');
        this.updateAuthState(false);
      }

      // Listen for auth state changes
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event);

        // Only sync on actual sign-in events, not on initial session or token refresh
        if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
          this.user = session.user;
          await this.syncUserToAirtable(this.user);
          this.updateAuthState(true);
        } else if (session) {
          // For other events with session (INITIAL_SESSION, TOKEN_REFRESHED), just update state
          this.user = session.user;
          // Restore Airtable record ID from localStorage if available
          const airtableRecordId = localStorage.getItem('airtable_record_id');
          if (airtableRecordId) {
            this.user.airtable_record_id = airtableRecordId;
            console.log('🔄 Restored Airtable record ID from localStorage:', airtableRecordId);
          }
          this.updateAuthState(true);
        } else {
          this.user = null;
          this.updateAuthState(false);
        }
      });

    } catch (error) {
      console.error('❌ Auth check failed:', error);
      this.updateAuthState(false);
    }
  }

  async syncUserToAirtable(user) {
    try {
      console.log('🔄 Syncing user to Airtable:', {
        email: user.email,
        supabase_id: user.id
      });

      const syncData = {
        supabase_id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0]
      };

      const response = await fetch('/.netlify/functions/supabase-user-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`User sync failed: ${result.error || 'Unknown error'}`);
      }

      console.log('✅ User synced to Airtable:', result);

      // Store Airtable record ID in user object for image usage tracking
      if (result.user_id) {
        this.user.airtable_record_id = result.user_id;
        // Also store in localStorage for persistence
        localStorage.setItem('airtable_record_id', result.user_id);
        console.log('💾 Stored Airtable record ID in user object and localStorage:', result.user_id);
      }

    } catch (error) {
      console.error('❌ User sync to Airtable failed:', error);
      // Don't block login flow even if sync fails
    }
  }

  createModal(mode = 'login') {
    console.log('🔧 Creating Supabase modal with mode:', mode);

    if (document.getElementById('auth0-modal')) {
      document.getElementById('auth0-modal').remove();
    }

    const modal = document.createElement('div');
    modal.id = 'auth0-modal'; // Keep same ID for CSS compatibility
    modal.className = 'auth0-modal-overlay';

    const isSignup = mode === 'signup';
    const title = isSignup ? 'Join Selira AI' : 'Welcome Back';
    const subtitle = isSignup ? 'Start chatting with thousands of AI companions' : 'Connect with your AI companions';

    modal.innerHTML = `
      <div class="auth0-modal-content">
        <button class="auth0-modal-close" aria-label="Close">&times;</button>

        <div class="auth0-modal-header">
          <div class="auth0-logo">
            <span class="logo-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></span>
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

      const { error } = await this.supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin + window.location.pathname,
          queryParams: {
            prompt: 'select_account' // Force Google account picker
          }
        }
      });

      if (error) throw error;

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

      let result;

      if (isSignupMode) {
        // Sign up
        result = await this.supabase.auth.signUp({
          email: email,
          password: password
        });
      } else {
        // Log in
        result = await this.supabase.auth.signInWithPassword({
          email: email,
          password: password
        });
      }

      const { data, error } = result;

      if (error) throw error;

      // Check if email is verified (for login only, not signup)
      if (!isSignupMode && data.user && !data.user.email_confirmed_at) {
        this.setLoading(false);
        this.showError('Please verify your email address first. Check your inbox for the verification link.');
        return;
      }

      console.log('✅ Authentication successful:', data.user.email);

      this.user = data.user;

      // Sync user to Airtable
      await this.syncUserToAirtable(this.user);

      // Track registration event for Facebook Pixel
      if (isSignupMode) {
        localStorage.setItem('just_registered', 'true');
        window.dispatchEvent(new CustomEvent('supabase-registration-complete', {
          detail: { email: data.user.email }
        }));
        console.log('📊 Registration event dispatched for tracking');
      }

      // Update UI
      this.updateAuthState(true);
      this.closeModal();
      this.setLoading(false);

      // Show success message
      if (isSignupMode && !data.user.email_confirmed_at) {
        // Show email verification notice but still log user in
        this.showSuccess('Account created! 🎉 (Check your email to verify your account)');
        console.log('📧 User logged in - email verification pending');
      } else {
        this.showSuccess(isSignupMode ? 'Account created successfully! 🎉' : 'Welcome back! 👋');
      }

    } catch (error) {
      console.error('❌ Email/password authentication failed:', error);
      this.setLoading(false);

      // Show user-friendly error
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
        this.showError('Too many signup attempts. Please try again in a few minutes, or use Google login instead.');
      } else if (errorMsg.includes('invalid') || errorMsg.includes('incorrect')) {
        this.showError('Invalid email or password. Please try again.');
      } else if (errorMsg.includes('already') || errorMsg.includes('exists')) {
        this.showError('This email is already registered. Try logging in instead.');
      } else if (errorMsg.includes('weak') || errorMsg.includes('password')) {
        this.showError('Password must be at least 8 characters.');
      } else {
        this.showError(error.message || 'Authentication failed. Please try again.');
      }
    }
  }

  showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #ce93d8 0%, #ec4899 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(206, 147, 216, 0.3);
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }

  showVerificationMessage(message, email) {
    // Remove existing messages
    const existingError = document.querySelector('.auth0-error');
    const existingSuccess = document.querySelector('.auth0-success');
    if (existingError) existingError.remove();
    if (existingSuccess) existingSuccess.remove();

    // Create verification message with email info
    const verificationDiv = document.createElement('div');
    verificationDiv.className = 'auth0-success';
    verificationDiv.style.textAlign = 'left';
    verificationDiv.innerHTML = `
      <div style="text-align: center; margin-bottom: 12px;">
        <span style="font-size: 32px;">📧</span>
      </div>
      <strong style="display: block; margin-bottom: 8px; text-align: center;">Check Your Email</strong>
      <p style="margin: 0 0 12px 0; font-size: 13px;">We sent a verification link to:</p>
      <p style="margin: 0 0 12px 0; font-weight: 600; color: #ce93d8;">${email}</p>
      <p style="margin: 0; font-size: 12px; color: #b3b3b3;">Click the link in the email to verify your account, then come back to login.</p>
    `;

    const form = document.querySelector('.auth0-form');
    form?.insertBefore(verificationDiv, form.firstChild);

    // Don't auto-remove - let user read it
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
    const existingError = document.querySelector('.auth0-error');
    if (existingError) {
      existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'auth0-error';
    errorDiv.textContent = message;

    const form = document.querySelector('.auth0-form');
    form?.insertBefore(errorDiv, form.firstChild);

    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  openModal(mode = 'login') {
    // Prevent opening modal if already open (debounce)
    if (this.isOpen) {
      console.log('⚠️ Modal already open, ignoring duplicate openModal call');
      return;
    }

    this.createModal(mode);
    const modal = document.getElementById('auth0-modal');

    this.isOpen = true;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

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
      await this.supabase.auth.signOut();
      this.user = null;
      this.updateAuthState(false);
      console.log('✅ User logged out successfully');
      window.location.href = '/';
    } catch (error) {
      console.error('❌ Logout failed:', error);
    }
  }

  updateAuthState(isAuthenticated) {
    console.log('🔄 Updating auth state:', { isAuthenticated, user: this.user });

    const navMenu = document.querySelector('.nav-menu') || document.querySelector('.user-actions');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (isAuthenticated && this.user) {
      this.updateDesktopNav(navMenu, true);
      this.updateMobileNav(mobileMenu, true);
      this.updateSidebarNav(true);
    } else {
      this.updateDesktopNav(navMenu, false);
      this.updateMobileNav(mobileMenu, false);
      this.updateSidebarNav(false);
    }

    // Make navigation visible now that auth state is determined
    if (navMenu) navMenu.style.visibility = 'visible';
    if (mobileMenu) mobileMenu.style.visibility = 'visible';

    // Store auth state
    if (isAuthenticated && this.user) {
      localStorage.setItem('user_email', this.user.email);
      localStorage.setItem('user_uid', this.user.id);
      localStorage.setItem('user_name', this.user.user_metadata?.name || this.user.email.split('@')[0]);

      localStorage.setItem('user', JSON.stringify({
        email: this.user.email,
        sub: this.user.id,
        supabase_id: this.user.id,
        airtable_record_id: this.user.airtable_record_id,
        name: this.user.user_metadata?.name || this.user.email.split('@')[0]
      }));
    } else {
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_uid');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user');
      localStorage.removeItem('airtable_record_id');
    }

    window.dispatchEvent(new CustomEvent('auth-state-changed', {
      detail: { isAuthenticated, user: this.user }
    }));
  }

  updateDesktopNav(navMenu, isAuthenticated) {
    if (!navMenu) return;

    const allLoginBtns = navMenu.querySelectorAll('.login-btn');
    const allSignupBtns = navMenu.querySelectorAll('.signup-btn');

    let loginBtn = null;
    let signupBtn = null;

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

    if (isAuthenticated) {
      if (loginBtn) {
        loginBtn.href = '/pricing';
        loginBtn.textContent = 'Upgrade -40% off';
        loginBtn.className = 'user-btn signup-btn';
        loginBtn.onclick = null;
        loginBtn.style.background = 'var(--accent, #ce93d8)';
        loginBtn.style.color = 'white';
        loginBtn.style.padding = '8px 16px';
        loginBtn.style.fontSize = '13px';
        loginBtn.style.fontWeight = '600';
      }

      if (signupBtn) {
        signupBtn.style.display = 'none';
      }

    } else {
      if (loginBtn) {
        loginBtn.href = '#';
        loginBtn.textContent = 'Login';
        loginBtn.onclick = (e) => {
          e.preventDefault();
          this.openModal('login');
          return false;
        };
        loginBtn.style.background = 'transparent';
        loginBtn.style.color = 'rgba(255, 255, 255, 0.8)';
        loginBtn.style.display = '';
      }

      if (signupBtn) {
        signupBtn.style.display = '';
        signupBtn.href = '#';
        signupBtn.textContent = 'Register';
        signupBtn.onclick = (e) => {
          e.preventDefault();
          this.openModal('signup');
          return false;
        };
      }
    }
  }

  updateMobileNav(mobileMenu, isAuthenticated) {
    const mobileHeader = document.querySelector('.mobile-header');
    const loginBtn = mobileHeader?.querySelector('.login-btn, .mobile-auth-btn');

    if (loginBtn) {
      if (isAuthenticated) {
        loginBtn.textContent = 'Upgrade';
        loginBtn.onclick = (e) => {
          e.preventDefault();
          window.location.href = '/pricing';
          return false;
        };
        loginBtn.style.background = 'var(--accent, #ce93d8)';
      } else {
        loginBtn.textContent = 'Register';
        loginBtn.onclick = (e) => {
          e.preventDefault();
          this.openModal('signup');
          return false;
        };
      }
    }
  }

  updateSidebarNav(isAuthenticated) {
    const profileNavItem = document.getElementById('profileNavItem');
    const sidebarAuthButtons = document.getElementById('sidebarAuthButtons');

    if (isAuthenticated) {
      if (profileNavItem) profileNavItem.style.display = 'flex';
      if (sidebarAuthButtons) sidebarAuthButtons.style.display = 'none';
    } else {
      if (profileNavItem) profileNavItem.style.display = 'none';
      if (sidebarAuthButtons) sidebarAuthButtons.style.display = 'flex';
    }
  }

  isAuthenticated() {
    return !!this.user;
  }

  getUser() {
    return this.user;
  }

  async getUserToken() {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session?.access_token;
  }

  async openForgotPasswordModal() {
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

      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/profile'
      });

      if (error) throw error;

      console.log('✅ Password reset link sent successfully');

      // Show success message
      const form = document.querySelector('#auth0-forgot-password-form');
      const successDiv = document.createElement('div');
      successDiv.className = 'auth0-success';
      successDiv.textContent = 'Check your email for the password reset link! 📧';
      form?.insertBefore(successDiv, form.firstChild);

    } catch (error) {
      console.error('❌ Forgot password failed:', error);

      if (btnText && btnLoader && submitBtn) {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        submitBtn.disabled = false;
      }

      const form = document.querySelector('#auth0-forgot-password-form');
      const errorDiv = document.createElement('div');
      errorDiv.className = 'auth0-error';
      errorDiv.textContent = error.message || 'Failed to send reset link. Please try again.';
      form?.insertBefore(errorDiv, form.firstChild);

      setTimeout(() => {
        errorDiv.remove();
      }, 5000);
    }
  }
}

// ===== SUPABASE MODAL STYLES (SELIRA THEME) =====
const SUPABASE_STYLES = `
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
  z-index: 10000;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.auth0-modal-overlay[style*="flex"] {
  opacity: 1;
}

.auth0-modal-content {
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  border: 1px solid #ce93d8;
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
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-icon svg {
  stroke: #ce93d8;
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
  border-color: #ce93d8;
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
  border-color: #ce93d8;
  box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.1);
}

.auth0-input::placeholder {
  color: #b3b3b3;
}

.auth0-submit-btn {
  background: #ce93d8;
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
  background: #ba68c8;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(206, 147, 216, 0.3);
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
  color: #ce93d8;
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
  color: #ce93d8;
  text-decoration: none;
  font-weight: 600;
  margin-left: 4px;
}

.auth0-switch-link:hover {
  text-decoration: underline;
  color: #ba68c8;
}

.auth0-forgot-password {
  text-align: right;
  margin-top: -2px;
  margin-bottom: 8px;
}

.auth0-forgot-link {
  color: #ce93d8;
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
}

.auth0-forgot-link:hover {
  text-decoration: underline;
  color: #ba68c8;
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
  background: rgba(206, 147, 216, 0.1);
  border: 1px solid rgba(206, 147, 216, 0.3);
  border-radius: 8px;
  padding: 12px;
  color: #e9d5ff;
  font-size: 14px;
  text-align: center;
  margin-bottom: 16px;
}

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

// ===== INITIALIZE SUPABASE =====
let seliraAuth = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🔄 DOM ready, initializing Supabase auth...');

  // Inject Supabase styles
  document.head.insertAdjacentHTML('beforeend', SUPABASE_STYLES);

  try {
    // Fetch Supabase config from Netlify function
    const response = await fetch('/.netlify/functions/supabase-config');
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to load Supabase config');
    }

    // Store config globally
    window.SUPABASE_CONFIG = data.config;

    console.log('✅ Supabase config loaded for Selira');

    // Initialize auth modal
    seliraAuth = new SupabaseAuthModal();

    // Add proper click handlers to sidebar auth buttons
    setTimeout(() => {
      const sidebarAuthButtons = document.getElementById('sidebarAuthButtons');
      if (sidebarAuthButtons) {
        const loginLink = sidebarAuthButtons.querySelector('a.nav-item');
        const registerLink = sidebarAuthButtons.querySelector('a.sidebar-auth-btn, .sidebar-auth-btn');

        if (loginLink) {
          // Remove inline onclick to prevent conflicts
          loginLink.removeAttribute('onclick');
          loginLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔵 Sidebar login clicked - closing sidebar first');

            // Force close sidebar immediately
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('open', 'show');

            // Then open modal
            window.openLoginModal('login');
          });
          console.log('✅ Added proper click handler to sidebar login button');
        }

        if (registerLink) {
          // Remove inline onclick to prevent conflicts
          registerLink.removeAttribute('onclick');
          registerLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔵 Sidebar register clicked - closing sidebar first');

            // Force close sidebar immediately
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('open', 'show');

            // Then open modal
            window.openLoginModal('signup');
          });
          console.log('✅ Added proper click handler to sidebar register button');
        }
      }
    }, 1000); // Wait for DOM to be fully ready

  } catch (error) {
    console.error('❌ Failed to load Supabase config:', error);
  }
});

// ===== GLOBAL AUTH FUNCTIONS FOR SELIRA =====
window.openLoginModal = function(mode = 'login', event = null) {
  console.log('🌍 openLoginModal called with mode:', mode, 'event:', !!event);

  // Stop event propagation to prevent sidebar overlay click handler from interfering
  if (event) {
    event.stopPropagation();
    event.preventDefault();
    console.log('✋ Event propagation stopped');
  }

  // Only close sidebar on mobile (when it has the 'open' class)
  const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar') || document.querySelector('aside.sidebar');
  const overlay = document.getElementById('sidebarOverlay') || document.querySelector('.sidebar-overlay');

  console.log('📱 Sidebar element found:', !!sidebar, 'Overlay found:', !!overlay);
  if (sidebar) {
    console.log('📱 Sidebar has open class:', sidebar.classList.contains('open'));
    console.log('📱 Sidebar classes:', sidebar.className);
  }
  if (overlay) {
    console.log('📱 Overlay has open class:', overlay.classList.contains('open'));
    console.log('📱 Overlay has show class:', overlay.classList.contains('show'));
    console.log('📱 Overlay classes:', overlay.className);
  }

  // Only manipulate sidebar if it's actually open (mobile only)
  if (sidebar && sidebar.classList.contains('open')) {
    console.log('📱 Closing mobile sidebar');
    sidebar.classList.remove('open');
  } else if (sidebar) {
    console.log('⚠️ Sidebar found but not open');
  }

  if (overlay && (overlay.classList.contains('open') || overlay.classList.contains('show'))) {
    console.log('📱 Hiding overlay');
    overlay.classList.remove('show', 'open');
  } else if (overlay) {
    console.log('⚠️ Overlay found but not open/show');
  }

  if (seliraAuth) {
    seliraAuth.openModal(mode);
  } else {
    console.error('❌ seliraAuth not initialized yet');
  }
};

window.openSignupModal = function() {
  // Close mobile sidebar if open
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
  }

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

window.openForgotPasswordModal = function(event) {
  event.preventDefault();
  if (seliraAuth) {
    seliraAuth.openForgotPasswordModal();
  }
};
