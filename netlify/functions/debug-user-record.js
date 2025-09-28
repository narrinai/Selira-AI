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
    const { userEmail, auth0Id } = JSON.parse(event.body || '{}');

    console.log('🔍 Looking up user:', { userEmail, auth0Id });

    // Try both email and Auth0ID
    const users = await base('Users').select({
      filterByFormula: userEmail
        ? `OR({Email} = '${userEmail}', {Auth0ID} = '${auth0Id || ''}')`
        : `{Auth0ID} = '${auth0Id}'`
    }).firstPage();

    console.log('📊 Found users:', users.length);

    if (users.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'No user found',
          searchCriteria: { userEmail, auth0Id }
        })
      };
    }

    const user = users[0];
    const userData = user.fields;

    console.log('✅ User found:', {
      id: user.id,
      email: userData.Email,
      plan: userData.Plan,
      auth0id: userData.Auth0ID
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: userData.Email,
          plan: userData.Plan,
          auth0id: userData.Auth0ID,
          stripeCustomerId: userData.stripe_customer_id,
          stripeSubscriptionId: userData.stripe_subscription_id,
          subscriptionStatus: userData.subscription_status,
          planEndDate: userData.plan_end_date,
          allFields: Object.keys(userData),
          stripeFields: Object.keys(userData).filter(key =>
            key.toLowerCase().includes('stripe')
          )
        }
      })
    };

  } catch (error) {
    console.error('❌ Debug error:', error);
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