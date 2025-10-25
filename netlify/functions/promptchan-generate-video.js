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

    console.log('🎬 Generating video...');
    console.log('Request data:', JSON.stringify(requestData, null, 2));

    // Determine which model to use
    const model = requestData.model || 'hunyuan-video';

    if (model === 'hunyuan-video') {
      // Use fal.ai for Hunyuan Video image-to-video
      const FAL_API_KEY = process.env.FAL_API_KEY_SELIRA || process.env.FAL_API_KEY;

      if (!FAL_API_KEY) {
        return {
          statusCode: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Fal.ai API key not configured' })
        };
      }

      const seed = requestData.seed === -1 ? Math.floor(Math.random() * 1000000) : requestData.seed;

      // Build fal.ai API request for Hunyuan image-to-video
      const falInput = {
        prompt: requestData.prompt,
        image_url: requestData.image_url,
        aspect_ratio: requestData.aspect_ratio || '16:9',
        resolution: requestData.resolution || '720p',
        num_frames: requestData.num_frames || 129,
        seed: seed
      };

      // Add i2v_stability if provided
      if (requestData.i2v_stability !== undefined) {
        falInput.i2v_stability = requestData.i2v_stability;
      }

      console.log('🎨 Using Hunyuan Video I2V via fal.ai');
      console.log('Fal.ai input:', JSON.stringify(falInput, null, 2));

      // Call fal.ai API
      const response = await fetch('https://fal.run/fal-ai/hunyuan-video-image-to-video', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(falInput)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Fal.ai API error:', errorText);
        return {
          statusCode: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Failed to generate video with fal.ai',
            details: errorText
          })
        };
      }

      const result = await response.json();
      console.log('✅ Video generated successfully');
      console.log('Result:', JSON.stringify(result, null, 2));

      // Fal.ai returns video URL directly
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          video: result.video || result.video_url || result.url,
          provider: 'fal.ai-hunyuan',
          cost: '$0.40',
          metadata: {
            aspect_ratio: requestData.aspect_ratio,
            resolution: requestData.resolution,
            num_frames: requestData.num_frames,
            seed: seed
          }
        })
      };

    } else {
      // Stable Video Diffusion or other models
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Only hunyuan-video model is currently supported',
          supportedModels: ['hunyuan-video']
        })
      };
    }

  } catch (error) {
    console.error('❌ Video generation error:', error);
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
