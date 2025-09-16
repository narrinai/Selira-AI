// Custom image generation for chat - accepts user prompts
// Based on Flux Schnell for fast generation

// Track recent requests to prevent rapid-fire calls
const recentRequests = new Map();
const REQUEST_COOLDOWN_MS = 3000; // 3 second cooldown between requests

exports.handler = async (event, context) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🎨 [${requestId}] generate-custom-image function called`);
  console.log(`📝 [${requestId}] Request method:`, event.httpMethod);
  console.log(`📝 [${requestId}] Request headers:`, event.headers);

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
    tokenPrefix: REPLICATE_API_TOKEN ? REPLICATE_API_TOKEN.substring(0, 3) : 'none'
  });
  
  if (!REPLICATE_API_TOKEN) {
    console.error('❌ Replicate API token not found');
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Replicate API token not configured',
        debug: 'Please add REPLICATE_API_TOKEN to Netlify environment variables'
      })
    };
  }

  // Check for rate limiting - simple in-memory check
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
        error: 'Too many requests. Please wait a moment before generating another image.',
        retryAfter: Math.ceil(waitTime / 1000)
      })
    };
  }

  // Update last request time
  recentRequests.set(clientIp, now);

  // Clean up old entries to prevent memory leak (keep only last 100 entries)
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
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Invalid JSON in request body',
          details: parseError.message
        })
      };
    }

    const { customPrompt, characterName, category, style, shotType, sex, ethnicity, hairLength, hairColor } = body;
    
    console.log(`📋 [${requestId}] Received:`, {
      customPrompt,
      characterName,
      category,
      style,
      shotType,
      sex,
      ethnicity,
      hairLength,
      hairColor
    });
    
    if (!customPrompt) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing custom prompt' })
      };
    }
    
    // Use explicit style if provided, otherwise auto-detect
    const categoryLower = (category || '').toLowerCase();
    const promptLower = customPrompt.toLowerCase();
    const isAnimeStyle = style === 'anime' || (style !== 'realistic' && (
                       categoryLower.includes('anime') || 
                       promptLower.includes('anime') || 
                       promptLower.includes('manga') ||
                       promptLower.includes('waifu') ||
                       promptLower.includes('kawaii')
                     ));
    
    // Character appearance based on creation flow data
    const genderDescription = sex === 'male' ? 
      'handsome man, masculine physique, strong features, well-built' : 
      'beautiful woman, feminine physique, attractive features, well-proportioned';
    
    // Ethnicity descriptions
    const ethnicityMap = {
      'white': 'Caucasian/European features',
      'black': 'African/Black features',
      'indian': 'South Asian/Indian features', 
      'middle-east': 'Middle Eastern features',
      'hispanic': 'Hispanic/Latino features',
      'korean': 'Korean features',
      'chinese': 'Chinese features', 
      'japanese': 'Japanese features',
      'vietnamese': 'Vietnamese features'
    };
    
    // Hair length descriptions
    const hairMap = {
      'short': 'short hair',
      'medium': 'medium length hair, shoulder-length hair',
      'long': 'long hair, flowing hair'
    };
    
    // Hair color descriptions
    const hairColorMap = {
      'brown': 'brown hair',
      'black': 'black hair',
      'blonde': 'blonde hair, golden hair',
      'red': 'red hair, ginger hair',
      'auburn': 'auburn hair, reddish-brown hair',
      'gray': 'gray hair, silver hair',
      'white': 'white hair, platinum hair',
      'purple': 'purple hair, violet hair'
    };
    
    const ethnicityDesc = ethnicityMap[ethnicity] || 'diverse features';
    const hairLengthDesc = hairMap[hairLength] || 'styled hair';
    const hairColorDesc = hairColorMap[hairColor] || 'brown hair';
    
    // Smart context enhancement based on keywords
    let contextualEnhancement = '';
    
    // Location contexts
    if (promptLower.includes('beach')) {
      contextualEnhancement += ', sunny day, ocean background, vacation vibes, tropical setting';
    } else if (promptLower.includes('bedroom') || promptLower.includes('bed')) {
      contextualEnhancement += ', cozy interior, soft lighting, intimate setting';
    } else if (promptLower.includes('office') || promptLower.includes('work')) {
      contextualEnhancement += ', professional environment, modern office setting';
    } else if (promptLower.includes('park') || promptLower.includes('outdoor')) {
      contextualEnhancement += ', natural outdoor setting, pleasant lighting';
    }
    
    // Pose contexts
    if (promptLower.includes('leaning forward')) {
      contextualEnhancement += ', confident pose, engaging expression, dynamic posture';
    } else if (promptLower.includes('sitting') || promptLower.includes('lying')) {
      contextualEnhancement += ', relaxed pose, comfortable posture';
    } else if (promptLower.includes('standing')) {
      contextualEnhancement += ', confident stance, elegant posture';
    }
    
    // Clothing contexts
    if (promptLower.includes('white top') || promptLower.includes('shirt')) {
      contextualEnhancement += ', stylish casual wear, fashionable outfit';
    } else if (promptLower.includes('dress')) {
      contextualEnhancement += ', elegant dress, sophisticated style';
    } else if (promptLower.includes('bikini') || promptLower.includes('swimwear')) {
      contextualEnhancement += ', beach attire, summer style';
    }
    
    // Shot type determination
    const isFullBody = shotType === 'fullbody' || promptLower.includes('full body') || 
                       promptLower.includes('fullbody') || promptLower.includes('standing') ||
                       promptLower.includes('beach') || promptLower.includes('pose');
    
    // Build character-aware prompt
    const characterAppearance = `${genderDescription}, ${ethnicityDesc}, ${hairLengthDesc}, ${hairColorDesc}`;
    
    // Build full prompt with character appearance and context
    let fullPrompt;
    if (isAnimeStyle) {
      const shotDesc = isFullBody ? 'full body anime illustration' : 'anime portrait';
      fullPrompt = `${shotDesc} of ${characterAppearance}, anime style, ${customPrompt}${contextualEnhancement}, detailed anime art, high quality anime illustration, vibrant colors, cel shading, clean background, single anime character, perfect anime anatomy, anime eyes`;
    } else {
      const shotDesc = isFullBody ? 'full body photograph' : 'portrait photograph';
      fullPrompt = `realistic photography, ${shotDesc} of ${characterAppearance}, ${customPrompt}${contextualEnhancement}, photorealistic, real photo, not anime, not cartoon, not illustration, not drawing, professional photography, high quality, professional lighting, clean background, single real person, perfect anatomy, realistic skin, realistic features`;
    }
    
    console.log(`🎨 [${requestId}] Full prompt:`, fullPrompt);
    console.log(`🎌 [${requestId}] Anime style:`, isAnimeStyle);
    
    // Use Flux Schnell for fast generation with the correct version ID
    const modelVersion = "5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637";

    // Add small delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));

    // Call Replicate API with timeout
    console.log(`📡 [${requestId}] Calling Replicate API with model version:`, modelVersion);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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
            prompt: fullPrompt,
            width: 768,
            height: 768,
            num_outputs: 1,
            num_inference_steps: 4
          }
        }),
        signal: controller.signal
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`❌ [${requestId}] Request timeout after 30 seconds`);
        throw new Error('Request timeout - Replicate API took too long to respond');
      }
      console.error(`❌ [${requestId}] Fetch error:`, fetchError);
      throw new Error(`Network error: ${fetchError.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!replicateResponse.ok) {
      const errorText = await replicateResponse.text();
      console.error('❌ Replicate API error:', errorText);
      console.error('❌ Response status:', replicateResponse.status);
      console.error('❌ Response headers:', replicateResponse.headers);

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
    
    // Wait for the prediction to complete (max 30 seconds for custom prompts)
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 30;
    
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
          // Don't throw immediately, continue trying
          if (attempts >= maxAttempts - 1) {
            throw new Error(`Status check failed after ${attempts} attempts: ${statusResponse.status}`);
          }
          continue;
        }

        result = await statusResponse.json();
        console.log(`⏳ [${requestId}] Status [${attempts}/${maxAttempts}]:`, result.status);
      } catch (statusError) {
        console.error(`❌ [${requestId}] Error checking status:`, statusError);
        if (attempts >= maxAttempts - 1) {
          throw statusError;
        }
        // Continue trying if not at max attempts
        continue;
      }
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Timeout waiting for image generation');
    }
    
    if (result.status === 'failed') {
      console.error('❌ Generation failed. Full result:', JSON.stringify(result, null, 2));
      const errorMsg = result.error || 'Image generation failed';
      throw new Error(errorMsg);
    }
    
    const imageUrl = result.output?.[0];
    if (!imageUrl) {
      throw new Error('No image URL in response');
    }
    
    console.log(`✅ [${requestId}] Custom image generated successfully:`, imageUrl);
    
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        imageUrl: imageUrl,
        fullPrompt: fullPrompt,
        customPrompt: customPrompt,
        isAnimeStyle: isAnimeStyle
      })
    };
    
  } catch (error) {
    console.error(`❌ [${requestId}] Generate custom image error:`, error);
    console.error(`❌ [${requestId}] Error stack:`, error.stack);
    console.error(`❌ [${requestId}] Error details:`, error.message);
    
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Custom image generation failed',
        details: error.message,
        stack: error.stack
      })
    };
  }
};