// Auth0 Forgot Password Handler for Selira AI
// Triggers password reset email with code

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
    const { email } = JSON.parse(event.body);

    if (!email) {
      throw new Error('Email is required');
    }

    const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
    const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;

    console.log('🔍 Forgot password request for:', email);

    if (!AUTH0_DOMAIN) {
      throw new Error('AUTH0_DOMAIN environment variable is missing');
    }
    if (!AUTH0_CLIENT_ID) {
      throw new Error('AUTH0_CLIENT_ID environment variable is missing');
    }

    // Database connection name
    const CONNECTION_NAME = process.env.AUTH0_DB_CONNECTION || 'Username-Password-Authentication';

    console.log('🔗 Using database connection:', CONNECTION_NAME);

    // Trigger password change email
    const response = await fetch(`https://${AUTH0_DOMAIN}/dbconnections/change_password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: AUTH0_CLIENT_ID,
        email: email,
        connection: CONNECTION_NAME
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Password reset failed:', error);
      throw new Error(error.message || error.error || 'Failed to send password reset email');
    }

    // Auth0 returns a success message string
    const result = await response.text();
    console.log('✅ Password reset email sent:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Password reset email sent successfully'
      })
    };

  } catch (error) {
    console.error('❌ Forgot password error:', error);

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to send password reset email'
      })
    };
  }
};
