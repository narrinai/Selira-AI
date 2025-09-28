const Airtable = require('airtable');

// Initialize Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN
}).base(process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { userEmail } = JSON.parse(event.body || '{}');

    console.log('🔍 Testing user lookup for:', userEmail);

    // Find user in Airtable
    const users = await base('Users').select({
      filterByFormula: `{Email} = '${userEmail}'`
    }).firstPage();

    if (users.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'User not found',
          email: userEmail
        })
      };
    }

    const user = users[0];
    const userData = user.fields;

    console.log('✅ User found:', {
      email: userData.Email,
      plan: userData.Plan,
      allFields: Object.keys(userData)
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: {
          email: userData.Email,
          plan: userData.Plan,
          hasStripeCustomerId: !!userData.stripe_customer_id,
          hasStripeSubId: !!userData.stripe_subscription_id,
          stripeFields: Object.keys(userData).filter(key =>
            key.toLowerCase().includes('stripe') ||
            key.toLowerCase().includes('subscription')
          ),
          allFields: Object.keys(userData)
        }
      })
    };

  } catch (error) {
    console.error('❌ Test lookup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      })
    };
  }
};