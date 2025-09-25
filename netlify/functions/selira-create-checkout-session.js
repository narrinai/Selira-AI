const Stripe = require('stripe');

exports.handler = async (event, context) => {
  // CORS headers
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { priceId, userEmail, userId, planName, successUrl, cancelUrl } = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!priceId || !userEmail || !userId || !successUrl || !cancelUrl) {
      console.error('❌ Missing required fields:', {
        priceId: !!priceId,
        userEmail: !!userEmail,
        userId: !!userId,
        successUrl: !!successUrl,
        cancelUrl: !!cancelUrl
      });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          details: 'priceId, userEmail, userId, successUrl, and cancelUrl are required'
        })
      };
    }

    // Initialize Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY_SELIRA || process.env.STRIPE_SECRET_KEY;
    const stripe = new Stripe(stripeKey);

    if (!stripeKey) {
      console.error('❌ Missing Stripe configuration');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Stripe configuration missing' })
      };
    }

    console.log('🔄 Creating checkout session for:', { userEmail, planName, priceId });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: userEmail,
      metadata: {
        user_id: userId,
        user_email: userEmail,
        plan_name: planName || 'unknown'
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          user_email: userEmail,
          plan_name: planName || 'unknown'
        }
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    console.log('✅ Checkout session created:', session.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sessionId: session.id,
        sessionUrl: session.url
      })
    };

  } catch (error) {
    console.error('❌ Create checkout session error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create checkout session',
        details: error.message
      })
    };
  }
};