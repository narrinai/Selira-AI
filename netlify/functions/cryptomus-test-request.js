const crypto = require('crypto');

/**
 * Test endpoint to make a minimal Cryptomus API request and see the exact response
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const merchantId = process.env.CRYPTOMUS_MERCHANT_ID_SELIRA;
    const apiKey = process.env.CRYPTOMUS_PAYMENT_API_KEY_SELIRA;

    // Create minimal test invoice data
    const invoiceData = {
      amount: "10.00",
      currency: "USD",
      order_id: `test_${Date.now()}`
    };

    console.log('📦 Test invoice data:', invoiceData);

    // Create signature
    const jsonString = JSON.stringify(invoiceData);
    const base64Data = Buffer.from(jsonString).toString('base64');
    const signString = base64Data + apiKey;
    const sign = crypto.createHash('md5').update(signString).digest('hex');

    console.log('🔐 Signature details:', {
      jsonString,
      base64Data,
      signatureLength: sign.length,
      signature: sign
    });

    // Make request
    const requestHeaders = {
      'Content-Type': 'application/json',
      'merchant': merchantId,
      'sign': sign
    };

    console.log('📤 Request headers:', {
      'Content-Type': requestHeaders['Content-Type'],
      'merchant': merchantId,
      'sign': sign
    });

    const response = await fetch('https://api.cryptomus.com/v1/payment', {
      method: 'POST',
      headers: requestHeaders,
      body: jsonString
    });

    const responseText = await response.text();

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('📥 Response body:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw: responseText };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        request: {
          url: 'https://api.cryptomus.com/v1/payment',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'merchant': merchantId.substring(0, 10) + '...',
            'sign': sign.substring(0, 20) + '...'
          },
          body: invoiceData
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        },
        debug: {
          jsonString,
          base64Data,
          signatureLength: sign.length,
          fullSignature: sign
        }
      }, null, 2)
    };

  } catch (error) {
    console.error('❌ Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};
