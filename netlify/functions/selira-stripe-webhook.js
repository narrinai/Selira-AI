const Stripe = require('stripe');
const Airtable = require('airtable');

// Initialize Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN
}).base(process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID);

exports.handler = async (event, context) => {
  console.log('🚀 WEBHOOK HANDLER STARTED - Version debug-v2');
  console.log('📨 HTTP Method:', event.httpMethod);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    console.log('🔄 OPTIONS request handled');
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
    console.log('🔍 Event data object type:', stripeEvent.data.object.object);

    // Handle different webhook events
    console.log('🔄 About to handle event type:', stripeEvent.type);
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        console.log('🎯 Calling handleCheckoutCompleted...');
        await handleCheckoutCompleted(stripeEvent.data.object);
        console.log('✅ handleCheckoutCompleted completed');
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
      body: JSON.stringify({
        received: true,
        processed: true,
        timestamp: new Date().toISOString(),
        version: "debug-v2",
        eventType: stripeEvent.type,
        eventId: stripeEvent.id
      })
    };

  } catch (error) {
    console.error('❌ Webhook error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });

    // Still return 200 to acknowledge receipt to Stripe
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        received: true,
        error: error.message,
        processed: false
      })
    };
  }
};

async function handleCheckoutCompleted(session) {
  try {
    console.log('🎯 ENTERING handleCheckoutCompleted for session:', session.id);
    console.log('🔄 Processing checkout completed for session:', session.id);
    console.log('📋 Session data:', {
      id: session.id,
      customer: session.customer,
      customer_email: session.customer_email,
      subscription: session.subscription,
      metadata: session.metadata
    });

    const userEmail = session.customer_email || session.metadata?.user_email;
    const userId = session.metadata?.user_id;
    const planName = session.metadata?.plan_name;

    console.log('📧 Extracted data:', { userEmail, userId, planName });

    if (!userEmail) {
      console.error('❌ No user email found in session metadata');
      console.error('❌ Available session data:', JSON.stringify(session, null, 2));
      return;
    }

    // Find user in Airtable - prioritize email lookup since Auth0ID might be missing
    console.log('🔍 Searching for user with email:', userEmail, 'and userId:', userId);

    let users = [];
    // First try by email (more reliable)
    if (userEmail) {
      users = await base('Users').select({
        filterByFormula: `{Email} = '${userEmail}'`
      }).firstPage();

      if (users.length > 0) {
        console.log('✅ Found user by email:', userEmail);
      }
    }

    // If not found by email and we have userId, try by SupabaseID or Auth0ID
    if (users.length === 0 && userId) {
      console.log('🔄 Email search failed, trying SupabaseID or Auth0ID:', userId);
      users = await base('Users').select({
        filterByFormula: `OR({SupabaseID} = '${userId}', {Auth0ID} = '${userId}')`
      }).firstPage();

      if (users.length > 0) {
        console.log('✅ Found user by ID:', userId);
      }
    }

    if (users.length === 0) {
      console.error('❌ User not found:', { userEmail, userId });

      // Try to list some users to debug
      console.log('🔍 Debugging - listing available users...');
      try {
        const debugUsers = await base('Users').select({ maxRecords: 3 }).firstPage();
        console.log('Available users:', debugUsers.map(u => ({
          email: u.fields.Email,
          plan: u.fields.Plan
        })));
      } catch (debugError) {
        console.error('❌ Failed to list users for debugging:', debugError.message);
      }

      return;
    }

    const user = users[0];
    console.log('✅ Found user:', {
      id: user.id,
      email: user.fields.Email,
      currentPlan: user.fields.Plan
    });

    // Check if this is a one-time credit purchase by fetching line items
    const Stripe = require('stripe');
    const stripeKey = process.env.STRIPE_SECRET_KEY_SELIRA ||
                     process.env.STRIPE_SECRET_KEY ||
                     process.env.STRIPE_SELIRA_SECRET;
    const stripe = new Stripe(stripeKey);

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });

    if (lineItems.data.length > 0) {
      const price = await stripe.prices.retrieve(lineItems.data[0].price.id, {
        expand: ['product']
      });

      const productMetadata = price.product.metadata || {};
      console.log('🏷️ Product metadata:', productMetadata);

      // Check if this is a one-time credit purchase
      if (productMetadata.type === 'one_time_credits' && productMetadata.image_credits) {
        const creditsToAdd = parseInt(productMetadata.image_credits);
        console.log(`💳 One-time credit purchase detected: ${creditsToAdd} credits`);

        const currentPurchased = user.fields.image_credits_purchased || 0;
        const currentRemaining = user.fields.image_credits_remaining || 0;

        const updateData = {
          'image_credits_purchased': currentPurchased + creditsToAdd,
          'image_credits_remaining': currentRemaining + creditsToAdd,
          'stripe_customer_id': session.customer
        };

        console.log('🔄 Updating user credits:', {
          purchased: `${currentPurchased} → ${currentPurchased + creditsToAdd}`,
          remaining: `${currentRemaining} → ${currentRemaining + creditsToAdd}`
        });

        await base('Users').update(user.id, updateData);
        console.log(`✅ Added ${creditsToAdd} image credits to user`);
        return;
      }
    }

    // If not a one-time purchase, handle as subscription
    const updateData = {
      'Plan': planName || 'Basic',
      'stripe_customer_id': session.customer,
      'stripe_subscription_id': session.subscription,
      'plan_start_date': new Date().toISOString().split('T')[0],
      'subscription_status': 'active'
    };

    // Add plan_end_date if we have subscription data
    if (session.subscription) {
      // We'll get the actual end date from the subscription.updated event
      // For now, set a default end date (30 days from start for most subscriptions)
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      updateData.plan_end_date = endDate.toISOString().split('T')[0];
    }

    console.log('🔄 Updating user with data:', updateData);
    console.log('🔍 Session values:', {
      customer: session.customer,
      subscription: session.subscription,
      planName: planName
    });

    // Update user plan in Airtable
    try {
      const updateResult = await base('Users').update(user.id, updateData);

      console.log('✅ Airtable update successful:', {
        id: updateResult.id,
        updatedFields: Object.keys(updateData),
        resultFields: updateResult.fields
      });

      // Verify the update by checking specific fields
      console.log('✅ Verification - Updated values:', {
        Plan: updateResult.fields.Plan,
        stripe_customer_id: updateResult.fields.stripe_customer_id,
        stripe_subscription_id: updateResult.fields.stripe_subscription_id,
        subscription_status: updateResult.fields.subscription_status
      });

    } catch (updateError) {
      console.error('❌ Airtable update failed:', updateError);
      console.error('❌ Update error details:', {
        message: updateError.message,
        status: updateError.status,
        error: updateError.error
      });
      throw updateError;
    }

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
    console.log('🔍 Subscription metadata:', subscription.metadata);

    const customerId = subscription.customer;
    const userEmail = subscription.metadata?.user_email;
    const userId = subscription.metadata?.user_id;

    console.log('🔍 Looking for user with:', { customerId, userEmail, userId });

    // Try to find user by Stripe customer ID first
    let users = await base('Users').select({
      filterByFormula: `{stripe_customer_id} = '${customerId}'`
    }).firstPage();

    // If not found by customer ID, try by email from metadata
    if (users.length === 0 && userEmail) {
      console.log('🔄 User not found by customer ID, trying email:', userEmail);
      users = await base('Users').select({
        filterByFormula: `{Email} = '${userEmail}'`
      }).firstPage();
    }

    if (users.length === 0) {
      console.error('❌ User not found for customer:', customerId, 'or email:', userEmail);
      return;
    }

    const user = users[0];
    console.log('✅ Found user for subscription update:', user.fields.Email);

    // Update subscription details with most recent Stripe data
    const updateData = {
      'subscription_status': subscription.status,
      'stripe_customer_id': subscription.customer,
      'stripe_subscription_id': subscription.id
    };

    // Get dates from subscription - try multiple sources
    let startDate = null;
    let endDate = null;

    // First try current_period dates from subscription level
    if (subscription.current_period_start) {
      startDate = subscription.current_period_start;
    }
    if (subscription.current_period_end) {
      endDate = subscription.current_period_end;
    }

    // If not found, try subscription items (where they actually are in this case)
    if (!startDate || !endDate) {
      if (subscription.items && subscription.items.data && subscription.items.data.length > 0) {
        const firstItem = subscription.items.data[0];
        if (!startDate && firstItem.current_period_start) {
          startDate = firstItem.current_period_start;
        }
        if (!endDate && firstItem.current_period_end) {
          endDate = firstItem.current_period_end;
        }
      }
    }

    // Fallback to start_date if available
    if (!startDate && subscription.start_date) {
      startDate = subscription.start_date;
    }

    // Set the dates if we found them
    if (startDate) {
      updateData.plan_start_date = new Date(startDate * 1000).toISOString().split('T')[0];
      console.log('🗓️ Found start date:', startDate, '→', updateData.plan_start_date);
    }
    if (endDate) {
      updateData.plan_end_date = new Date(endDate * 1000).toISOString().split('T')[0];
      console.log('🗓️ Found end date:', endDate, '→', updateData.plan_end_date);
    }

    console.log('🔍 Date sources checked:', {
      subscription_current_period_start: subscription.current_period_start,
      subscription_current_period_end: subscription.current_period_end,
      subscription_start_date: subscription.start_date,
      first_item_period_start: subscription.items?.data?.[0]?.current_period_start,
      first_item_period_end: subscription.items?.data?.[0]?.current_period_end
    });

    // Add plan name if available in metadata
    if (subscription.metadata?.plan_name) {
      updateData.Plan = subscription.metadata.plan_name.charAt(0).toUpperCase() + subscription.metadata.plan_name.slice(1);
    }

    console.log('🔄 Updating user with subscription data:', updateData);

    await base('Users').update(user.id, updateData);

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