const Stripe = require('stripe');
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
    // Initialize Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY_SELIRA ||
                     process.env.STRIPE_SECRET_KEY ||
                     process.env.STRIPE_SELIRA_SECRET;

    if (!stripeKey) {
      console.error('❌ Missing Stripe configuration');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Stripe configuration missing' })
      };
    }

    const stripe = new Stripe(stripeKey);
    const sig = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_SELIRA || process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('❌ Missing Stripe webhook secret');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Webhook secret missing' })
      };
    }

    // Verify webhook signature
    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Webhook signature verification failed' })
      };
    }

    console.log('✅ Received Stripe webhook:', stripeEvent.type);

    // Handle different webhook events
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(stripeEvent.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(stripeEvent.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(stripeEvent.data.object);
        break;

      default:
        console.log('🔄 Unhandled event type:', stripeEvent.type);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Webhook processing failed' })
    };
  }
};

async function handleCheckoutCompleted(session) {
  try {
    console.log('🔄 Processing checkout completed for session:', session.id);

    const userEmail = session.customer_email || session.metadata?.user_email;
    const userId = session.metadata?.user_id;
    const planName = session.metadata?.plan_name;

    if (!userEmail) {
      console.error('❌ No user email found in session metadata');
      return;
    }

    // Find user in Airtable
    const users = await base('Users').select({
      filterByFormula: `OR({Email} = '${userEmail}', {Auth0ID} = '${userId}')`
    }).firstPage();

    if (users.length === 0) {
      console.error('❌ User not found:', { userEmail, userId });
      return;
    }

    const user = users[0];
    console.log('✅ Found user:', user.fields.Email);

    // Update user plan in Airtable
    await base('Users').update(user.id, {
      'Plan': planName || 'Basic',
      'stripe_customer_id': session.customer,
      'stripe_subscription_id': session.subscription,
      'plan_start_date': new Date().toISOString().split('T')[0],
      'subscription_status': 'active'
    });

    console.log('✅ Updated user plan to:', planName || 'Basic');

  } catch (error) {
    console.error('❌ Error handling checkout completed:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    console.log('🔄 Processing payment succeeded for subscription:', invoice.subscription);

    // Update subscription renewal date
    if (invoice.subscription) {
      await updateSubscriptionRenewal(invoice.subscription, invoice.lines.data[0]?.period?.end);
    }

  } catch (error) {
    console.error('❌ Error handling payment succeeded:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    console.log('🔄 Processing subscription updated:', subscription.id);

    const customerId = subscription.customer;

    // Find user by Stripe customer ID
    const users = await base('Users').select({
      filterByFormula: `{stripe_customer_id} = '${customerId}'`
    }).firstPage();

    if (users.length === 0) {
      console.error('❌ User not found for customer:', customerId);
      return;
    }

    const user = users[0];

    // Update subscription details
    await base('Users').update(user.id, {
      'subscription_status': subscription.status,
      'plan_end_date': subscription.current_period_end ?
        new Date(subscription.current_period_end * 1000).toISOString().split('T')[0] : null
    });

    console.log('✅ Updated subscription status for user:', user.fields.Email);

  } catch (error) {
    console.error('❌ Error handling subscription updated:', error);
  }
}

async function handleSubscriptionCanceled(subscription) {
  try {
    console.log('🔄 Processing subscription canceled:', subscription.id);

    const customerId = subscription.customer;

    // Find user by Stripe customer ID
    const users = await base('Users').select({
      filterByFormula: `{stripe_customer_id} = '${customerId}'`
    }).firstPage();

    if (users.length === 0) {
      console.error('❌ User not found for customer:', customerId);
      return;
    }

    const user = users[0];

    // Update user to Free plan
    await base('Users').update(user.id, {
      'Plan': 'Free',
      'subscription_status': 'canceled',
      'plan_end_date': subscription.ended_at ?
        new Date(subscription.ended_at * 1000).toISOString().split('T')[0] :
        new Date().toISOString().split('T')[0]
    });

    console.log('✅ Downgraded user to Free plan:', user.fields.Email);

  } catch (error) {
    console.error('❌ Error handling subscription canceled:', error);
  }
}

async function updateSubscriptionRenewal(subscriptionId, periodEnd) {
  try {
    // Find user by subscription ID
    const users = await base('Users').select({
      filterByFormula: `{stripe_subscription_id} = '${subscriptionId}'`
    }).firstPage();

    if (users.length === 0) {
      console.error('❌ User not found for subscription:', subscriptionId);
      return;
    }

    const user = users[0];

    // Update renewal date
    await base('Users').update(user.id, {
      'plan_end_date': periodEnd ?
        new Date(periodEnd * 1000).toISOString().split('T')[0] : null
    });

    console.log('✅ Updated renewal date for user:', user.fields.Email);

  } catch (error) {
    console.error('❌ Error updating subscription renewal:', error);
  }
}