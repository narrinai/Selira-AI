const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get prediction ID from query parameters
    const predictionId = event.queryStringParameters?.predictionId || event.queryStringParameters?.jobId;

    if (!predictionId) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Missing predictionId or jobId parameter',
          usage: 'GET /.netlify/functions/replicate-check-status?predictionId=xxx'
        })
      };
    }

    console.log('📊 Checking Replicate prediction status:', predictionId);

    // Get Replicate API credentials
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN_SELIRA;

    if (!REPLICATE_API_TOKEN) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Replicate API token not configured'
        })
      };
    }

    // Check prediction status
    const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!statusResponse.ok) {
      console.error('❌ Status check failed:', statusResponse.status);
      const errorText = await statusResponse.text();
      return {
        statusCode: statusResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Failed to check prediction status',
          status: statusResponse.status,
          details: errorText
        })
      };
    }

    const prediction = await statusResponse.json();
    console.log('📊 Prediction status:', prediction.status);

    // Handle different status states
    if (prediction.status === 'succeeded') {
      console.log('✅ Video generation completed!');

      // Calculate cost and metrics
      const metrics = prediction.metrics || {};
      const totalTime = metrics.predict_time || 0;

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          status: 'completed',
          video: prediction.output, // Replicate returns video URL directly in output
          provider: 'Replicate (Hunyuan Video)',
          cost: '~$1.25',
          generation_time: Math.floor(totalTime),
          predictionId: predictionId
        })
      };
    } else if (prediction.status === 'failed') {
      console.error('❌ Prediction failed:', prediction.error);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          status: 'failed',
          error: 'Video generation failed on Replicate',
          details: prediction.error,
          predictionId: predictionId
        })
      };
    } else if (prediction.status === 'canceled') {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          status: 'canceled',
          error: 'Prediction was canceled',
          predictionId: predictionId
        })
      };
    } else if (prediction.status === 'starting' || prediction.status === 'processing') {
      // Still processing
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          status: 'processing',
          message: prediction.status === 'starting' ? 'Starting...' : 'Generating video...',
          predictionId: predictionId
        })
      };
    } else {
      // Unknown status
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          status: prediction.status.toLowerCase(),
          message: `Prediction status: ${prediction.status}`,
          predictionId: predictionId,
          rawStatus: prediction
        })
      };
    }

  } catch (error) {
    console.error('❌ Replicate status check error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
