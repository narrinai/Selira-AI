// Custom image generation for chat - accepts user prompts
// Based on Flux Schnell for fast generation

// Track recent requests to prevent rapid-fire calls
const recentRequests = new Map();
const REQUEST_COOLDOWN_MS = 1000; // 1 second cooldown between requests
let globalRequestCount = 0; // Track total requests in this instance
let activeReplicateRequests = 0; // Track concurrent Replicate API calls

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
    tokenPrefix: REPLICATE_API_TOKEN ? REPLICATE_API_TOKEN.substring(0, 8) + '...' : 'none',
    envKeys: Object.keys(process.env).filter(key => key.includes('REPLICATE')).join(', '),
    allEnvKeys: Object.keys(process.env).length,
    specificTokens: {
      REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN ? 'EXISTS' : 'MISSING',
      REPLICATE_API_TOKEN_SELIRA: process.env.REPLICATE_API_TOKEN_SELIRA ? 'EXISTS' : 'MISSING'
    }
  });
  
  if (!REPLICATE_API_TOKEN) {
    console.error('❌ Replicate API token not found - generating mock avatar');
    // Return a mock avatar for now
    const mockAvatarUrl = `https://via.placeholder.com/768x768/FF6B6B/FFFFFF?text=${encodeURIComponent(body.characterName || 'Avatar')}`;
    console.log('🔄 Using mock avatar due to missing token:', mockAvatarUrl);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        imageUrl: mockAvatarUrl,
        message: 'Mock avatar generated (Replicate token missing)'
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

  // Update last request time and increment counter
  recentRequests.set(clientIp, now);
  globalRequestCount++;

  console.log(`📊 [${requestId}] Request #${globalRequestCount} from ${clientIp}`);

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

    const { customPrompt, characterName, category, style, shotType, sex, ethnicity, hairLength, hairColor, email, auth0_id, source } = body;
    
    console.log(`📋 [${requestId}] Received:`, {
      customPrompt,
      characterName,
      category,
      style,
      shotType,
      sex,
      ethnicity,
      hairLength,
      hairColor,
      source,
      email,
      auth0_id: auth0_id ? auth0_id.substring(0, 15) + '...' : 'none'
    });
    
    if (!customPrompt) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing custom prompt' })
      };
    }

    // Check hourly image limits for authenticated users
    if (email || auth0_id) {
      console.log(`🔍 [${requestId}] Checking hourly limits for user:`, { email, auth0_id });

      try {
        const limitResponse = await fetch(`${process.env.NETLIFY_FUNCTIONS_URL || 'https://selira.ai/.netlify/functions'}/check-image-limit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, auth0_id })
        });

        const limitData = await limitResponse.json();

        if (limitResponse.status === 429) {
          console.log(`🚫 [${requestId}] User exceeded hourly limit:`, limitData);
          return {
            statusCode: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': '3600'
            },
            body: JSON.stringify({
              error: limitData.error,
              plan: limitData.plan,
              limit: limitData.limit,
              usage: limitData.usage,
              retryAfter: 3600
            })
          };
        }

        if (limitResponse.status === 403) {
          console.log(`🚫 [${requestId}] Free plan user blocked from image generation:`, limitData);
          return {
            statusCode: 403,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              error: limitData.error,
              plan: limitData.plan,
              limit: limitData.limit,
              usage: limitData.usage,
              upgradeRequired: limitData.upgradeRequired
            })
          };
        }

        if (!limitResponse.ok) {
          console.warn(`⚠️ [${requestId}] Could not check limits (${limitResponse.status}), allowing generation`);
        } else {
          console.log(`✅ [${requestId}] Limit check passed:`, limitData);
          // Store limit data for later use when incrementing
          body.limitData = limitData;
        }
      } catch (limitError) {
        console.warn(`⚠️ [${requestId}] Limit check failed, allowing generation:`, limitError.message);
      }
    } else {
      console.log(`👤 [${requestId}] Anonymous user - no limit checking`);
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
    
    // Hair color descriptions (with emphasis for better AI generation)
    const hairColorMap = {
      'brown': 'brown hair, brunette',
      'black': 'black hair, dark hair',
      'blonde': 'BLONDE hair, golden blonde hair, light blonde hair',
      'red': 'red hair, ginger hair, vibrant red hair',
      'auburn': 'auburn hair, reddish-brown hair',
      'gray': 'gray hair, silver hair',
      'white': 'white hair, platinum blonde hair',
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
    
    // Use custom prompt directly without filtering
    const sanitizedPrompt = customPrompt.trim();

    console.log(`✨ [${requestId}] Using full custom prompt: "${sanitizedPrompt}"`);

    // Build character-aware prompt - PUT HAIR COLOR FIRST for better AI adherence
    const characterAppearance = `${hairColorDesc}, ${genderDescription}, ${ethnicityDesc}, ${hairLengthDesc}`;

    // Build full prompt with character appearance and context
    let fullPrompt;
    if (isAnimeStyle) {
      const shotDesc = isFullBody ? 'full body anime illustration' : 'anime portrait';
      fullPrompt = `${hairColorDesc}, ${shotDesc} of ${genderDescription}, ${ethnicityDesc}, ${hairLengthDesc}, anime style, ${sanitizedPrompt}${contextualEnhancement}, detailed anime art, high quality anime illustration, vibrant colors, cel shading, clean background, single anime character, perfect anime anatomy, anime eyes`;
    } else {
      const shotDesc = isFullBody ? 'full body photograph' : 'portrait photograph';
      fullPrompt = `${hairColorDesc}, realistic photography, ${shotDesc} of ${genderDescription}, ${ethnicityDesc}, ${hairLengthDesc}, ${sanitizedPrompt}${contextualEnhancement}, photorealistic, real photo, not anime, not cartoon, not illustration, not drawing, professional photography, high quality, professional lighting, clean background, single real person, perfect anatomy, realistic skin, realistic features`;
    }
    
    console.log(`🎨 [${requestId}] Full prompt:`, fullPrompt);
    console.log(`🎌 [${requestId}] Anime style:`, isAnimeStyle);

    // Use Flux Dev with safety checker disabled - no NSFW filter
    // Latest version with disable_safety_checker option
    const modelVersion = "6e4a938f85952bdabcc15aa329178c4d681c52bf25a0342403287dc26944661d";

    // Add progressive delay to prevent rate limiting
    // More requests = longer delay
    const baseDelay = 1000; // 1 second base
    const progressiveDelay = Math.min(baseDelay * Math.floor(globalRequestCount / 2), 5000); // Max 5 seconds
    console.log(`⏱️ [${requestId}] Waiting ${progressiveDelay}ms before API call (request #${globalRequestCount})`);
    await new Promise(resolve => setTimeout(resolve, progressiveDelay));

    // Remove concurrent request limit for better throughput
    console.log(`📊 [${requestId}] Current active Replicate requests: ${activeReplicateRequests}`);

    // Call Replicate API
    console.log(`📡 [${requestId}] Calling Replicate API with model version:`, modelVersion);
    console.log(`📡 [${requestId}] Active Replicate requests: ${activeReplicateRequests}`);

    activeReplicateRequests++;
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
            width: 1024,
            height: 1024,
            num_inference_steps: 28,
            guidance_scale: 3.5,
            num_outputs: 1,
            output_format: "webp",
            output_quality: 90,
            disable_safety_checker: true
          }
        })
      });
    } catch (fetchError) {
      activeReplicateRequests--;
      console.error(`❌ [${requestId}] Fetch error:`, fetchError);
      console.error(`❌ [${requestId}] Error name:`, fetchError.name);
      console.error(`❌ [${requestId}] Error message:`, fetchError.message);
      throw new Error(`Network error: ${fetchError.message}`);
    }

    if (!replicateResponse.ok) {
      const errorText = await replicateResponse.text();
      console.error(`❌ [${requestId}] Replicate API error:`, errorText);
      console.error(`❌ [${requestId}] Response status:`, replicateResponse.status);
      console.error(`❌ [${requestId}] Response headers:`, [...replicateResponse.headers.entries()]);

      // Try to parse error details
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.detail || errorJson.message || errorText;
      } catch (e) {
        // Keep original error text if not JSON
      }

      activeReplicateRequests--;
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
    
    // Wait for the prediction to complete (max 60 seconds for Flux Dev)
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 60;
    
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

    // Trigger automatic download to /avatars/ (fire and forget)
    try {
      const downloadUrl = `${process.env.NETLIFY_FUNCTIONS_URL || 'https://selira.ai/.netlify/functions'}/selira-auto-download-avatars`;

      // Fire and forget - don't await to avoid blocking the response
      fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Auto-Avatar-Download-Trigger'
        }
      }).catch(error => {
        console.warn(`⚠️ [${requestId}] Avatar auto-download trigger failed (non-blocking):`, error.message);
      });

      console.log(`🚀 [${requestId}] Triggered automatic avatar download process`);
    } catch (error) {
      console.warn(`⚠️ [${requestId}] Error triggering avatar download (non-blocking):`, error.message);
    }

    // Increment usage counter ONLY for chat-generated images (not companion creation)
    console.log(`🔍 [${requestId}] Checking increment conditions:`, {
      source,
      hasEmail: !!email,
      hasAuth0Id: !!auth0_id,
      hasLimitData: !!body.limitData,
      limitDataUserId: body.limitData?.userId
    });

    if (source === 'chat' && (email || auth0_id)) {
      console.log(`📈 [${requestId}] ✅ Incrementing usage counter for chat image generation`);
      try {
        // Get userId - prefer limitData userId (Airtable record ID) over auth0_id
        const userId = body.limitData?.userId || auth0_id;

        console.log(`📈 [${requestId}] Full increment details:`, {
          userId: userId,
          userIdLength: userId?.length,
          isAirtableId: userId?.startsWith('rec'),
          isAuth0Id: userId?.startsWith('auth0|'),
          limitData: body.limitData
        });

        const incrementResponse = await fetch(`${process.env.NETLIFY_FUNCTIONS_URL || 'https://selira.ai/.netlify/functions'}/selira-increment-image-usage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId
          })
        });

        console.log(`📊 [${requestId}] Increment response status:`, incrementResponse.status);

        if (incrementResponse.ok) {
          const incrementData = await incrementResponse.json();
          console.log(`✅ [${requestId}] Usage incremented successfully:`, incrementData);
        } else {
          const errorText = await incrementResponse.text();
          console.error(`❌ [${requestId}] Increment failed with status ${incrementResponse.status}:`, errorText);
        }
      } catch (incrementError) {
        console.error(`❌ [${requestId}] Error incrementing usage:`, incrementError.message, incrementError.stack);
      }
    } else if (source !== 'chat') {
      console.log(`🎨 [${requestId}] Companion creation image - skipping usage tracking (source: ${source || 'not specified'})`);
    } else {
      console.log(`👤 [${requestId}] Anonymous user - skipping usage increment`);
    }

    // Decrement active requests counter
    activeReplicateRequests--;
    console.log(`📊 [${requestId}] Completed. Active requests now: ${activeReplicateRequests}`);

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