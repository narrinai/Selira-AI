// Auth0 Integration for Selira AI
// This replaces Netlify Identity throughout the platform

let auth0Client = null;

// Initialize Auth0 client
const initAuth0 = async () => {
  auth0Client = await auth0.createAuth0Client({
    domain: 'your-domain.auth0.com', // Update with your Auth0 domain
    clientId: 'your_client_id',      // Update with your Client ID
    authorizationParams: {
      redirect_uri: window.location.origin + '/callback'
    },
    cacheLocation: 'localstorage'
  });
  
  // Check if user is authenticated
  const isAuthenticated = await auth0Client.isAuthenticated();
  
  if (isAuthenticated) {
    const user = await auth0Client.getUser();
    updateUIForLoggedInUser(user);
  } else {
    updateUIForLoggedOutUser();
  }
  
  // Handle callback
  if (window.location.pathname === '/callback') {
    await handleAuth0Callback();
  }
};

// Handle Auth0 callback
const handleAuth0Callback = async () => {
  try {
    await auth0Client.handleRedirectCallback();
    
    // Get user info
    const user = await auth0Client.getUser();
    
    // Sync user to Airtable
    await syncUserToDatabase(user);
    
    // Redirect to app
    window.location.href = '/';
    
  } catch (error) {
    console.error('Auth0 callback error:', error);
    window.location.href = '/?error=auth_failed';
  }
};

// Login function
const login = async () => {
  try {
    await auth0Client.loginWithRedirect({
      authorizationParams: {
        screen_hint: 'login'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
  }
};

// Signup function  
const signup = async () => {
  try {
    await auth0Client.loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup'
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
  }
};

// Logout function
const logout = () => {
  auth0Client.logout({
    logoutParams: {
      returnTo: window.location.origin
    }
  });
};

// Get current user
const getCurrentUser = async () => {
  if (!auth0Client) return null;
  
  const isAuthenticated = await auth0Client.isAuthenticated();
  if (isAuthenticated) {
    return await auth0Client.getUser();
  }
  return null;
};

// Sync user to Airtable database
const syncUserToDatabase = async (user) => {
  try {
    const response = await fetch('/.netlify/functions/selira-auth0-user-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth0_id: user.sub,
        email: user.email,
        name: user.name || user.nickname,
        picture: user.picture
      })
    });
    
    if (!response.ok) {
      throw new Error('User sync failed');
    }
    
    console.log('✅ User synced to database');
  } catch (error) {
    console.error('❌ User sync error:', error);
  }
};

// Update UI for logged in user
const updateUIForLoggedInUser = (user) => {
  // Update login buttons
  const loginBtns = document.querySelectorAll('#loginBtn, #mobileLoginBtn');
  loginBtns.forEach(btn => {
    btn.textContent = 'Profile';
    btn.href = '/profile';
  });
  
  // Show user avatar/name if needed
  const userElements = document.querySelectorAll('.user-display');
  userElements.forEach(el => {
    el.innerHTML = `
      <img src="${user.picture}" alt="${user.name}" class="user-avatar">
      <span>${user.name}</span>
    `;
  });
};

// Update UI for logged out user
const updateUIForLoggedOutUser = () => {
  const loginBtns = document.querySelectorAll('#loginBtn, #mobileLoginBtn');
  loginBtns.forEach(btn => {
    btn.textContent = 'Login';
    btn.href = '#';
    btn.onclick = (e) => {
      e.preventDefault();
      login();
    };
  });
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAuth0);

// Export functions for global use
window.Selira = {
  auth: {
    login,
    signup, 
    logout,
    getCurrentUser,
    isAuthenticated: () => auth0Client?.isAuthenticated() || false
  }
};