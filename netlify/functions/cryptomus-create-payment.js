const crypto = require('crypto');

/**
 * Cryptomus Payment Creation Function
 * Creates a crypto payment invoice for subscriptions or one-time purchases
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

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
    const { amount, currency, userEmail, userId, planName, orderId, isSubscription } = JSON.parse(event.body || '{}');

    console.log('🔄 Creating Cryptomus payment:', { amount, currency, userEmail, planName, orderId });

    // Validate required fields
    if (!amount || !currency || !userEmail || !userId || !orderId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          details: 'amount, currency, userEmail, userId, and orderId are required'
        })
      };
    }

    // Get Cryptomus credentials
    const merchantId = process.env.CRYPTOMUS_MERCHANT_ID_SELIRA;
    const apiKey = process.env.CRYPTOMUS_PAYMENT_API_KEY_SELIRA;

    console.log('🔑 Checking credentials:', {
      hasMerchantId: !!merchantId,
      merchantIdLength: merchantId?.length,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length,
      merchantIdPreview: merchantId ? merchantId.substring(0, 8) + '...' : 'MISSING',
      apiKeyPreview: apiKey ? apiKey.substring(0, 8) + '...' : 'MISSING'
    });

    if (!merchantId || !apiKey) {
      console.error('❌ Missing Cryptomus configuration');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Cryptomus configuration missing',
          details: {
            hasMerchantId: !!merchantId,
            hasApiKey: !!apiKey
          }
        })
      };
    }

    // Prepare invoice data
    const invoiceData = {
      amount: amount.toString(),
      currency: currency,
      order_id: orderId,
      url_callback: `${process.env.URL || 'https://selira.ai'}/.netlify/functions/cryptomus-webhook`,
      url_success: `${process.env.URL || 'https://selira.ai'}/profile?payment=success&provider=crypto`,
      url_return: `${process.env.URL || 'https://selira.ai'}/pricing?tab=${isSubscription ? 'subscriptions' : 'oneoff'}`,
      is_payment_multiple: false,
      lifetime: 3600, // 1 hour expiry
      to_currency: currency, // Keep same currency (USD)
      subtitle: `${planName || 'Selira AI'} - ${userEmail}`,
      additional_data: JSON.stringify({
        user_id: userId,
        user_email: userEmail,
        plan_name: planName,
        is_subscription: isSubscription || false
      })
    };

    console.log('📦 Invoice data prepared:', invoiceData);

    // Create signature for API request
    const sign = createSignature(invoiceData, apiKey);

    console.log('🔐 Request details:', {
      url: 'https://api.cryptomus.com/v1/payment',
      merchantId: merchantId.substring(0, 8) + '...',
      signatureLength: sign.length,
      signature: sign.substring(0, 16) + '...'
    });

    // Make request to Cryptomus API
    const response = await fetch('https://api.cryptomus.com/v1/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant': merchantId,
        'sign': sign
      },
      body: JSON.stringify(invoiceData)
    });

    const responseText = await response.text();
    console.log('📊 Cryptomus API raw response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse Cryptomus response:', parseError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Invalid response from payment provider',
          details: responseText
        })
      };
    }

    if (!response.ok || result.state !== 0) {
      console.error('❌ Cryptomus API error:', result);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: 'Failed to create payment',
          details: result.message || result.errors || 'Unknown error'
        })
      };
    }

    console.log('✅ Cryptomus payment created:', result.result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        paymentUrl: result.result.url,
        paymentId: result.result.uuid,
        orderId: result.result.order_id,
        amount: result.result.amount,
        currency: result.result.currency
      })
    };

  } catch (error) {
    console.error('❌ Create Cryptomus payment error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create crypto payment',
        details: error.message
      })
    };
  }
};

/**
 * Create signature for Cryptomus API request
 * Cryptomus signature: MD5(base64(JSON) + API_KEY)
 * @param {Object} data - Request data
 * @param {string} apiKey - API key
 * @returns {string} - MD5 hash signature
 */
function createSignature(data, apiKey) {
  // Convert data to JSON string (NO sorting - use original order)
  const jsonString = JSON.stringify(data);

  // Encode JSON to base64
  const base64Data = Buffer.from(jsonString).toString('base64');

  // Create MD5 hash of: base64(JSON) + API_KEY
  const signString = base64Data + apiKey;
  const hash = crypto.createHash('md5').update(signString).digest('hex');

  console.log('🔐 Signature created:', {
    jsonLength: jsonString.length,
    base64Length: base64Data.length,
    hashLength: hash.length
  });

  return hash;
}
