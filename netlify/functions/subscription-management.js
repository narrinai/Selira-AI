// Subscription Management Netlify Function
// Replaces Make.com webhook for subscription operations

const crypto = require('crypto');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing Airtable configuration' })
    };
  }

  try {
    const requestData = JSON.parse(event.body);
    const { action } = requestData;

    console.log('🔄 Subscription management request:', { action });

    switch (action) {
      case 'upgrade':
        return await handleUpgrade(requestData, headers, AIRTABLE_BASE_ID, AIRTABLE_TOKEN);
      
      case 'downgrade':
        return await handleDowngrade(requestData, headers, AIRTABLE_BASE_ID, AIRTABLE_TOKEN);
      
      case 'cancel':
        return await handleCancellation(requestData, headers, AIRTABLE_BASE_ID, AIRTABLE_TOKEN);
        
      case 'stripe_webhook':
        return await handleStripeWebhook(event, headers, AIRTABLE_BASE_ID, AIRTABLE_TOKEN, STRIPE_WEBHOOK_SECRET);

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action specified' })
        };
    }

  } catch (error) {
    console.error('❌ Subscription management error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};

// Handle subscription upgrade
async function handleUpgrade(requestData, headers, baseId, token) {
  try {
    const { user_uid, email, new_plan, stripe_customer_id, subscription_id } = requestData;

    console.log('📈 Processing upgrade:', { user_uid, email, new_plan });

    // Find user in Airtable
    let filterFormula = `{User_UID}='${user_uid}'`;
    if (!user_uid && email) {
      filterFormula = `{Email}='${email}'`;
    }

    const findUrl = `https://api.airtable.com/v0/${baseId}/Users?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`;
    
    const findResponse = await fetch(findUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const findData = await findResponse.json();
    
    if (findData.records.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found for upgrade' })
      };
    }

    const userId = findData.records[0].id;
    
    // Update user subscription
    const updateUrl = `https://api.airtable.com/v0/${baseId}/Users/${userId}`;
    
    const updateData = {
      fields: {
        Plan: new_plan,
        Subscription_Status: 'active',
        Stripe_Customer_ID: stripe_customer_id,
        Subscription_ID: subscription_id,
        Upgraded_At: new Date().toISOString(),
        Trial_End_Date: null // Clear trial end date on upgrade
      }
    };

    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      throw new Error(`Upgrade update failed: ${updateResponse.status}`);
    }

    console.log('✅ User upgraded successfully');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Subscription upgraded successfully',
        new_plan: new_plan
      })
    };

  } catch (error) {
    console.error('❌ Upgrade error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process upgrade' })
    };
  }
}

// Handle subscription downgrade/cancellation
async function handleDowngrade(requestData, headers, baseId, token) {
  try {
    const { user_uid, email, reason } = requestData;

    console.log('📉 Processing downgrade:', { user_uid, email, reason });

    // Find user in Airtable
    let filterFormula = `{User_UID}='${user_uid}'`;
    if (!user_uid && email) {
      filterFormula = `{Email}='${email}'`;
    }

    const findUrl = `https://api.airtable.com/v0/${baseId}/Users?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`;
    
    const findResponse = await fetch(findUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const findData = await findResponse.json();
    
    if (findData.records.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found for downgrade' })
      };
    }

    const userId = findData.records[0].id;
    
    // Update user subscription to Free
    const updateUrl = `https://api.airtable.com/v0/${baseId}/Users/${userId}`;
    
    const updateData = {
      fields: {
        Plan: 'Free',
        Subscription_Status: 'cancelled',
        Cancelled_At: new Date().toISOString(),
        Cancellation_Reason: reason || 'User requested',
        Message_Count: 0 // Reset daily message count
      }
    };

    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      throw new Error(`Downgrade update failed: ${updateResponse.status}`);
    }

    console.log('✅ User downgraded successfully');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Subscription downgraded to Free plan',
        new_plan: 'Free'
      })
    };

  } catch (error) {
    console.error('❌ Downgrade error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process downgrade' })
    };
  }
}

