// Video generation using Stable Video Diffusion on Replicate
// Converts static images to 4-5 second animated videos

// Track recent requests to prevent rapid-fire calls
const recentRequests = new Map();
const REQUEST_COOLDOWN_MS = 2000; // 2 second cooldown between video requests
let globalRequestCount = 0;

exports.handler = async (event, context) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🎬 [${requestId}] generate-video function called`);
  console.log(`📝 [${requestId}] Request method:`, event.httpMethod);

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

  console.log(`🔑 [${requestId}] Environment check:`, {
    hasReplicateToken: !!REPLICATE_API_TOKEN,
    tokenLength: REPLICATE_API_TOKEN ? REPLICATE_API_TOKEN.length : 0,
    tokenPrefix: REPLICATE_API_TOKEN ? REPLICATE_API_TOKEN.substring(0, 8) + '...' : 'none'
  });

  if (!REPLICATE_API_TOKEN) {
    console.error('❌ Replicate API token not found');
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Replicate API token not configured',
        message: 'Server configuration error'
      })
    };
  }

  // Check for rate limiting
  const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  const lastRequestTime = recentRequests.get(clientIp);
  const now = Date.now();

  if (lastRequestTime && (now - lastRequestTime) < REQUEST_COOLDOWN_MS) {
    const waitTime = REQUEST_COOLDOWN_MS - (now - lastRequestTime);
    console.log(`⏱️ [${requestId}] Rate limit: Client ${clientIp} must wait ${waitTime}ms`);
    return {
      statusCode: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil(waitTime / 1000).toString()
      },
      body: JSON.stringify({
        error: 'Too many requests. Please wait a moment before generating another video.',
        retryAfter: Math.ceil(waitTime / 1000)
      })
    };
  }

  // Update last request time
  recentRequests.set(clientIp, now);
  globalRequestCount++;

  console.log(`📊 [${requestId}] Request #${globalRequestCount} from ${clientIp}`);

  // Clean up old entries to prevent memory leak
  if (recentRequests.size > 100) {
    const firstKey = recentRequests.keys().next().value;
    recentRequests.delete(firstKey);
  }

  try {
    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Invalid JSON in request body',
          details: parseError.message
        })
      };
    }

    const {
      input_image,
      motion_bucket_id = 127,
      frames_per_second = 6,
      cond_aug = 0.02,
      video_length = "25_frames_with_svd_xt" // 25 frames for ~4 seconds
    } = body;

    console.log(`📋 [${requestId}] Received:`, {
      input_image: input_image ? input_image.substring(0, 50) + '...' : 'none',
      motion_bucket_id,
      frames_per_second,
      video_length
    });

    if (!input_image) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing input_image parameter' })
      };
    }

    // Use Stable Video Diffusion model
    // This model converts a static image into an animated video
    const modelVersion = "fofr/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438";

    console.log(`🎨 [${requestId}] Using Stable Video Diffusion`);

    // Call Replicate API
    console.log(`📡 [${requestId}] Calling Replicate API with model version:`, modelVersion);

    let replicateResponse;
    try {
      replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          version: modelVersion,
          input: {
            input_image: input_image,
            motion_bucket_id: motion_bucket_id,
            frames_per_second: frames_per_second,
            cond_aug: cond_aug,
            video_length: video_length,
            sizing_strategy: "maintain_aspect_ratio"
          }
        })
      });
    } catch (fetchError) {
      console.error(`❌ [${requestId}] Fetch error:`, fetchError);
      throw new Error(`Network error: ${fetchError.message}`);
    }

    if (!replicateResponse.ok) {
      const errorText = await replicateResponse.text();
      console.error(`❌ [${requestId}] Replicate API error:`, errorText);
      console.error(`❌ [${requestId}] Response status:`, replicateResponse.status);

      // Try to parse error details
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.detail || errorJson.message || errorText;
      } catch (e) {
        // Keep original error text if not JSON
      }

      throw new Error(`Replicate API error ${replicateResponse.status}: ${errorDetails}`);
    }

    let prediction;
    try {
      prediction = await replicateResponse.json();
      console.log(`📊 [${requestId}] Prediction created:`, prediction.id);
      console.log(`📊 [${requestId}] Prediction status:`, prediction.status);
    } catch (jsonError) {
      console.error('❌ Failed to parse Replicate response as JSON:', jsonError);
      throw new Error('Invalid response from Replicate API');
    }

    // Wait for the prediction to complete (max 120 seconds for video)
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes max

    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      try {
        const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`,
            'Accept': 'application/json'
          }
        });

        if (!statusResponse.ok) {
          console.error(`❌ [${requestId}] Status check failed:`, statusResponse.status);
          const errorText = await statusResponse.text();
          console.error(`❌ [${requestId}] Status check error:`, errorText);

          if (attempts >= maxAttempts - 1) {
            throw new Error(`Status check failed after ${attempts} attempts: ${statusResponse.status}`);
          }
          continue;
        }

        result = await statusResponse.json();

        // Log progress every 10 seconds
        if (attempts % 10 === 0) {
          console.log(`⏳ [${requestId}] Status [${attempts}/${maxAttempts}]:`, result.status);
        }
      } catch (statusError) {
        console.error(`❌ [${requestId}] Error checking status:`, statusError);
        if (attempts >= maxAttempts - 1) {
          throw statusError;
        }
        continue;
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('Timeout waiting for video generation (2 minutes)');
    }

    if (result.status === 'failed') {
      console.error('❌ Generation failed. Full result:', JSON.stringify(result, null, 2));
      const errorMsg = result.error || 'Video generation failed';
      throw new Error(errorMsg);
    }

    const videoUrl = result.output;
    if (!videoUrl) {
      throw new Error('No video URL in response');
    }

    console.log(`✅ [${requestId}] Video generated successfully:`, videoUrl);
    console.log(`⏱️ [${requestId}] Generation took ${attempts} seconds`);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        videoUrl: videoUrl,
        generationTime: attempts,
        settings: {
          motion_bucket_id,
          frames_per_second,
          video_length
        }
      })
    };

  } catch (error) {
    console.error(`❌ [${requestId}] Generate video error:`, error);
    console.error(`❌ [${requestId}] Error stack:`, error.stack);
    console.error(`❌ [${requestId}] Error details:`, error.message);

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Video generation failed',
        details: error.message,
        stack: error.stack
      })
    };
  }
};
