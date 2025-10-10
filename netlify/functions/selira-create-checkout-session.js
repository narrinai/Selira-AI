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
    const { priceId, userEmail, userId, planName, successUrl, cancelUrl, mode } = JSON.parse(event.body || '{}');

    // Extract FirstPromoter tracking ID from cookies
    const cookies = event.headers.cookie || '';
    const fpTidMatch = cookies.match(/_fprom_tid=([^;]+)/);
    const fpTid = fpTidMatch ? fpTidMatch[1] : null;

    if (fpTid) {
      console.log('🎯 FirstPromoter tracking ID found:', fpTid);
    }

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

    // Initialize Stripe - try multiple possible environment variable names
    const stripeKey = process.env.STRIPE_SECRET_KEY_SELIRA ||
                     process.env.STRIPE_SECRET_KEY ||
                     process.env.STRIPE_SELIRA_SECRET;

    console.log('🔍 Checking Stripe keys:', {
      hasSeliraKey: !!process.env.STRIPE_SECRET_KEY_SELIRA,
      hasStandardKey: !!process.env.STRIPE_SECRET_KEY,
      hasSeliraSecret: !!process.env.STRIPE_SELIRA_SECRET
    });

    if (!stripeKey) {
      console.error('❌ Missing Stripe configuration - no valid key found');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Stripe configuration missing' })
      };
    }

    const stripe = new Stripe(stripeKey);

    // Determine mode - default to subscription for backward compatibility
    const checkoutMode = mode || 'subscription';
    console.log('🔄 Creating checkout session for:', { userEmail, planName, priceId, mode: checkoutMode });

    // Build session config based on mode
    const sessionConfig = {
      payment_method_types: ['card', 'paypal'],
      // Apple Pay and Google Pay appear automatically on compatible devices
      // when 'card' is in payment_method_types
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: checkoutMode,
      customer_email: userEmail,
      metadata: {
        user_id: userId,
        user_email: userEmail,
        plan_name: planName || 'unknown',
        ...(fpTid && { fp_tid: fpTid }) // Add FirstPromoter tracking ID if available
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // Don't configure payment_method_options at all - let Stripe handle it automatically
      // This allows Apple Pay to use its own authentication (Face ID/Touch ID)
      // instead of forcing 3D Secure which causes authentication_required errors
    };

    // Add subscription_data only for subscription mode
    if (checkoutMode === 'subscription') {
      sessionConfig.subscription_data = {
        metadata: {
          user_id: userId,
          user_email: userEmail,
          plan_name: planName || 'unknown',
          ...(fpTid && { fp_tid: fpTid }) // Add FirstPromoter tracking ID if available
        }
      };
      // Don't force payment method collection - let Stripe decide
      // This prevents Apple Pay authentication conflicts
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

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