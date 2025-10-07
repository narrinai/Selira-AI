// Supabase Auth Token Verification
// Verifies Supabase JWT tokens and returns user data

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL_SELIRA;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_SELIRA;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

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
    const { token } = JSON.parse(event.body);

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing token'
        })
      };
    }

    console.log('🔐 Verifying Supabase token...');

    // Create Supabase client with service role key (can verify tokens)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the JWT token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('❌ Token verification failed:', error);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid or expired token'
        })
      };
    }

    console.log('✅ Token verified for user:', user.email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          email_confirmed: user.email_confirmed_at !== null,
          created_at: user.created_at,
          app_metadata: user.app_metadata,
          user_metadata: user.user_metadata
        }
      })
    };

  } catch (error) {
    console.error('❌ Auth verification error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
