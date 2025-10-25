const fetch = require('node-fetch');

exports.handler = async (event, context) => {
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

  try {
    // Parse request body
    const requestData = JSON.parse(event.body);

    console.log('🚀 Generating video with RunPod Serverless...');
    console.log('Request data:', JSON.stringify(requestData, null, 2));

    // Get RunPod API credentials from environment variables
    const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY_SELIRA || process.env.RUNPOD_API_KEY;
    const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || process.env.RUNPOD_ANIMATEDIFF_ENDPOINT_ID;

    if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'RunPod API credentials not configured',
          details: 'Set RUNPOD_API_KEY_SELIRA and RUNPOD_ENDPOINT_ID in Netlify environment variables'
        })
      };
    }

    // Parse resolution
    const [width, height] = (requestData.resolution || '512x512').split('x').map(Number);

    const seed = (requestData.seed === -1 || requestData.seed === undefined)
      ? Math.floor(Math.random() * 1000000)
      : parseInt(requestData.seed);

    // Build RunPod serverless request for Wan2.2
    // Based on official Wan2.2 API docs
    const runpodInput = {
      input: {
        image_url: requestData.image_url,
        prompt: requestData.prompt,
        seed: seed,
        cfg: requestData.guidance_scale || 2.0,  // Wan2.2 uses 'cfg' (default 2.0)
        width: width,
        height: height,
        length: requestData.num_frames || 81,  // Wan2.2 uses 'length' for frame count
        steps: requestData.steps || 10,  // Default 10 steps
        context_overlap: 48
      }
    };

    console.log('📡 Calling RunPod serverless endpoint...');
    console.log('Endpoint ID:', RUNPOD_ENDPOINT_ID);
    console.log('Input being sent:', JSON.stringify(runpodInput, null, 2));

    // Call RunPod serverless API
    // https://docs.runpod.io/serverless/endpoints/send-requests
    const response = await fetch(`https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(runpodInput)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ RunPod API error:');
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Error Body:', errorText);
      return {
        statusCode: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Failed to start video generation on RunPod',
          status: response.status,
          statusText: response.statusText,
          details: errorText
        })
      };
    }

    const result = await response.json();
    console.log('📊 RunPod response:', JSON.stringify(result, null, 2));

    const jobId = result.id;

    if (!jobId) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'No job ID returned from RunPod',
          details: result
        })
      };
    }

    // Return job ID immediately for async polling
    // Frontend will poll /runpod-check-status?jobId=xxx
    return {
      statusCode: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        status: 'processing',
        jobId: jobId,
        message: 'Video generation started. Poll /runpod-check-status?jobId=' + jobId + ' for status',
        estimatedTime: '1-3 minutes'
      })
    };

    /* OLD SYNC POLLING CODE - keeping for reference
    const maxWaitTime = 300000; // 5 minutes (video generation can take time)
    const pollInterval = 3000; // 3 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      // Check job status
      const statusResponse = await fetch(`https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/status/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${RUNPOD_API_KEY}`
        }
      });

      if (!statusResponse.ok) {
        console.error('❌ Status check failed:', statusResponse.status);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }

      const responseText = await statusResponse.text();
      let statusData;
      try {
        statusData = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Failed to parse status response:', responseText);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }

      console.log('📊 Job status:', statusData.status);

      if (statusData.status === 'COMPLETED') {
        console.log('✅ Video generation completed!');

        // Calculate approximate cost (RTX 3090: ~$0.00025/sec)
        const executionTime = statusData.executionTime || 60;
        const estimatedCost = (executionTime * 0.00025).toFixed(4);

        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            video: statusData.output?.video_url || statusData.output,
            provider: 'RunPod Serverless (Wan2.2)',
            cost: `~$${estimatedCost}`,
            generation_time: executionTime,
            metadata: {
              model: requestData.model || 'Wan2.2',
              resolution: `${width}x${height}`,
              num_frames: requestData.num_frames,
              fps: requestData.fps,
              seed: seed
            }
          })
        };
      } else if (statusData.status === 'FAILED') {
        console.error('❌ Job failed:', statusData.error);
        return {
          statusCode: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Video generation failed on RunPod',
            details: statusData.error
          })
        };
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Timeout
    return {
      statusCode: 408,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Video generation timed out',
        details: 'Job is still running. Check RunPod dashboard for status.',
        jobId: jobId
      })
    };
    */

  } catch (error) {
    console.error('❌ RunPod video generation error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      })
    };
  }
};
