// Advanced AI image generation for Selira AI companions
// Uses MeinaHentai v5 for anime and Absolute Reality v1.8.1 for realistic

const fetch = require('node-fetch');

// Track recent requests to prevent rapid-fire calls
const recentRequests = new Map();
const REQUEST_COOLDOWN_MS = 1000; // 1 second cooldown
let globalRequestCount = 0;
let activeAdvancedRequests = 0;

exports.handler = async (event, context) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🎨 [${requestId}] advanced-image function called`);

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

  // Check for Advanced AI API key
  const ADVANCED_AI_API_KEY = process.env.ADVANCED_AI_API_KEY;

  console.log(`🔑 [${requestId}] Environment check:`, {
    hasAdvancedKey: !!ADVANCED_AI_API_KEY,
    keyLength: ADVANCED_AI_API_KEY ? ADVANCED_AI_API_KEY.length : 0,
    keyPrefix: ADVANCED_AI_API_KEY ? ADVANCED_AI_API_KEY.substring(0, 8) + '...' : 'none'
  });

  if (!ADVANCED_AI_API_KEY) {
    console.error('❌ Advanced AI API key not found');
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Advanced AI API key not configured',
        debug: 'Please add ADVANCED_AI_API_KEY to Netlify environment variables'
      })
    };
  }

  // Rate limiting
  const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  const now = Date.now();
  const lastRequest = recentRequests.get(clientIp);

  if (lastRequest && (now - lastRequest) < REQUEST_COOLDOWN_MS) {
    const waitTime = REQUEST_COOLDOWN_MS - (now - lastRequest);
    return {
      statusCode: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil(waitTime / 1000).toString()
      },
      body: JSON.stringify({
        error: 'Too many requests. Please wait a moment.',
        retryAfter: Math.ceil(waitTime / 1000)
      })
    };
  }

  recentRequests.set(clientIp, now);
  globalRequestCount++;

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { customPrompt, characterName, category, style, shotType, sex, ethnicity, hairLength, hairColor } = body;

    console.log(`📋 [${requestId}] Received:`, {
      customPrompt,
      characterName,
      style,
      category
    });

    // Select model based on style
    let modelName;
    if (style === 'anime' || category?.toLowerCase().includes('anime') || category?.toLowerCase().includes('manga')) {
      modelName = 'MeinaHentai v5';
      console.log(`🎌 [${requestId}] Using anime model: ${modelName}`);
    } else {
      modelName = 'Absolute Reality v1.8.1';
      console.log(`📸 [${requestId}] Using realistic model: ${modelName}`);
    }

    // Build the full prompt
    let fullPrompt = customPrompt;
    if (!fullPrompt) {
      // Fallback prompt if none provided
      const isAnime = modelName === 'MeinaHentai v5';
      const ethnicGender = `${ethnicity || 'white'} ${sex || 'female'}`;

      if (isAnime) {
        fullPrompt = `Sexy anime girl, ${ethnicGender}, seductive pose, revealing outfit, detailed anime art, attractive, bedroom background, ecchi style, high quality anime artwork`;
      } else {
        fullPrompt = `Beautiful sexy ${ethnicGender}, seductive expression, revealing clothing, sensual pose, photorealistic, glamour photography style, professional photography`;
      }
    }

    console.log(`🎨 [${requestId}] Full prompt: ${fullPrompt}`);

    // Progressive delay for rate limiting
    const baseDelay = 500; // Base 500ms delay
    const progressiveDelay = Math.min(baseDelay * Math.floor(globalRequestCount / 2), 3000); // Max 3 seconds
    console.log(`⏱️ [${requestId}] Waiting ${progressiveDelay}ms before API call`);
    await new Promise(resolve => setTimeout(resolve, progressiveDelay));

    // Track active requests
    activeAdvancedRequests++;
    console.log(`📊 [${requestId}] Active Advanced AI requests: ${activeAdvancedRequests}`);

    // Call Advanced AI API
    console.log(`🎨 [${requestId}] Calling Advanced AI with model: ${modelName}`);

    const advancedResponse = await fetch('https://api.example-ai.com/v1/image/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADVANCED_AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        prompt: fullPrompt,
        negative_prompt: 'low quality, blurry, bad anatomy, multiple people, crowd, group',
        width: 768,
        height: 768,
        num_images: 1,
        guidance_scale: 7,
        num_inference_steps: 25
      })
    });

    activeAdvancedRequests--;

    if (!advancedResponse.ok) {
      const errorText = await advancedResponse.text();
      console.error(`❌ [${requestId}] Advanced AI error:`, advancedResponse.status, errorText);

      return {
        statusCode: advancedResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Advanced AI generation failed',
          details: errorText,
          model: modelName
        })
      };
    }

    const result = await advancedResponse.json();
    console.log(`✅ [${requestId}] Advanced AI response received`);

    // Extract image URL from response
    const imageUrl = result.images?.[0]?.url || result.image_url || result.url;

    if (!imageUrl) {
      console.error(`❌ [${requestId}] No image URL in response:`, result);
      throw new Error('No image URL in Advanced AI response');
    }

    console.log(`🖼️ [${requestId}] Generated image: ${imageUrl}`);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        imageUrl: imageUrl,
        prompt: fullPrompt,
        model: modelName,
        provider: 'Advanced AI'
      })
    };

  } catch (error) {
    activeAdvancedRequests = Math.max(0, activeAdvancedRequests - 1);
    console.error(`❌ [${requestId}] Error:`, error);

    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Advanced AI image generation failed',
        details: error.message,
        stack: error.stack
      })
    };
  }
};