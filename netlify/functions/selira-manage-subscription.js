const Stripe = require('stripe');
const Airtable = require('airtable');

// Initialize Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN
}).base(process.env.AIRTABLE_BASE_ID);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
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
    const { action, userEmail, auth0Id } = JSON.parse(event.body || '{}');

    if (!action || (!userEmail && !auth0Id)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Action and user identification required' })
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

    // Initialize Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY_SELIRA ||
                     process.env.STRIPE_SECRET_KEY ||
                     process.env.STRIPE_SELIRA_SECRET;

    if (!stripeKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Stripe configuration missing' })
      };
    }

    const stripe = new Stripe(stripeKey);

    let result = {};

    switch (action) {
      case 'cancel':
        result = await cancelSubscription(stripe, user, userData);
        break;

      case 'cancel_at_period_end':
        result = await cancelAtPeriodEnd(stripe, user, userData);
        break;

      case 'reactivate':
        result = await reactivateSubscription(stripe, user, userData);
        break;

      case 'create_portal_session':
        result = await createPortalSession(stripe, userData);
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        ...result
      })
    };

  } catch (error) {
    console.error('❌ Manage subscription error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to manage subscription' })
    };
  }
};

async function cancelSubscription(stripe, user, userData) {
  if (!userData.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  // Cancel subscription immediately
  const subscription = await stripe.subscriptions.cancel(userData.stripe_subscription_id);

  // Update user in Airtable
  await base('Users').update(user.id, {
    'Plan': 'Free',
    'subscription_status': 'canceled',
    'plan_end_date': new Date().toISOString().split('T')[0]
  });

  return {
    message: 'Subscription canceled successfully',
    subscription_status: 'canceled'
  };
}

async function cancelAtPeriodEnd(stripe, user, userData) {
  if (!userData.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  // Cancel subscription at period end
  const subscription = await stripe.subscriptions.update(userData.stripe_subscription_id, {
    cancel_at_period_end: true
  });

  // Update user in Airtable
  await base('Users').update(user.id, {
    'subscription_status': 'canceling',
    'plan_end_date': new Date(subscription.current_period_end * 1000).toISOString().split('T')[0]
  });

  return {
    message: 'Subscription will be canceled at the end of the current period',
    subscription_status: 'canceling',
    cancels_at: new Date(subscription.current_period_end * 1000).toISOString().split('T')[0]
  };
}

async function reactivateSubscription(stripe, user, userData) {
  if (!userData.stripe_subscription_id) {
    throw new Error('No subscription found');
  }

  // Reactivate subscription (remove cancel_at_period_end)
  const subscription = await stripe.subscriptions.update(userData.stripe_subscription_id, {
    cancel_at_period_end: false
  });

  // Update user in Airtable
  await base('Users').update(user.id, {
    'subscription_status': 'active',
    'plan_end_date': new Date(subscription.current_period_end * 1000).toISOString().split('T')[0]
  });

  return {
    message: 'Subscription reactivated successfully',
    subscription_status: 'active'
  };
}

async function createPortalSession(stripe, userData) {
  if (!userData.stripe_customer_id) {
    throw new Error('No Stripe customer found');
  }

  // Create Stripe Customer Portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: userData.stripe_customer_id,
    return_url: 'https://selira.ai/profile'
  });

  return {
    portal_url: session.url
  };
}