// Check status of video generation prediction on Replicate

exports.handler = async (event, context) => {
  console.log('🔍 Check video status function called');

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN_SELIRA || process.env.REPLICATE_API_TOKEN;

  if (!REPLICATE_API_TOKEN) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Replicate API token not configured' })
    };
  }

  try {
    const { predictionId } = JSON.parse(event.body || '{}');

    if (!predictionId) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing predictionId parameter' })
      };
    }

    console.log('🔍 Checking status for prediction:', predictionId);

    // Check prediction status on Replicate
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Replicate API error:', errorText);
      throw new Error(`Replicate API error ${response.status}: ${errorText}`);
    }

    const prediction = await response.json();

    console.log('📊 Prediction status:', prediction.status);

    // Return status to client
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: prediction.status,
        output: prediction.output,
        error: prediction.error,
        logs: prediction.logs
      })
    };

  } catch (error) {
    console.error('❌ Check video status error:', error);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Failed to check video status',
        details: error.message
      })
    };
  }
};
