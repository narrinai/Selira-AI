const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const requestData = JSON.parse(event.body);
    console.log('🎥 Generating text-to-video with Replicate Hunyuan...');

    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN_SELIRA || process.env.REPLICATE_API_TOKEN;

    if (!REPLICATE_API_TOKEN) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Replicate API token not configured' })
      };
    }

    const seed = requestData.seed === -1 ? Math.floor(Math.random() * 1000000) : requestData.seed;

    // Build Replicate API request
    const replicateInput = {
      prompt: requestData.prompt,
      width: requestData.width || 864,
      height: requestData.height || 480,
      video_length: requestData.video_length || 129,
      infer_steps: requestData.infer_steps || 50,
      embedded_guidance_scale: requestData.guidance_scale || 6,
      fps: requestData.fps || 24,
      seed: seed
    };

    console.log('📡 Calling Replicate Hunyuan T2V API...');

    // Start prediction
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: '847dfa8b01e739637fc76f480ede0c1d76408e1d694b830b5dfb8e547bf98405',
        input: replicateInput
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Replicate API error:', errorText);
      return {
        statusCode: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to start video generation', details: errorText })
      };
    }

    const prediction = await response.json();
    const predictionId = prediction.id;

    console.log('📊 Prediction created:', predictionId);

    // Poll for completion (max 5 minutes)
    const maxWaitTime = 300000;
    const pollInterval = 3000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { 'Authorization': `Token ${REPLICATE_API_TOKEN}` }
      });

      const statusData = await statusResponse.json();
      console.log('📊 Status:', statusData.status);

      if (statusData.status === 'succeeded') {
        console.log('✅ Video generation completed!');

        // Calculate cost (Replicate pricing: ~$0.0061/sec on 4x H100)
        const metrics = statusData.metrics || {};
        const predictTime = metrics.predict_time || 200; // seconds
        const estimatedCost = (predictTime * 0.0061).toFixed(2);

        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            video: statusData.output,
            provider: 'Replicate (Hunyuan T2V)',
            cost: `~$${estimatedCost}`,
            generation_time: predictTime,
            metadata: {
              width: requestData.width,
              height: requestData.height,
              video_length: requestData.video_length,
              fps: requestData.fps,
              seed: seed
            }
          })
        };
      } else if (statusData.status === 'failed' || statusData.status === 'canceled') {
        console.error('❌ Prediction failed:', statusData.error);
        return {
          statusCode: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Video generation failed', details: statusData.error })
        };
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Timeout
    return {
      statusCode: 408,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Video generation timed out',
        details: 'Generation is taking longer than expected. Check Replicate dashboard.',
        predictionId: predictionId
      })
    };

  } catch (error) {
    console.error('❌ Replicate T2V error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
};
