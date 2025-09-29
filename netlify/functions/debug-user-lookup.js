// Debug function to test user lookup in webhook context
const Airtable = require('airtable');

// Use same environment variables as webhook
const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN
}).base(process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const testEmail = event.queryStringParameters?.email || 'info@narrin.ai';

    console.log('🔍 Debug user lookup for:', testEmail);

    const environmentInfo = {
      hasTokenSelira: !!process.env.AIRTABLE_TOKEN_SELIRA,
      hasToken: !!process.env.AIRTABLE_TOKEN,
      hasApiKey: !!process.env.AIRTABLE_API_KEY,
      hasBaseSelira: !!process.env.AIRTABLE_BASE_ID_SELIRA,
      hasBase: !!process.env.AIRTABLE_BASE_ID,
      tokenLength: (process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN || '').length,
      baseUsed: process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID || 'none'
    };

    console.log('🔍 Environment check:', environmentInfo);

    // Try to find user using same logic as webhook
    const users = await base('Users').select({
      filterByFormula: `{Email} = '${testEmail}'`
    }).firstPage();

    console.log('👥 Users found:', users.length);

    let userInfo = [];
    if (users.length > 0) {
      userInfo = users.map(user => ({
        id: user.id,
        email: user.fields.Email,
        plan: user.fields.Plan,
        auth0ID: user.fields.Auth0ID,
        stripeCustomerId: user.fields.stripe_customer_id,
        stripeSubscriptionId: user.fields.stripe_subscription_id,
        subscriptionStatus: user.fields.subscription_status
      }));
      console.log('✅ User(s) found:', userInfo);
    } else {
      console.log('❌ User not found, listing available users...');
      const allUsers = await base('Users').select({ maxRecords: 5 }).firstPage();
      userInfo = allUsers.map((user, index) => ({
        index: index + 1,
        email: user.fields.Email || 'No email',
        plan: user.fields.Plan || 'No plan',
        auth0ID: user.fields.Auth0ID || 'No Auth0ID'
      }));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        searchEmail: testEmail,
        usersFound: users.length,
        users: userInfo,
        environment: environmentInfo
      }, null, 2)
    };

  } catch (error) {
    console.error('❌ Debug error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: error.stack
      })
    };
  }
};
