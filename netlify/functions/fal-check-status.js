const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed - use GET or POST' })
    };
  }

  try {
    // Get request ID from POST body or query params
    let requestId;
    if (event.httpMethod === 'POST') {
      const requestData = JSON.parse(event.body || '{}');
      requestId = requestData.requestId || requestData.jobId;
    } else {
      requestId = event.queryStringParameters?.requestId || event.queryStringParameters?.jobId;
    }

    if (!requestId) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Missing requestId or jobId',
          usage: 'GET /.netlify/functions/fal-check-status?requestId=xxx OR POST with body: {"requestId": "xxx"}'
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

    // Try to get result directly (response_url) instead of status endpoint
    // The status endpoint returns 404, so we fetch the result directly
    const statusResponse = await fetch(`https://queue.fal.run/fal-ai/kling-video/v1/standard/text-to-video/requests/${requestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!statusResponse.ok) {
      // 404 or other errors - job might still be in queue
      if (statusResponse.status === 404) {
        console.log('⏳ Job not ready yet (404) - still in queue');
        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            status: 'processing',
            message: 'Job in queue...',
            requestId: requestId
          })
        };
      }

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

    const resultData = await statusResponse.json();
    console.log('📊 Full result data:', JSON.stringify(resultData, null, 2));

    // Check if there's a status field
    const status = resultData.status || resultData.state;
    console.log('📊 Request status:', status);

    // Handle different status states
    if (status === 'COMPLETED' || status === 'completed' || resultData.data?.video) {
      console.log('✅ Video generation completed!');

      // Extract video URL from result
      const videoUrl = resultData.data?.video?.url || resultData.video?.url || resultData.output?.video?.url;

      if (!videoUrl) {
        console.error('❌ No video URL in result:', resultData);
        throw new Error('No video URL found in completed result');
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          status: 'completed',
          video: videoUrl,
          provider: 'Fal.ai (Kling AI v1 Standard)',
          cost: '$0.225 per 5s',
          requestId: requestId
        })
      };
    } else if (status === 'FAILED' || status === 'failed') {
      console.error('❌ Request failed:', resultData.error);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          status: 'failed',
          error: 'Video generation failed on Fal.ai',
          details: resultData.error,
          requestId: requestId
        })
      };
    } else if (status === 'IN_PROGRESS' || status === 'in_progress' || status === 'IN_QUEUE' || status === 'in_queue') {
      // Still processing
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          status: 'processing',
          message: status === 'IN_QUEUE' || status === 'in_queue' ? 'Job in queue...' : 'Generating video...',
          requestId: requestId
        })
      };
    } else {
      // Unknown status or still processing
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          status: (status || 'processing').toLowerCase(),
          message: status ? `Request status: ${status}` : 'Processing...',
          requestId: requestId,
          rawStatus: resultData
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
