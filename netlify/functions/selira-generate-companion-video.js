// Generate NSFW video of companion in one seamless flow
// Combines image generation + video animation behind the scenes

exports.handler = async (event, context) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🎬 [${requestId}] generate-companion-video function called`);

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

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
    const body = JSON.parse(event.body || '{}');
    const {
      customPrompt,
      characterName,
      sex,
      ethnicity,
      hairLength,
      hairColor,
      motion_bucket_id = 180, // Higher motion for sexual content
      frames_per_second = 8
    } = body;

    if (!customPrompt || !characterName) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing customPrompt or characterName' })
      };
    }

    console.log(`📋 [${requestId}] Generating video for ${characterName} with prompt: ${customPrompt}`);

    const baseUrl = process.env.NETLIFY_FUNCTIONS_URL || 'https://selira.ai/.netlify/functions';

    // STEP 1: Generate NSFW image
    console.log(`🖼️ [${requestId}] Step 1/2: Generating NSFW image...`);

    const imageResponse = await fetch(`${baseUrl}/selira-generate-custom-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customPrompt,
        characterName,
        sex,
        ethnicity,
        hairLength,
        hairColor,
        source: 'video-generation',
        skipAutoDownload: true // Don't save to avatars folder
      })
    });

    if (!imageResponse.ok) {
      const errorData = await imageResponse.json();
      throw new Error(`Image generation failed: ${errorData.error || errorData.details}`);
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.imageUrl;

    console.log(`✅ [${requestId}] Image generated: ${imageUrl.substring(0, 50)}...`);

    // STEP 2: Animate the NSFW image
    console.log(`🎬 [${requestId}] Step 2/2: Animating image to video...`);

    const videoResponse = await fetch(`${baseUrl}/selira-generate-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input_image: imageUrl,
        motion_bucket_id,
        frames_per_second
      })
    });

    if (!videoResponse.ok && videoResponse.status !== 202) {
      const errorData = await videoResponse.json();
      throw new Error(`Video generation failed: ${errorData.error || errorData.details}`);
    }

    const videoData = await videoResponse.json();

    console.log(`✅ [${requestId}] Video generation started: ${videoData.predictionId}`);

    // Return prediction ID for client-side polling
    // This avoids Netlify function timeout
    return {
      statusCode: 202, // Accepted - processing
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        predictionId: videoData.predictionId,
        intermediateImageUrl: imageUrl, // Optional: return for debugging
        status: 'processing',
        message: 'Video generation in progress'
      })
    };

  } catch (error) {
    console.error(`❌ [${requestId}] Generate companion video error:`, error);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Companion video generation failed',
        details: error.message
      })
    };
  }
};
