/**
 * Debug endpoint to check Cryptomus configuration
 * DO NOT USE IN PRODUCTION - ONLY FOR TESTING
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

    // Check all environment variables
    const allEnvVars = Object.keys(process.env).filter(key =>
      key.includes('CRYPTOMUS') || key.includes('AIRTABLE')
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        config: {
          hasMerchantId: !!merchantId,
          merchantIdLength: merchantId?.length || 0,
          merchantIdPreview: merchantId ? merchantId.substring(0, 10) + '...' : 'MISSING',
          hasApiKey: !!apiKey,
          apiKeyLength: apiKey?.length || 0,
          apiKeyPreview: apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING'
        },
        availableEnvVars: allEnvVars,
        allEnvKeys: Object.keys(process.env).length
      })
    };

  } catch (error) {
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
