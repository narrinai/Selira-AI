// Create NOWPayments invoice for crypto payments
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { planType, userEmail, userId } = JSON.parse(event.body);

    console.log('📥 Creating NOWPayments invoice:', { planType, userEmail, userId });

    // Validate input
    if (!planType || !userEmail || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required fields: planType, userEmail, userId'
        })
      };
    }

    // Plan pricing (one-off image credit packs)
    const plans = {
      light: { name: 'Light Pack', price: 5.99, credits: 50 },
      basic: { name: 'Basic Pack', price: 9.99, credits: 100 },
      premium: { name: 'Premium Pack', price: 19.99, credits: 250 }
    };

    const plan = plans[planType];
    if (!plan) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid plan type' })
      };
    }

    // Get NOWPayments API key from environment
    const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY_SELIRA;
    if (!NOWPAYMENTS_API_KEY) {
      console.error('❌ NOWPAYMENTS_API_KEY_SELIRA not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Payment service not configured',
          details: 'NOWPAYMENTS_API_KEY_SELIRA missing in environment variables'
        })
      };
    }

    // Create unique order ID
    const orderId = `selira_${planType}_${userId}_${Date.now()}`;

    // Create invoice via NOWPayments API
    const invoiceData = {
      price_amount: plan.price,
      price_currency: 'usd',
      order_id: orderId,
      order_description: `Selira AI ${plan.name} - ${plan.credits} Image Credits`,
      ipn_callback_url: `${process.env.URL}/.netlify/functions/nowpayments-webhook`,
      success_url: `${process.env.URL}/profile?payment=success&credits=${plan.credits}`,
      cancel_url: `${process.env.URL}/pricing?tab=oneoff`,
      // Store metadata for webhook processing
      case: JSON.stringify({
        userId: userId,
        userEmail: userEmail,
        planType: planType,
        credits: plan.credits
      })
    };

    console.log('📤 Sending invoice request to NOWPayments:', invoiceData);

    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    });

    const result = await response.json();

    console.log('📊 NOWPayments response:', {
      status: response.status,
      ok: response.ok,
      id: result.id,
      invoice_url: result.invoice_url
    });

    if (!response.ok) {
      console.error('❌ NOWPayments API error:', result);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: 'Failed to create payment invoice',
          details: result.message || result.error || 'Unknown error',
          code: result.code
        })
      };
    }

    // Return invoice URL to redirect user
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        invoice_url: result.invoice_url,
        invoice_id: result.id,
        order_id: orderId
      })
    };

  } catch (error) {
    console.error('❌ Error creating NOWPayments invoice:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};
