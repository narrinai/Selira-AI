// Custom image generation for chat - accepts user prompts
// Based on Flux Schnell for fast generation

exports.handler = async (event, context) => {
  console.log('🎨 generate-custom-image function called');
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN_SELIRA || process.env.REPLICATE_API_TOKEN;
  
  console.log('🔑 Environment check:', {
    hasReplicateToken: !!REPLICATE_API_TOKEN,
    tokenLength: REPLICATE_API_TOKEN ? REPLICATE_API_TOKEN.length : 0,
    tokenPrefix: REPLICATE_API_TOKEN ? REPLICATE_API_TOKEN.substring(0, 3) : 'none'
  });
  
  if (!REPLICATE_API_TOKEN) {
    console.error('❌ Replicate API token not found');
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Replicate API token not configured',
        debug: 'Please add REPLICATE_API_TOKEN to Netlify environment variables'
      })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { customPrompt, characterName, category, style, shotType } = body;
    
    console.log('📋 Received:', {
      customPrompt,
      characterName,
      category,
      style,
      shotType
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
    
    // Enhanced feminine features (SFW) + smart context detection
    const feminineEnhancement = 'beautiful woman, curvy figure, feminine physique, attractive features, well-proportioned';
    
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
    
    // Build full prompt with enhanced features and context
    let fullPrompt;
    if (isAnimeStyle) {
      const shotDesc = isFullBody ? 'full body anime illustration' : 'anime portrait';
      fullPrompt = `${shotDesc} of ${feminineEnhancement}, anime style, ${customPrompt}${contextualEnhancement}, detailed anime art, high quality anime illustration, vibrant colors, cel shading, clean background, single anime character, perfect anime anatomy, anime eyes`;
    } else {
      const shotDesc = isFullBody ? 'full body photograph' : 'portrait photograph';
      fullPrompt = `realistic photography, ${shotDesc} of ${feminineEnhancement}, ${customPrompt}${contextualEnhancement}, photorealistic, real photo, not anime, not cartoon, not illustration, not drawing, professional photography, high quality, professional lighting, clean background, single real person, perfect anatomy, realistic skin, realistic features`;
    }
    
    console.log('🎨 Full prompt:', fullPrompt);
    console.log('🎌 Anime style:', isAnimeStyle);
    
    // Use Flux Schnell for fast generation
    const model = "black-forest-labs/flux-schnell";
    
    // Call Replicate API
    const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: model,
        input: {
          prompt: fullPrompt,
          width: 768,
          height: 768,
          num_outputs: 1,
          num_inference_steps: 4
        }
      })
    });
    
    if (!replicateResponse.ok) {
      const errorText = await replicateResponse.text();
      console.error('❌ Replicate API error:', errorText);
      throw new Error(`Replicate API error: ${replicateResponse.status}`);
    }
    
    const prediction = await replicateResponse.json();
    console.log('📊 Prediction created:', prediction.id);
    
    // Wait for the prediction to complete (max 15 seconds for custom prompts)
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 15;
    
    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`
        }
      });
      
      if (!statusResponse.ok) {
        console.error('❌ Status check failed:', statusResponse.status);
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }
      
      result = await statusResponse.json();
      console.log(`⏳ Status [${attempts}/${maxAttempts}]:`, result.status);
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Timeout waiting for image generation');
    }
    
    if (result.status === 'failed') {
      throw new Error('Image generation failed');
    }
    
    const imageUrl = result.output?.[0];
    if (!imageUrl) {
      throw new Error('No image URL in response');
    }
    
    console.log('✅ Custom image generated successfully:', imageUrl);
    
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
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
    console.error('❌ Generate custom image error:', error);
    console.error('❌ Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Custom image generation failed',
        details: error.message,
        stack: error.stack
      })
    };
  }
};