// Handle subscription cancellation (immediate)
async function handleCancellation(requestData, headers, baseId, token) {
  try {
    const { user_uid, email, immediate = true } = requestData;

    console.log('🚫 Processing cancellation:', { user_uid, email, immediate });

    // Use downgrade logic for immediate cancellation
    return await handleDowngrade({
      user_uid,
      email,
      reason: immediate ? 'Immediate cancellation' : 'End of billing period'
    }, headers, baseId, token);

  } catch (error) {
    console.error('❌ Cancellation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process cancellation' })
    };
  }
}

// Handle Stripe webhook events
async function handleStripeWebhook(event, headers, baseId, token, webhookSecret) {
  try {
    // Verify Stripe webhook signature if secret is provided
    if (webhookSecret) {
      const signature = event.headers['stripe-signature'];
      if (!signature) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing Stripe signature' })
        };
      }

      // TODO: Implement proper Stripe signature verification
      // This requires the raw body, which might need adjustment
      console.log('⚠️ Stripe signature verification not implemented');
    }

    const stripeEvent = JSON.parse(event.body);
    console.log('🔔 Stripe webhook event:', stripeEvent.type);

    switch (stripeEvent.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        return await handleSubscriptionUpdate(stripeEvent, headers, baseId, token);
      
      case 'customer.subscription.deleted':
        return await handleSubscriptionCancelled(stripeEvent, headers, baseId, token);
      
      case 'invoice.payment_succeeded':
        return await handlePaymentSucceeded(stripeEvent, headers, baseId, token);
        
      case 'invoice.payment_failed':
        return await handlePaymentFailed(stripeEvent, headers, baseId, token);

      default:
        console.log('ℹ️ Unhandled Stripe event type:', stripeEvent.type);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ received: true })
        };
    }

  } catch (error) {
    console.error('❌ Stripe webhook error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process Stripe webhook' })
    };
  }
}

// Handle subscription updates from Stripe
async function handleSubscriptionUpdate(stripeEvent, headers, baseId, token) {
  try {
    const subscription = stripeEvent.data.object;
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;
    const status = subscription.status;

    console.log('🔄 Stripe subscription update:', { customerId, subscriptionId, status });

    // Find user by Stripe customer ID
    const filterFormula = `{Stripe_Customer_ID}='${customerId}'`;
    const findUrl = `https://api.airtable.com/v0/${baseId}/Users?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`;
    
    const findResponse = await fetch(findUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const findData = await findResponse.json();
    
    if (findData.records.length === 0) {
      console.warn('⚠️ User not found for Stripe customer:', customerId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ received: true, warning: 'User not found' })
      };
    }

    const userId = findData.records[0].id;
    
    // Determine plan based on subscription
    let plan = 'Free';
    if (status === 'active' || status === 'trialing') {
      // You can determine the plan from subscription.items or price ID
      plan = 'Engage'; // Default to Engage for active subscriptions
    }

    // Update user subscription status
    const updateUrl = `https://api.airtable.com/v0/${baseId}/Users/${userId}`;
    
    const updateData = {
      fields: {
        Plan: plan,
        Subscription_Status: status,
        Subscription_ID: subscriptionId,
        Last_Stripe_Update: new Date().toISOString()
      }
    };

    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      throw new Error(`Stripe update failed: ${updateResponse.status}`);
    }

    console.log('✅ User subscription updated from Stripe');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('❌ Stripe subscription update error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update subscription' })
    };
  }
}

// Handle subscription cancelled from Stripe
async function handleSubscriptionCancelled(stripeEvent, headers, baseId, token) {
  try {
    const subscription = stripeEvent.data.object;
    const customerId = subscription.customer;

    return await handleDowngrade({
      stripe_customer_id: customerId,
      reason: 'Stripe subscription cancelled'
    }, headers, baseId, token);

  } catch (error) {
    console.error('❌ Stripe cancellation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process cancellation' })
    };
  }
}

// Handle successful payment
async function handlePaymentSucceeded(stripeEvent, headers, baseId, token) {
  console.log('💰 Payment succeeded');
  // Could implement payment history tracking here
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ received: true })
  };
}

// Handle failed payment
async function handlePaymentFailed(stripeEvent, headers, baseId, token) {
  console.log('❌ Payment failed');
  // Could implement failed payment handling here
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ received: true })
  };
}