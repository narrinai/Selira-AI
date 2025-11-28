// Create Cryptomus invoice for crypto payments
const crypto = require('crypto');
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

    console.log('📥 Creating Cryptomus invoice:', { planType, userEmail, userId });

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
      light: { name: 'Light Pack', price: '5.99', credits: 50 },
      basic: { name: 'Basic Pack', price: '9.99', credits: 100 },
      premium: { name: 'Premium Pack', price: '19.99', credits: 250 }
    };

    const plan = plans[planType];
    if (!plan) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid plan type' })
      };
    }

    // Get Cryptomus credentials from environment
    const MERCHANT_ID = process.env.CRYPTOMUS_MERCHANT_ID_SELIRA;
    const API_KEY = process.env.CRYPTOMUS_PAYMENT_API_KEY_SELIRA;

    if (!MERCHANT_ID || !API_KEY) {
      console.error('❌ Cryptomus credentials not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Payment service not configured',
          details: 'Cryptomus credentials missing in environment variables'
        })
      };
    }

    // Create unique order ID with embedded metadata
    // Format: selira_{planType}_{credits}_{userId}_{timestamp}
    const orderId = `selira_${planType}_${plan.credits}_${userId}_${Date.now()}`;

    // Prepare invoice data
    const invoiceData = {
      amount: plan.price,
      currency: 'USD',
      order_id: orderId,
      url_callback: `${process.env.URL}/.netlify/functions/cryptomus-webhook`,
      url_success: `${process.env.URL}/profile?payment=success&credits=${plan.credits}`,
      url_return: `${process.env.URL}/pricing?tab=oneoff`,
      lifetime: 3600, // 1 hour validity
      additional_data: JSON.stringify({
        userEmail,
        userId,
        planType,
        credits: plan.credits
      })
    };

    console.log('📤 Sending invoice request to Cryptomus:', invoiceData);

    // Generate signature: MD5(base64(json_body) + api_key)
    const dataString = JSON.stringify(invoiceData);
    const base64Data = Buffer.from(dataString).toString('base64');
    const sign = crypto
      .createHash('md5')
      .update(base64Data + API_KEY)
      .digest('hex');

    const response = await fetch('https://api.cryptomus.com/v1/payment', {
      method: 'POST',
      headers: {
        'merchant': MERCHANT_ID,
        'sign': sign,
        'Content-Type': 'application/json'
      },
      body: dataString
    });

    const result = await response.json();

    console.log('📊 Cryptomus response:', {
      status: response.status,
      ok: response.ok,
      state: result.state,
      uuid: result.result?.uuid,
      url: result.result?.url
    });

    if (!response.ok || result.state !== 0) {
      console.error('❌ Cryptomus API error:', result);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: 'Failed to create payment invoice',
          details: result.message || result.error || 'Unknown error',
          state: result.state
        })
      };
    }

    // Return invoice URL to redirect user
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        invoice_url: result.result.url,
        invoice_id: result.result.uuid,
        order_id: orderId
      })
    };

  } catch (error) {
    console.error('❌ Error creating Cryptomus invoice:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};
