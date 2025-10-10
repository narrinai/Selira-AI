const crypto = require('crypto');

/**
 * Cryptomus Payment Status Checker
 * Manually checks the status of a Cryptomus payment
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get payment UUID or order_id from query params
    const { uuid, order_id } = event.queryStringParameters || {};

    if (!uuid && !order_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameter',
          details: 'Either uuid or order_id is required'
        })
      };
    }

    console.log('🔍 Checking payment status:', { uuid, order_id });

    // Get Cryptomus credentials
    const merchantId = process.env.CRYPTOMUS_MERCHANT_ID_SELIRA;
    const apiKey = process.env.CRYPTOMUS_PAYMENT_API_KEY_SELIRA;

    if (!merchantId || !apiKey) {
      console.error('❌ Missing Cryptomus configuration');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Cryptomus configuration missing' })
      };
    }

    // Prepare request data
    const requestData = uuid ? { uuid } : { order_id };

    // Create signature
    const sign = createSignature(requestData, apiKey);

    // Make request to Cryptomus API
    const response = await fetch('https://api.cryptomus.com/v1/payment/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant': merchantId,
        'sign': sign
      },
      body: JSON.stringify(requestData)
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
          error: 'Failed to check payment status',
          details: result.message || result.errors || 'Unknown error'
        })
      };
    }

    console.log('✅ Payment status retrieved:', result.result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        payment: {
          uuid: result.result.uuid,
          order_id: result.result.order_id,
          amount: result.result.amount,
          currency: result.result.currency,
          status: result.result.status,
          payment_status: result.result.payment_status,
          url: result.result.url,
          created_at: result.result.created_at,
          expired_at: result.result.expired_at
        }
      })
    };

  } catch (error) {
    console.error('❌ Check payment status error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to check payment status',
        details: error.message
      })
    };
  }
};

/**
 * Create signature for Cryptomus API request
 * Cryptomus signature: MD5(base64(JSON) + API_KEY)
 */
function createSignature(data, apiKey) {
  // Convert data to JSON string (NO sorting - use original order)
  const jsonString = JSON.stringify(data);

  // Encode JSON to base64
  const base64Data = Buffer.from(jsonString).toString('base64');

  // Create MD5 hash of: base64(JSON) + API_KEY
  const signString = base64Data + apiKey;
  const hash = crypto.createHash('md5').update(signString).digest('hex');

  return hash;
}
