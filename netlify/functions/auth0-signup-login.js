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

    console.log('🔍 Auth0 environment check:', {
      domain: AUTH0_DOMAIN ? `${AUTH0_DOMAIN.substring(0, 10)}...` : 'MISSING',
      clientId: AUTH0_CLIENT_ID ? `${AUTH0_CLIENT_ID.substring(0, 8)}...` : 'MISSING',
      clientSecret: AUTH0_CLIENT_SECRET ? 'EXISTS' : 'MISSING',
      action: action,
      email: email
    });

    if (!AUTH0_DOMAIN) {
      throw new Error('AUTH0_DOMAIN environment variable is missing');
    }
    if (!AUTH0_CLIENT_ID) {
      throw new Error('AUTH0_CLIENT_ID environment variable is missing');
    }
    if (!AUTH0_CLIENT_SECRET) {
      throw new Error('AUTH0_CLIENT_SECRET environment variable is missing. Please add it to your Netlify environment variables.');
    }

    // Try common database connection names
    const CONNECTION_NAME = process.env.AUTH0_DB_CONNECTION || 'Username-Password-Authentication';

    console.log('🔗 Using database connection:', CONNECTION_NAME);

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
          connection: CONNECTION_NAME
        })
      });

      if (!signupResponse.ok) {
        const error = await signupResponse.json();
        console.error('❌ Signup failed:', error);
        throw new Error(error.description || error.message || 'Signup failed');
      }

      const signupData = await signupResponse.json();
      console.log('✅ Account created:', signupData);

      // CRITICAL: Sync user to Airtable immediately after signup
      // This ensures user exists in Airtable even if email verification is required
      if (signupData._id || signupData.Id) {
        const auth0UserId = signupData._id || signupData.Id;
        console.log('🔄 Syncing new user to Airtable:', auth0UserId);

        try {
          const syncResponse = await fetch(`https://${process.env.URL || 'https://selira.ai'}/.netlify/functions/selira-auth0-user-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              auth0_id: auth0UserId,
              email: email,
              name: signupData.name || signupData.username || email.split('@')[0]
            })
          });

          if (syncResponse.ok) {
            const syncResult = await syncResponse.json();
            console.log('✅ New user synced to Airtable:', syncResult);
          } else {
            console.error('⚠️ Airtable sync failed but continuing');
          }
        } catch (syncError) {
          console.error('⚠️ Airtable sync error:', syncError);
          // Don't block signup if sync fails
        }
      }
    }

    // Step 2: Get access token (for both signup and login)
    console.log('🔐 Authenticating user:', email);

    // Build token request - try with and without audience
    const tokenBody = {
      grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
      username: email,
      password: password,
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      realm: CONNECTION_NAME,
      scope: 'openid profile email'
    };

    console.log('🔐 Token request (without sensitive data):', {
      grant_type: tokenBody.grant_type,
      username: email,
      realm: CONNECTION_NAME
    });

    const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokenBody)
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('❌ Authentication failed:', error);

      // Special handling for email verification requirement (both signup AND login)
      if (error.error_description && error.error_description.includes('verify')) {
        console.log('📧 Email verification required');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            requiresVerification: true,
            email: email,
            message: action === 'signup'
              ? 'Account created! Please check your email to verify your account before logging in.'
              : 'Please verify your email address first. Check your inbox for the verification link.'
          })
        };
      }

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
    console.log('📋 Full userInfo object:', userInfo);
    console.log('🆔 Auth0 sub (user ID):', userInfo.sub);

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
