// Custom image generation for chat - accepts user prompts
// Routes between Replicate (censored) and Promptchan (uncensored) based on user preference

const fetch = require('node-fetch');

// Track recent requests to prevent rapid-fire calls
const recentRequests = new Map();
const REQUEST_COOLDOWN_MS = 1000; // 1 second cooldown between requests
let globalRequestCount = 0; // Track total requests in this instance
let activeReplicateRequests = 0; // Track concurrent Replicate API calls

// PROMPTCHAN IMAGE GENERATION FUNCTION
async function generateWithPromptchan(body, requestId, corsHeaders, email, auth0_id) {
  const { customPrompt, characterName, sex, ethnicity, hairLength, hairColor, style, source } = body;

  console.log(`🎨 [${requestId}] Generating with Promptchan API`);

  const PROMPTCHAN_API_KEY = process.env.PROMPTCHAN_API_KEY_SELIRA;

  if (!PROMPTCHAN_API_KEY) {
    console.error(`❌ [${requestId}] Promptchan API key not configured`);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Promptchan API not configured' })
    };
  }

  // Build enhanced NSFW prompt based on character traits
  const genderDesc = sex === 'male' ? 'handsome man' : 'beautiful woman';

  const ethnicityMap = {
    'white': 'Caucasian',
    'black': 'African American',
    'indian': 'South Asian',
    'middle-east': 'Middle Eastern',
    'hispanic': 'Hispanic',
    'korean': 'Korean',
    'chinese': 'Chinese',
    'japanese': 'Japanese',
    'vietnamese': 'Vietnamese'
  };

  const hairLengthMap = {
    'bald': 'bald',
    'short': 'short hair',
    'medium': 'medium length hair',
    'long': 'long hair'
  };

  const hairColorMap = {
    'brown': 'brown hair',
    'black': 'black hair',
    'blonde': 'blonde hair',
    'red': 'red hair',
    'auburn': 'auburn hair',
    'gray': 'gray hair',
    'white': 'white hair',
    'purple': 'purple hair',
    'pink': 'pink hair',
    'blue': 'blue hair',
    'green': 'green hair'
  };

  const ethnicityDesc = ethnicityMap[ethnicity] || '';
  const hairLengthDesc = hairLength === 'bald' ? 'bald' : hairLengthMap[hairLength] || 'styled hair';
  const hairColorDesc = hairLength === 'bald' ? '' : (hairColorMap[hairColor] || 'brown hair');

  // Build appearance description
  const appearance = [genderDesc, ethnicityDesc, hairColorDesc, hairLengthDesc].filter(Boolean).join(', ');

  // Remove clothing keywords and Promptchan banned words from custom prompt
  // Promptchan bans: "fellatio", "POV" (in sexual context), possibly others
  let cleanedPrompt = customPrompt
    .replace(/\bfellatio\b/gi, 'oral') // Replace fellatio
    .replace(/\bPOV\b/gi, 'perspective') // Replace POV
    .replace(/wearing\s+[^,]+,?/gi, '') // Remove "wearing X" phrases
    .replace(/\b(dress|shirt|top|bra|panties|lingerie|bikini|clothes|clothing|outfit|attire|uniform|robe|towel|underwear|shorts|pants|skirt|jeans|suit|blazer|jacket)\b/gi, '') // Remove clothing words
    .replace(/,\s*,/g, ',') // Clean up double commas
    .replace(/^\s*,\s*|\s*,\s*$/g, '') // Remove leading/trailing commas
    .trim();

  // Add variety keywords for more diverse images
  const varietyPoses = [
    'lying on bed with legs spread',
    'on hands and knees looking back',
    'sitting with legs open',
    'standing spreading pussy',
    'squatting showing everything',
    'bent over exposing ass and pussy',
    'lying back touching herself',
    'on side with leg raised',
    'kneeling with chest pushed forward'
  ];
  const randomPose = varietyPoses[Math.floor(Math.random() * varietyPoses.length)];

  const varietySettings = [
    'luxury bedroom with silk sheets',
    'modern bedroom with warm lighting',
    'hotel suite with city view',
    'cozy bedroom with soft pillows',
    'elegant bedroom with mirrors'
  ];
  const randomSetting = varietySettings[Math.floor(Math.random() * varietySettings.length)];

  // Add NSFW enhancement keywords for EXTREMELY explicit content with variety
  const nsfwEnhancement = sex === 'male'
    ? `completely naked, totally nude, full frontal nudity, ${randomPose}, exposed penis, hard erect cock, balls visible, no clothes whatsoever, bare naked body, muscular toned physique, athletic abs, genitals fully exposed, masturbating sensually, stroking hard cock slowly, sexual pleasure, pornographic XXX, explicit hardcore porn, aroused and hard, precum dripping, intense orgasm face, passionate expression, ${randomSetting}`
    : `completely naked, totally nude, full frontal nudity, ${randomPose}, massive huge perfect breasts, giant tits bouncing, huge round boobs, erect pink nipples, slim tiny waist, flat toned stomach, wide curvy hips, huge round bubble butt, thick thighs, perfect hourglass figure, extreme curves, voluptuous body, exposed dripping wet pussy, vagina spread open wide, glistening pink pussy lips, puffy swollen pussy, legs spread very wide, no clothes whatsoever, bare naked body, tits and pussy completely exposed, masturbating sensually, fingering wet pussy deep and slow, rubbing swollen clit, touching huge breasts, sexual pleasure, pornographic XXX, explicit hardcore porn, extremely aroused and wet, pussy dripping and glistening with arousal, intense orgasm face, passionate seductive expression, ${randomSetting}`;

  // Enhanced lighting for warmer, more vibrant images
  const lightingEnhancement = 'golden hour sunlight streaming through windows, warm orange and pink tones, soft diffused lighting, professional glamour lighting, vibrant saturated colors, rich warm color palette, high contrast shadows, cinematic color grading, warm skin tones, glowing highlights, romantic ambiance lighting, luxury photography lighting';

  // Combine: appearance + cleaned prompt + NSFW + lighting
  const enhancedPrompt = `${appearance}, ${cleanedPrompt}, ${nsfwEnhancement}, ${lightingEnhancement}, photorealistic skin texture, detailed anatomy, 8k ultra detailed, sharp focus, masterpiece quality`;

  console.log(`✨ [${requestId}] Promptchan enhanced prompt:`, enhancedPrompt);

  // Determine Promptchan style based on our style parameter with variety
  let promptchanStyle = 'Photo XL+ v2'; // Warmer, more vibrant than Hyperreal
  let promptchanFilter = 'Analog'; // Warmer tones than Studio

  if (style === 'anime' || style === 'animated') {
    // Randomly choose between anime styles for variety
    const animeStyles = ['Anime XL+', 'Hardcore XL', 'Anime XL'];
    promptchanStyle = animeStyles[Math.floor(Math.random() * animeStyles.length)];

    // Randomly choose anime filter for variety
    const animeFilters = ['Anime Studio', 'Manga'];
    promptchanFilter = animeFilters[Math.floor(Math.random() * animeFilters.length)];
  } else {
    // Randomly choose between realistic styles for variety
    const realisticStyles = ['Photo XL+ v2', 'Hyperreal XL+ v2', 'Photo XL+', 'Cinematic XL'];
    promptchanStyle = realisticStyles[Math.floor(Math.random() * realisticStyles.length)];

    // Randomly choose realistic filter for variety
    const realisticFilters = ['Analog', 'Professional', 'Flash', 'Studio'];
    promptchanFilter = realisticFilters[Math.floor(Math.random() * realisticFilters.length)];
  }

  // Add negative prompt to reduce unwanted elements
  const negativePrompt = 'clothes, clothing, dressed, covered, censored, underwear, bra, panties, bikini, blur, low quality, bad anatomy, extra limbs, deformed, ugly, text, watermark, logo, signature, bad hands, bad face, monochrome, black and white';

  // Randomize body type for variety (all still sexy and NSFW, just different body types)
  // Note: Sliders must be integers, not floats
  const bodyTypes = [
    { name: 'extreme_curvy', weight: 0, breast: 1, ass: 1 },      // Slim waist, huge tits/ass
    { name: 'very_curvy', weight: 0, breast: 1, ass: 1 },         // Big tits, big ass
    { name: 'curvy_athletic', weight: 0, breast: 1, ass: 1 },     // Athletic with curves
    { name: 'slim_busty', weight: -1, breast: 1, ass: 0 },        // Very slim with big tits
    { name: 'thicc', weight: 0, breast: 1, ass: 1 },              // Thicc/voluptuous
    { name: 'balanced_sexy', weight: 0, breast: 1, ass: 1 }       // Balanced sexy proportions
  ];
  const randomBodyType = bodyTypes[Math.floor(Math.random() * bodyTypes.length)];

  // Randomize emotion for variety (all still sexual/sensual)
  const sexualEmotions = ['Orgasm Face', 'Default', 'Smiling', 'Winking'];
  const randomEmotion = sexualEmotions[Math.floor(Math.random() * sexualEmotions.length)];

  // Randomize age for variety (all 18+ and attractive)
  const attractiveAges = [20, 22, 24, 26, 28, 30];
  const randomAge = attractiveAges[Math.floor(Math.random() * attractiveAges.length)];

  // Randomize detail level for variety (must be integer)
  const detailLevels = [1, 2];
  const randomDetail = detailLevels[Math.floor(Math.random() * detailLevels.length)];

  // Randomize creativity for variety
  const creativityLevels = [70, 80, 85, 90];
  const randomCreativity = creativityLevels[Math.floor(Math.random() * creativityLevels.length)];

  console.log(`🎲 [${requestId}] Random body type: ${randomBodyType.name}, emotion: ${randomEmotion}, age: ${randomAge}, detail: ${randomDetail}, creativity: ${randomCreativity}`);

  // Build Promptchan API request with randomized parameters for variety
  const promptchanRequest = {
    prompt: enhancedPrompt,
    negative_prompt: negativePrompt, // What to avoid
    style: promptchanStyle,
    quality: 'Extreme', // Highest quality (works reliably)
    image_size: '768x512', // Landscape format
    creativity: randomCreativity, // Random creativity for variety (70-90)
    seed: -1, // Random seed for variety
    filter: promptchanFilter, // Random filter for variety
    emotion: randomEmotion, // Random sexual emotion
    detail: randomDetail, // Random detail level (1.2-2.0)
    age_slider: randomAge, // Random attractive age (20-30)
    weight_slider: randomBodyType.weight, // Random body weight (must be integer)
    breast_slider: sex === 'male' ? 0 : randomBodyType.breast, // Random breast size (must be integer)
    ass_slider: sex === 'male' ? 0 : randomBodyType.ass, // Random ass size (must be integer)
    restore_faces: false // Don't use face restoration - we want natural sensual expressions
  };

  console.log(`📤 [${requestId}] Promptchan request:`, promptchanRequest);
  console.log(`🔍 [${requestId}] Type checking:`, {
    creativity_type: typeof promptchanRequest.creativity,
    detail_type: typeof promptchanRequest.detail,
    age_type: typeof promptchanRequest.age_slider,
    weight_type: typeof promptchanRequest.weight_slider,
    breast_type: typeof promptchanRequest.breast_slider,
    ass_type: typeof promptchanRequest.ass_slider
  });

  try {
    const response = await fetch('https://prod.aicloudnetservices.com/api/external/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': PROMPTCHAN_API_KEY
      },
      body: JSON.stringify(promptchanRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${requestId}] Promptchan API error:`, errorText);
      throw new Error(`Promptchan API error: ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ [${requestId}] Promptchan image generated, gems used:`, result.gems);

    // Increment usage counter for chat and image-generator
    if ((source === 'chat' || source === 'image-generator') && (email || auth0_id)) {
      console.log(`📈 [${requestId}] Incrementing usage counter for ${source} (Promptchan)`);
      try {
        const incrementResponse = await fetch(`${process.env.NETLIFY_FUNCTIONS_URL || 'https://selira.ai/.netlify/functions'}/selira-increment-image-usage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: auth0_id })
        });

        if (incrementResponse.ok) {
          console.log(`✅ [${requestId}] Usage incremented successfully (Promptchan)`);
        }
      } catch (err) {
        console.error(`❌ [${requestId}] Error incrementing usage:`, err.message);
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        imageUrl: result.image,
        fullPrompt: enhancedPrompt,
        customPrompt: customPrompt,
        isAnimeStyle: style === 'anime' || style === 'animated',
        provider: 'promptchan'
      })
    };

  } catch (error) {
    console.error(`❌ [${requestId}] Promptchan generation error:`, error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Promptchan image generation failed',
        details: error.message
      })
    };
  }
}

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

    const { customPrompt, characterName, category, style, shotType, sex, ethnicity, hairLength, hairColor, email, auth0_id, source, skipAutoDownload, uncensored } = body;

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
      uncensored,
      email,
      auth0_id: auth0_id ? auth0_id.substring(0, 15) + '...' : 'none'
    });

    // ROUTE TO PROMPTCHAN FOR UNCENSORED IMAGES
    if (uncensored === true) {
      console.log(`🔓 [${requestId}] Uncensored mode - routing to Promptchan API`);
      return await generateWithPromptchan(body, requestId, corsHeaders, email, auth0_id);
    }

    // Otherwise continue with Replicate (censored)
    console.log(`🔒 [${requestId}] Censored mode - using Replicate API`);
    
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

    // Determine if anime style - prioritize explicit style parameter
    let isAnimeStyle = false;
    console.log(`🎨 [${requestId}] Style determination:`);
    console.log(`   style parameter: "${style}" (type: ${typeof style})`);
    console.log(`   style === 'realistic': ${style === 'realistic'}`);
    console.log(`   style === 'anime': ${style === 'anime'}`);
    console.log(`   !style: ${!style}`);
    console.log(`   category: "${category}"`);

    if (style === 'anime' || style === 'animated') {
      isAnimeStyle = true;
      console.log(`   ✅ ANIME style (explicit: style="${style}")`);
    } else if (style === 'realistic') {
      isAnimeStyle = false; // Explicitly realistic, don't auto-detect
      console.log(`   ✅ REALISTIC style (explicit: style="realistic")`);
    } else if (!style) {
      // Only auto-detect if style is not provided at all
      isAnimeStyle = categoryLower.includes('anime') ||
                     promptLower.includes('anime') ||
                     promptLower.includes('manga') ||
                     promptLower.includes('waifu') ||
                     promptLower.includes('kawaii');
      console.log(`   ⚠️ AUTO-DETECTED: isAnimeStyle=${isAnimeStyle} (no style param provided)`);
    } else {
      console.log(`   ⚠️ UNKNOWN style value: "${style}" - defaulting to realistic`);
    }

    console.log(`   🎯 FINAL DECISION: ${isAnimeStyle ? 'ANIME' : 'REALISTIC'}`);
    
    // Character appearance based on creation flow data
    const genderDescription = sex === 'male' ? 
      'handsome man, masculine physique, strong features, well-built' : 
      'beautiful woman, feminine physique, attractive features, well-proportioned';
    
    // Ethnicity descriptions
    const ethnicityMap = {
      'white': 'Caucasian/European features, pale skin',
      'black': 'African American features, dark brown skin, BLACK skin tone',
      'indian': 'South Asian/Indian features, brown skin',
      'middle-east': 'Middle Eastern features, olive skin',
      'hispanic': 'Hispanic/Latino features, tan skin',
      'korean': 'Korean features, light skin',
      'chinese': 'Chinese features, light skin',
      'japanese': 'Japanese features, light skin',
      'vietnamese': 'Vietnamese features, light skin'
    };

    // Hair length descriptions
    const hairMap = {
      'bald': 'bald head, shaved head, NO hair',
      'short': 'short hair',
      'medium': 'medium length hair, shoulder-length hair',
      'long': 'long hair, flowing hair'
    };
    
    // Hair color descriptions (with emphasis for better AI generation)
    // For realistic style, map fantasy colors to natural colors to avoid anime bias
    const hairColorMap = {
      'brown': 'brown hair, brunette',
      'black': 'black hair, dark hair',
      'blonde': 'BLONDE hair, golden blonde hair, light blonde hair',
      'red': 'red hair, ginger hair, vibrant red hair',
      'auburn': 'auburn hair, reddish-brown hair',
      'gray': 'gray hair, silver hair',
      'white': isAnimeStyle ? 'white hair, platinum hair' : 'platinum blonde hair, very light blonde hair',
      'purple': isAnimeStyle ? 'purple hair, violet hair' : 'dark brown hair with subtle highlights, brunette',
      'pink': isAnimeStyle ? 'pink hair, rose hair' : 'light auburn hair, reddish-brown hair',
      'blue': isAnimeStyle ? 'blue hair, azure hair' : 'black hair with blue tones, dark hair',
      'green': isAnimeStyle ? 'green hair, emerald hair' : 'dark brown hair, brunette'
    };
    
    const ethnicityDesc = ethnicityMap[ethnicity] || 'diverse features';
    const hairLengthDesc = hairMap[hairLength] || 'styled hair';

    // Only add hair color if not bald
    const isBald = hairLength === 'bald' || promptLower.includes('bald');
    const hairColorDesc = isBald ? '' : (hairColorMap[hairColor] || 'brown hair');

    // Smart context enhancement with random diverse backgrounds
    let contextualEnhancement = '';

    // Location contexts - check if keywords exist in prompt
    if (promptLower.includes('beach')) {
      contextualEnhancement += ', sunny day, ocean background, vacation vibes, tropical setting';
    } else if (promptLower.includes('bedroom') || promptLower.includes('bed')) {
      contextualEnhancement += ', cozy interior, soft lighting, intimate setting';
    } else if (promptLower.includes('office') || promptLower.includes('work')) {
      contextualEnhancement += ', professional environment, modern office setting';
    } else if (promptLower.includes('park') || promptLower.includes('outdoor')) {
      contextualEnhancement += ', natural outdoor setting, pleasant lighting';
    } else {
      // If no specific background mentioned, add random diverse background
      const randomBackgrounds = [
        ', luxury penthouse interior, city skyline view, elegant modern setting, warm ambient lighting',
        ', tropical beach at sunset, golden hour, ocean waves, romantic atmosphere, vacation vibes',
        ', cozy coffee shop, warm lighting, artistic atmosphere, urban setting',
        ', rooftop terrace at dusk, city lights in background, romantic evening atmosphere',
        ', art gallery interior, sophisticated setting, modern architecture, soft gallery lighting',
        ', private library with bookshelves, intellectual atmosphere, warm reading lights',
        ', infinity pool edge, resort setting, tropical paradise, crystal clear water',
        ', garden terrace with flowers, natural outdoor setting, soft sunlight, botanical vibes',
        ', modern loft apartment, industrial chic, large windows, natural daylight',
        ', spa retreat setting, tranquil atmosphere, zen garden view, peaceful ambiance',
        ', luxury yacht deck, ocean view, sunny day, nautical elegance',
        ', scenic mountain lodge, fireplace, cozy rustic charm, warm interior',
        ', urban rooftop bar, nightlife atmosphere, city panorama, stylish setting',
        ', botanical conservatory, lush greenery, natural light, exotic plants',
        ', private beach cabana, tropical paradise, ocean breeze, intimate setting'
      ];
      const randomBg = randomBackgrounds[Math.floor(Math.random() * randomBackgrounds.length)];
      contextualEnhancement += randomBg;
      console.log(`🎲 [${requestId}] Selected random background:`, randomBg);
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

    // Build character-aware prompt - PUT HAIR COLOR FIRST for better AI adherence (unless bald)
    const hairPart = isBald ? hairLengthDesc : `${hairColorDesc}, ${hairLengthDesc}`;
    const characterAppearance = `${hairPart}, ${genderDescription}, ${ethnicityDesc}`;

    // Add NSFW enhancement keywords if prompt suggests intimate/adult content
    let nsfwEnhancement = '';
    const nsfwKeywords = ['naked', 'nude', 'topless', 'lingerie', 'underwear', 'bikini', 'revealing',
                          'intimate', 'sensual', 'sexy', 'bedroom', 'undressed', 'bare', 'exposed',
                          'masturbating', 'fingering', 'pussy', 'breasts', 'nipples', 'blowjob',
                          'doggy', 'cowgirl', 'missionary', 'penetration', 'oral'];
    const hasNsfwIntent = nsfwKeywords.some(keyword => promptLower.includes(keyword));

    if (hasNsfwIntent) {
      // MUCH stronger NSFW enhancement - repeat keywords for AI weight
      nsfwEnhancement = ', NSFW NSFW NSFW, completely naked, fully nude, no clothes at all, zero clothing, bare naked body, exposed genitals, explicit nudity, uncensored explicit content, pornographic image, XXX rated, adult porn content, full frontal nudity, genitals visible, breasts exposed, nipples visible, pussy visible, naked naked naked, unclothed unclothed, totally nude, 100% naked, no bra no panties, completely unclothed, bare skin everywhere, intimate parts visible, explicit adult photography, hardcore NSFW, pornographic photo, erotic nude art, sexually explicit';
      console.log(`🔞 [${requestId}] NSFW content detected - adding EXTREME explicit enhancement`);
    }

    // Build full prompt with character appearance and context
    let fullPrompt;
    if (isAnimeStyle) {
      const shotDesc = isFullBody ? 'full body anime illustration' : 'anime portrait';
      fullPrompt = `${shotDesc} of ${genderDescription}, ${ethnicityDesc}, ${hairPart}, anime style, ${sanitizedPrompt}${contextualEnhancement}${nsfwEnhancement}, detailed anime art, high quality anime illustration, vibrant colors, cel shading, clean background, single anime character, perfect anime anatomy, anime eyes`;
    } else {
      const shotDesc = isFullBody ? 'full body photograph' : 'portrait photograph';

      // Add anti-clothing keywords if NSFW
      const antiClothing = hasNsfwIntent ? ', NO clothes, NO clothing, NO fabric, NO dress, NO shirt, NO bra, NO panties, NO underwear, NO covered body, NO censorship' : '';

      fullPrompt = `REALISTIC PHOTOGRAPHY, ${shotDesc} of ${genderDescription}, ${ethnicityDesc}, ${hairPart}, ${sanitizedPrompt}${contextualEnhancement}${nsfwEnhancement}${antiClothing}, ultra realistic, photorealistic, real human photo, actual photograph, professional photography, realistic skin texture, realistic facial features, realistic proportions, high quality photo, professional studio lighting, clean background, single real person, perfect human anatomy, NO anime, NO cartoon, NO illustration, NO drawing, NO manga, NO cel shading, NO stylized art, real photograph only`;
    }
    
    console.log(`🎨 [${requestId}] Full prompt:`, fullPrompt);
    console.log(`🎌 [${requestId}] Anime style:`, isAnimeStyle);

    // Use FLUX Dev for both anime and realistic
    // FLUX Dev by Black Forest Labs - no NSFW filter, works for both styles
    const modelVersion = "black-forest-labs/flux-dev";

    console.log(`🎨 [${requestId}] Using model: FLUX Dev (${isAnimeStyle ? 'anime' : 'realistic'})`);

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
            // FLUX Dev parameters - optimized for bright, high-contrast images
            prompt: fullPrompt,
            width: 1024,
            height: 1024,
            num_inference_steps: 35, // More steps for better quality and lighting
            guidance_scale: 7.5, // Higher guidance for better adherence to lighting prompts
            num_outputs: 1,
            output_format: "webp",
            output_quality: 95, // Higher quality
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

    // Trigger automatic download to /avatars/ (fire and forget) - skip if requested
    if (!skipAutoDownload) {
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
    } else {
      console.log(`⏭️ [${requestId}] Skipping auto-download as requested`);
    }

    // Increment usage counter for chat and image-generator (not companion creation)
    console.log(`🔍 [${requestId}] Checking increment conditions:`, {
      source,
      hasEmail: !!email,
      hasAuth0Id: !!auth0_id,
      hasLimitData: !!body.limitData,
      limitDataUserId: body.limitData?.userId
    });

    if ((source === 'chat' || source === 'image-generator') && (email || auth0_id)) {
      console.log(`📈 [${requestId}] ✅ Incrementing usage counter for ${source} image generation`);
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
    } else if (source && source !== 'chat' && source !== 'image-generator') {
      console.log(`🎨 [${requestId}] Companion creation image - skipping usage tracking (source: ${source})`);
    } else {
      console.log(`👤 [${requestId}] Anonymous user or no source - skipping usage increment`);
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