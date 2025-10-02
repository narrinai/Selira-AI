// Auth0 Signup and Login Handler for Selira AI
// Handles direct email/password authentication without redirect

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { action, email, password } = JSON.parse(event.body);

    const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
    const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
    const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

    if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET) {
      throw new Error('Auth0 configuration missing');
    }

    if (action === 'signup') {
      // Step 1: Create account
      console.log('📝 Creating new Auth0 account:', email);

      const signupResponse = await fetch(`https://${AUTH0_DOMAIN}/dbconnections/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: AUTH0_CLIENT_ID,
          email: email,
          password: password,
          connection: 'Username-Password-Authentication'
        })
      });

      if (!signupResponse.ok) {
        const error = await signupResponse.json();
        console.error('❌ Signup failed:', error);
        throw new Error(error.description || error.message || 'Signup failed');
      }

      const signupData = await signupResponse.json();
      console.log('✅ Account created:', signupData);
    }

    // Step 2: Get access token (for both signup and login)
    console.log('🔐 Authenticating user:', email);

    const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'password',
        username: email,
        password: password,
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        audience: `https://${AUTH0_DOMAIN}/api/v2/`,
        scope: 'openid profile email'
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('❌ Authentication failed:', error);
      throw new Error(error.error_description || 'Authentication failed');
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Token obtained');

    // Step 3: Get user info
    const userInfoResponse = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userInfo = await userInfoResponse.json();
    console.log('✅ User info retrieved:', userInfo.email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: userInfo,
        tokens: {
          access_token: tokenData.access_token,
          id_token: tokenData.id_token,
          expires_in: tokenData.expires_in
        }
      })
    };

  } catch (error) {
    console.error('❌ Auth0 signup/login error:', error);

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Authentication failed'
      })
    };
  }
};
