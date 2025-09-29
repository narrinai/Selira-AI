const Stripe = require('stripe');
const Airtable = require('airtable');

// Initialize Airtable - try all possible environment variable combinations
const airtableKey = process.env.AIRTABLE_TOKEN_SELIRA ||
                   process.env.AIRTABLE_API_KEY ||
                   process.env.AIRTABLE_TOKEN;

const airtableBaseId = process.env.AIRTABLE_BASE_ID_SELIRA ||
                      process.env.AIRTABLE_BASE_ID;

console.log('🔍 Airtable config check:', {
  hasKey: !!airtableKey,
  hasBase: !!airtableBaseId,
  keyLength: airtableKey ? airtableKey.length : 0,
  baseLength: airtableBaseId ? airtableBaseId.length : 0,
  availableEnvVars: Object.keys(process.env).filter(key => key.includes('AIRTABLE'))
});

if (!airtableKey || !airtableBaseId) {
  console.error('❌ Missing Airtable configuration:', {
    key: !!airtableKey,
    base: !!airtableBaseId
  });
}

const base = new Airtable({ apiKey: airtableKey }).base(airtableBaseId);

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

    console.log('🔄 Manage subscription called with:', {
      action,
      userEmail,
      hasAuth0Id: !!auth0Id
    });

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
      filterFormula = `OR({Email} = '${userEmail}', {Auth0ID} = '${auth0Id}')`;
    } else if (userEmail) {
      filterFormula = `{Email} = '${userEmail}'`;
    } else {
      filterFormula = `{Auth0ID} = '${auth0Id}'`;
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

    console.log('🔍 Found user in Airtable:', {
      email: userData.Email,
      plan: userData.Plan,
      hasStripeCustomerId: !!userData.stripe_customer_id,
      hasStripeSubId: !!userData.stripe_subscription_id,
      stripeCustomerId: userData.stripe_customer_id,
      stripeSubId: userData.stripe_subscription_id,
      subscriptionStatus: userData.subscription_status,
      allFields: Object.keys(userData)
    });

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
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      details: error.details
    });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to manage subscription',
        details: error.message,
        debugInfo: error.details || null
      })
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
  console.log('🔄 cancelAtPeriodEnd called for user:', userData.Email);
  console.log('🔍 User data:', {
    hasStripeSubId: !!userData.stripe_subscription_id,
    stripeSubId: userData.stripe_subscription_id,
    plan: userData.Plan,
    userId: user.id
  });

  // Check for Stripe subscription ID - most likely field names first
  const subscriptionId = userData.stripe_subscription_id ||
                         userData.StripeSubscriptionID ||
                         userData['Stripe Subscription ID'] ||
                         userData.subscription_id;

  console.log('🔍 Subscription ID check:', {
    stripe_subscription_id: userData.stripe_subscription_id,
    StripeSubscriptionID: userData.StripeSubscriptionID,
    'Stripe Subscription ID': userData['Stripe Subscription ID'],
    subscription_id: userData.subscription_id,
    finalSubscriptionId: subscriptionId
  });

  // Check if this is a test subscription ID
  const isTestSubscription = subscriptionId && (
    subscriptionId.startsWith('sub_test_') ||
    subscriptionId.startsWith('cus_test_') ||
    subscriptionId === 'test' ||
    subscriptionId.includes('test')
  );

  console.log('🧪 Test subscription check:', {
    subscriptionId,
    isTestSubscription
  });

  if (!subscriptionId || isTestSubscription) {
    if (isTestSubscription) {
      console.log('🧪 Test subscription detected - handling as manual plan:', userData.Plan);
      console.log('🔄 Downgrading test subscription directly in Airtable');
    } else {
      console.log('⚠️ No Stripe subscription found, but user has plan:', userData.Plan);
      console.log('🔄 This appears to be a manually assigned plan - downgrading directly in Airtable');
    }

    // Check if user actually has a paid plan that needs downgrading
    if (userData.Plan && userData.Plan.toLowerCase() !== 'free') {
      console.log('✅ Downgrading manual plan from', userData.Plan, 'to Free');

      // Calculate plan end date (30 days from now for manual downgrades)
      const planEndDate = new Date();
      planEndDate.setDate(planEndDate.getDate() + 30);
      const planEndDateString = planEndDate.toISOString().split('T')[0];

      console.log('📅 Setting plan end date to:', planEndDateString);

      // Update user directly in Airtable since there's no Stripe subscription
      await base('Users').update(user.id, {
        'Plan': 'Free',
        'plan_end_date': planEndDateString,
        'subscription_status': 'canceled'
      });

      return {
        message: 'Plan downgraded successfully',
        subscription_status: 'canceled',
        note: isTestSubscription ? 'Test subscription downgraded (no real Stripe subscription)' : 'Manual plan downgrade (no Stripe subscription found)',
        previousPlan: userData.Plan,
        cancels_at: planEndDateString
      };
    } else {
      // User is already on free plan
      return {
        message: 'User is already on free plan',
        subscription_status: 'canceled',
        currentPlan: userData.Plan || 'Free'
      };
    }
  }

  try {
    console.log('🔄 Calling Stripe to cancel subscription at period end:', subscriptionId);

    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    console.log('✅ Stripe subscription updated successfully:', {
      id: subscription.id,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: subscription.current_period_end
    });

    // Update user in Airtable
    const airtableUpdate = {
      'subscription_status': 'canceling',
      'plan_end_date': new Date(subscription.current_period_end * 1000).toISOString().split('T')[0]
    };

    console.log('🔄 Updating Airtable with:', airtableUpdate);

    await base('Users').update(user.id, airtableUpdate);

    console.log('✅ Airtable updated successfully');

    return {
      message: 'Subscription will be canceled at the end of the current period',
      subscription_status: 'canceling',
      cancels_at: new Date(subscription.current_period_end * 1000).toISOString().split('T')[0]
    };

  } catch (error) {
    console.error('❌ Error in cancelAtPeriodEnd:', error);
    throw error;
  }
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