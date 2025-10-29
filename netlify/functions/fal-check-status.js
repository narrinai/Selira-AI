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

    // Check request status using Queue API
    const statusResponse = await fetch(`https://queue.fal.run/fal-ai/kling-video/v2.1/master/text-to-video/requests/${requestId}/status`, {
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

      // Get the video URL from the completed request using Queue API
      const resultResponse = await fetch(`https://queue.fal.run/fal-ai/kling-video/v2.1/master/text-to-video/requests/${requestId}`, {
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!resultResponse.ok) {
        console.error('❌ Failed to fetch result:', resultResponse.status);
        const errorText = await resultResponse.text();
        throw new Error(`Failed to fetch result: ${errorText}`);
      }

      const resultData = await resultResponse.json();
      console.log('📊 Result data:', JSON.stringify(resultData, null, 2));

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
          provider: 'Fal.ai (Kling AI v2.1 Master)',
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
