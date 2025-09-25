const Airtable = require('airtable');
const Stripe = require('stripe');

// Initialize Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN
}).base(process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get user email from query parameters
    const userEmail = event.queryStringParameters?.email;
    const auth0Id = event.queryStringParameters?.auth0_id;

    if (!userEmail && !auth0Id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email or auth0_id parameter required' })
      };
    }

    // Find user in Airtable
    let filterFormula = '';
    if (userEmail && auth0Id) {
      filterFormula = `OR({Email} = '${userEmail}', {auth0_id} = '${auth0Id}')`;
    } else if (userEmail) {
      filterFormula = `{Email} = '${userEmail}'`;
    } else {
      filterFormula = `{auth0_id} = '${auth0Id}'`;
    }

    const users = await base('Users').select({
      filterByFormula: filterFormula
    }).firstPage();

    if (users.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const user = users[0];
    const userData = user.fields;

    // Basic subscription info from Airtable
    let subscriptionInfo = {
      plan: userData.Plan || 'Free',
      subscription_status: userData.subscription_status || 'inactive',
      plan_start_date: userData.plan_start_date,
      plan_end_date: userData.plan_end_date,
      stripe_customer_id: userData.stripe_customer_id,
      stripe_subscription_id: userData.stripe_subscription_id
    };

    // If user has a Stripe subscription, get detailed info from Stripe
    if (userData.stripe_subscription_id) {
      try {
        const stripeKey = process.env.STRIPE_SECRET_KEY_SELIRA ||
                         process.env.STRIPE_SECRET_KEY ||
                         process.env.STRIPE_SELIRA_SECRET;

        if (stripeKey) {
          const stripe = new Stripe(stripeKey);
          const subscription = await stripe.subscriptions.retrieve(userData.stripe_subscription_id);

          subscriptionInfo = {
            ...subscriptionInfo,
            stripe_status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString().split('T')[0],
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString().split('T')[0],
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString().split('T')[0] : null,
            price_id: subscription.items.data[0]?.price?.id,
            amount: subscription.items.data[0]?.price?.unit_amount ? (subscription.items.data[0].price.unit_amount / 100) : null,
            currency: subscription.items.data[0]?.price?.currency || 'eur'
          };
        }
      } catch (stripeError) {
        console.error('❌ Error fetching Stripe subscription:', stripeError);
        // Continue with Airtable data only
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        subscription: subscriptionInfo
      })
    };

  } catch (error) {
    console.error('❌ Get subscription info error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get subscription info' })
    };
  }
};