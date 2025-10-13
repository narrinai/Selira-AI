const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const predictionId = event.queryStringParameters?.id;

    if (!predictionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prediction ID required' })
      };
    }

    const apiKey = process.env.REPLICATE_API_TOKEN_SELIRA;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    console.log('📊 Polling prediction:', predictionId);

    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    console.log('Status:', data.status);

    const outputUrl = data.output ? (Array.isArray(data.output) ? data.output[0] : data.output) : null;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        status: data.status,
        output: outputUrl,
        error: data.error || null
      })
    };

  } catch (error) {
    console.error('❌ Poll error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
