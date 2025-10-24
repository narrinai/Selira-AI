const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const requestData = JSON.parse(event.body);

    // Get API key from environment variables
    const apiKey = process.env.PROMPTCHAN_API_KEY_SELIRA;

    if (!apiKey) {
      console.error('❌ Promptchan API key not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    console.log('🎬 Generating video with Promptchan API...');
    console.log('Request data:', JSON.stringify(requestData, null, 2));

    // Build the API request body based on Promptchan's expected format
    const apiRequestBody = {
      image_url: requestData.image_url,
      prompt: requestData.prompt,
      model: requestData.model || 'stable-video-diffusion',
      duration: requestData.duration || 4,
      fps: requestData.fps || 24,
      quality: requestData.quality || 'standard',
      motion_bucket_id: requestData.motion_bucket_id || 127,
      cond_aug: requestData.cond_aug || 0.02,
      seed: requestData.seed === -1 ? Math.floor(Math.random() * 1000000) : requestData.seed,
      loop: requestData.loop !== undefined ? requestData.loop : false,
      upscale: requestData.upscale !== undefined ? requestData.upscale : false,
      stabilize: requestData.stabilize !== undefined ? requestData.stabilize : true
    };

    // Make request to Promptchan API
    // Note: The actual endpoint may differ - adjust based on Promptchan's documentation
    const response = await fetch('https://prod.aicloudnetservices.com/api/external/video/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(apiRequestBody)
    });

    const responseText = await response.text();
    console.log('API Response status:', response.status);
    console.log('API Response body:', responseText);

    if (!response.ok) {
      console.error('❌ Promptchan API error:', response.status, responseText);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: 'Failed to generate video',
          details: responseText
        })
      };
    }

    // Parse the response
    const data = JSON.parse(responseText);

    console.log('✅ Video generated successfully');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        video: data.video || data.video_url || data.url,
        gems: data.gems || data.cost,
        metadata: {
          duration: requestData.duration,
          fps: requestData.fps,
          model: requestData.model
        }
      })
    };

  } catch (error) {
    console.error('❌ Promptchan video function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
