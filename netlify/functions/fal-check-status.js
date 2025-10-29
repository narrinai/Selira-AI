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
    // Get request ID from query parameters
    const requestId = event.queryStringParameters?.requestId || event.queryStringParameters?.jobId;

    if (!requestId) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Missing requestId or jobId parameter',
          usage: 'GET /.netlify/functions/fal-check-status?requestId=xxx'
        })
      };
    }

    console.log('📊 Checking Fal.ai request status:', requestId);

    // Get Fal.ai API credentials
    const FAL_API_KEY = process.env.FAL_API_KEY_SELIRA || process.env.FAL_API_KEY;

    if (!FAL_API_KEY) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Fal.ai API key not configured'
        })
      };
    }

    // Check request status - Fal.ai uses /requests/{id}/status endpoint
    const statusResponse = await fetch(`https://fal.run/fal-ai/kling-video/v1/standard/text-to-video/requests/${requestId}/status`, {
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
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
          error: 'Failed to check request status',
          status: statusResponse.status,
          details: errorText
        })
      };
    }

    const statusData = await statusResponse.json();
    console.log('📊 Request status:', statusData.status);

    // Handle different status states
    if (statusData.status === 'COMPLETED' || statusData.status === 'completed') {
      console.log('✅ Video generation completed!');

      // Get the video URL from the completed request
      const resultResponse = await fetch(`https://fal.run/fal-ai/kling-video/v1/standard/text-to-video/requests/${requestId}`, {
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const resultData = await resultResponse.json();

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          status: 'completed',
          video: resultData.data?.video?.url || resultData.video?.url,
          provider: 'Fal.ai (Kling AI)',
          cost: '$0.50',
          requestId: requestId
        })
      };
    } else if (statusData.status === 'FAILED' || statusData.status === 'failed') {
      console.error('❌ Request failed:', statusData.error);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          status: 'failed',
          error: 'Video generation failed on Fal.ai',
          details: statusData.error,
          requestId: requestId
        })
      };
    } else if (statusData.status === 'IN_PROGRESS' || statusData.status === 'in_progress' || statusData.status === 'IN_QUEUE' || statusData.status === 'in_queue') {
      // Still processing
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          status: 'processing',
          message: statusData.status === 'IN_QUEUE' || statusData.status === 'in_queue' ? 'Job in queue...' : 'Generating video...',
          requestId: requestId
        })
      };
    } else {
      // Unknown status
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          status: (statusData.status || 'unknown').toLowerCase(),
          message: `Request status: ${statusData.status}`,
          requestId: requestId,
          rawStatus: statusData
        })
      };
    }

  } catch (error) {
    console.error('❌ Fal.ai status check error:', error);
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
