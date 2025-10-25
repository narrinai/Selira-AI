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
    // Get job ID from query parameters
    const jobId = event.queryStringParameters?.jobId;

    if (!jobId) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Missing jobId parameter',
          usage: 'GET /.netlify/functions/runpod-check-status?jobId=xxx'
        })
      };
    }

    console.log('📊 Checking RunPod job status:', jobId);

    // Get RunPod API credentials
    const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY_SELIRA || process.env.RUNPOD_API_KEY;
    const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || process.env.RUNPOD_ANIMATEDIFF_ENDPOINT_ID;

    if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'RunPod API credentials not configured'
        })
      };
    }

    // Check job status
    const statusResponse = await fetch(`https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/status/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`
      }
    });

    if (!statusResponse.ok) {
      console.error('❌ Status check failed:', statusResponse.status);
      return {
        statusCode: statusResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Failed to check job status',
          status: statusResponse.status
        })
      };
    }

    const responseText = await statusResponse.text();
    let statusData;

    try {
      statusData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse status response:', responseText);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Invalid response from RunPod',
          details: responseText
        })
      };
    }

    console.log('📊 Job status:', statusData.status);

    // Handle different status states
    if (statusData.status === 'COMPLETED') {
      console.log('✅ Video generation completed!');

      // Calculate approximate cost (executionTime is in milliseconds)
      const executionTimeMs = statusData.executionTime || 60000;
      const executionTimeSec = Math.floor(executionTimeMs / 1000);
      // RunPod GPU cost: ~$0.00025 per second
      const estimatedCost = (executionTimeSec * 0.00025).toFixed(4);

      // Extract video data - Wan2.2 returns base64 encoded video
      let videoData = statusData.output;

      // Handle different output formats
      if (typeof videoData === 'object' && videoData.video) {
        // Base64 encoded video
        videoData = `data:video/mp4;base64,${videoData.video}`;
      } else if (typeof videoData === 'string' && videoData.startsWith('http')) {
        // Already a URL
        videoData = videoData;
      } else if (typeof videoData === 'string') {
        // Assume base64 string
        videoData = `data:video/mp4;base64,${videoData}`;
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          status: 'completed',
          video: videoData,
          provider: 'RunPod Serverless (Wan2.2)',
          cost: `~$${estimatedCost}`,
          generation_time: executionTimeSec,
          jobId: jobId
        })
      };
    } else if (statusData.status === 'FAILED') {
      console.error('❌ Job failed:', statusData.error);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          status: 'failed',
          error: 'Video generation failed on RunPod',
          details: statusData.error,
          jobId: jobId
        })
      };
    } else if (statusData.status === 'IN_PROGRESS' || statusData.status === 'IN_QUEUE') {
      // Still processing
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          status: 'processing',
          message: statusData.status === 'IN_QUEUE' ? 'Job in queue...' : 'Generating video...',
          jobId: jobId
        })
      };
    } else {
      // Unknown status
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          status: statusData.status.toLowerCase(),
          message: `Job status: ${statusData.status}`,
          jobId: jobId,
          rawStatus: statusData
        })
      };
    }

  } catch (error) {
    console.error('❌ RunPod status check error:', error);
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
