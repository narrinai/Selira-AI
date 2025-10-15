// Custom image generation for chat - accepts user prompts
// Routes between Replicate (censored) and Promptchan (uncensored) based on user preference
// v1.2 - Enhanced uncensored detection

const fetch = require('node-fetch');

// Track recent requests to prevent rapid-fire calls
const recentRequests = new Map();
const REQUEST_COOLDOWN_MS = 1000; // 1 second cooldown between requests
let globalRequestCount = 0; // Track total requests in this instance
let activeReplicateRequests = 0; // Track concurrent Replicate API calls

// PROMPTCHAN IMAGE GENERATION FUNCTION
async function generateWithPromptchan(body, requestId, corsHeaders, email, auth0_id) {
  const { customPrompt, characterName, sex, ethnicity, hairLength, hairColor, style, shotType, source, uncensored } = body;

  console.log(`🎨 [${requestId}] Generating with Promptchan API`);
  console.log(`🎨 [${requestId}] Style parameter received:`, style);
  console.log(`🎨 [${requestId}] Shot type parameter received:`, shotType);

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
    'white': 'Caucasian features, pale skin',
    'black': 'Black African American, DARK BROWN SKIN TONE, African features, Black person',
    'indian': 'South Asian features, brown skin',
    'middle-east': 'Middle Eastern features, olive skin',
    'hispanic': 'Hispanic features, tan skin',
    'korean': 'Korean features, light Asian skin',
    'chinese': 'Chinese features, light Asian skin',
    'japanese': 'Japanese features, light Asian skin',
    'vietnamese': 'Vietnamese features, light Asian skin'
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

  // Build appearance description similar to Replicate censored version
  const appearance = [genderDesc, ethnicityDesc, hairColorDesc, hairLengthDesc].filter(Boolean).join(', ');

  // Use same prompt processing as censored/Replicate version
  let sanitizedPrompt = customPrompt.trim();
  const promptLower = customPrompt.toLowerCase();

  // Check if this is companion creation with uncensored mode
  const isCompanionCreation = source === 'companion-creation';

  // If companion creation AND uncensored, REPLACE customPrompt with random NSFW pose
  // This ensures the pose is at the START of the prompt (like chat image gen)
  if (isCompanionCreation && uncensored) {
    const nsfwPoses = sex === 'male' ? [
      'legs spread wide apart, sitting pose, cock and balls fully visible, intimate view, explicit position',
      'lying on back, legs spread open, erect penis prominent, full exposure, inviting pose',
      'bent over pose, ass up, cock hanging visible, looking back over shoulder, doggy style position',
      'standing, cock erect and visible, balls hanging, full frontal nudity, explicit masculine pose',
      'kneeling pose, legs apart, erect penis front and center, looking at camera, submissive position',
      'sitting spread eagle, cock and balls fully exposed center frame, full frontal exposure',
      'lying on side, erect penis visible, seductive side view, intimate pose',
      'squatting pose, cock and balls hanging visible, full exposure, explicit position',
      'reclining back, cock erect pointing up, inviting position, intimate view',
      'standing with legs apart, cock prominently displayed, full exposure, confident pose',
      'on knees, cock erect and visible, masculine display, intimate angle',
      'lying face down with ass up, cock visible from behind, seductive prone position'
    ] : [
      // Solo poses (14 variations)
      'lying on back with legs spread wide, arms above head, pussy visible, full frontal nudity, breasts exposed, nipples erect',
      'sitting with legs spread apart, leaning back, pussy lips visible, breasts hanging, full nude exposure',
      'kneeling upright with legs spread, hands on thighs, pussy front view, naked breasts, full body nude',
      'lying on side with top leg raised, pussy visible from side angle, breasts exposed, completely naked',
      'standing with legs apart, one hand on hip, full frontal nude, pussy visible, breasts exposed',
      'on all fours with ass up, pussy visible from behind, breasts hanging, doggy style position nude',
      'reclining with legs spread open, one arm behind head, pussy spread, breasts exposed, inviting nude pose',
      'squatting with legs wide apart, pussy fully visible, breasts exposed, low angle explicit nude',
      'lying on back with one leg raised high, pussy spread visible, breasts exposed, flexible nude pose',
      'sitting with one leg up, other spread, pussy visible, breasts exposed, asymmetric nude composition',
      'kneeling with legs spread, sitting back, pussy visible from front, breasts exposed, submissive nude angle',
      'standing bent over, ass and pussy visible from behind, breasts hanging, explicit rear nude view',
      'sitting legs spread eagle, pussy fully exposed center frame, breasts out, explicit frontal nude',
      'lying on side with legs scissored open, pussy visible, breasts exposed, intimate side nude',
      // POV poses with penis (12 variations)
      'POV blowjob, kneeling looking up, cock in mouth, lips wrapped around penis, breasts visible, focus on face and breasts',
      'POV doggy style, on all fours, ass up, cock penetrating pussy from behind, breasts hanging, looking back over shoulder',
      'POV cowgirl, riding on top, cock inside pussy, breasts bouncing, looking down at camera, hands on chest',
      'POV missionary, lying on back legs spread, cock penetrating pussy, breasts exposed, intimate face expression',
      'POV handjob, kneeling, hand stroking cock, breasts pressed together, looking at camera seductively',
      'POV titjob, breasts wrapped around cock, looking up, nipples visible, penis between breasts',
      'POV reverse cowgirl, riding cock facing away, ass visible, pussy lips stretched around penis, looking back',
      'POV prone bone, lying flat on stomach, ass up, cock penetrating from behind, face turned to side',
      'POV standing fuck, bent over, hands on wall, cock penetrating from behind, breasts hanging, ass visible',
      'POV deepthroat, head tilted back, cock deep in throat, drool visible, breasts exposed, submissive position',
      'POV spooning sex, lying on side, cock penetrating from behind, breasts visible, intimate close angle',
      'POV cumshot, kneeling mouth open, tongue out, breasts exposed, anticipating facial, seductive expression'
    ];
    const randomPose = nsfwPoses[Math.floor(Math.random() * nsfwPoses.length)];
    sanitizedPrompt = randomPose; // REPLACE prompt with pose
    console.log(`🎯 [${requestId}] Companion creation: Using NSFW pose as main prompt:`, randomPose);
  }

  // Flag to track if first Promptchan attempt failed (to skip second attempt)
  let skipSecondPromptchan = false;

  // REMOVED: Pre-enhanced check was dead code - chat buttons never matched those keywords
  // All chat/NSFW page requests now go through the explicit sex prompt path below

  if (false) { // DEAD CODE - keeping for reference but never executes
    console.log(`✅ [${requestId}] Detected pre-enhanced prompt from frontend (chat image gen), using directly without modification`);

    // Use the enhanced prompt directly without any modifications
    const negativePrompt = 'clothes, clothing, dressed, covered, censored, censorship, red box, red block, red square, pixelated, mosaic, blur bar, black bar, censor bar, underwear, bra, panties, bikini, blur, low quality, bad anatomy, extra limbs, deformed, ugly, text, watermark, logo, signature, bad hands, bad face, monochrome, black and white, giant breasts, huge ass, unrealistic proportions, exaggerated features, cartoonish body, distorted anatomy';

    // Determine Promptchan model style based on companion type
    let promptchanModelStyle = 'Photo XL+';  // Use Photo XL+ with fixed parameters
    if (style === 'anime' || style === 'animated') {
      promptchanModelStyle = 'Anime XL+';
      console.log(`🎌 [${requestId}] Using Anime XL+ model for anime companion`);
    } else {
      console.log(`📸 [${requestId}] Using Photo XL+ model with FIXED parameters (512x512, sliders -1 to 1)`);
    }

    // Enhance prompt with explicit detail keywords for maximum visibility
    let enhancedPrompt = sanitizedPrompt;

    console.log(`🔍 [${requestId}] Original enhanced prompt:`, enhancedPrompt);

    // IMPORTANT: Make genitals and explicit acts MORE visible by emphasizing keywords
    // This ensures Promptchan generates actually explicit content

    // Replace generic terms with more explicit, detailed versions
    // Female explicit enhancements
    if (sex === 'female') {
      // Make breast/tit references bigger and more explicit
      if (!enhancedPrompt.includes('huge') && !enhancedPrompt.includes('large breasts')) {
        enhancedPrompt = enhancedPrompt.replace(/\bbreasts?\b/gi, 'huge natural breasts');
        enhancedPrompt = enhancedPrompt.replace(/\btits?\b/gi, 'huge tits');
      }

      // Make ass references bigger and more explicit
      if (!enhancedPrompt.includes('big ass') && !enhancedPrompt.includes('big round ass')) {
        enhancedPrompt = enhancedPrompt.replace(/\bass\b/gi, 'big round ass');
        enhancedPrompt = enhancedPrompt.replace(/\basshole\b/gi, 'tight asshole');
      }

      // Make pussy references MORE explicit and visible
      enhancedPrompt = enhancedPrompt.replace(/\bpussy\b/gi, 'wet glistening pussy, labia visible');
      enhancedPrompt = enhancedPrompt.replace(/\bvagina\b/gi, 'wet vagina, lips spread');

      // Emphasize pussy lips/labia visibility
      if (enhancedPrompt.includes('pussy lips') && !enhancedPrompt.includes('visible')) {
        enhancedPrompt = enhancedPrompt.replace(/pussy lips/gi, 'pussy lips clearly visible, labia spread');
      }

      // Make oral sex more explicit
      if (enhancedPrompt.toLowerCase().includes('blowjob') || enhancedPrompt.toLowerCase().includes('oral sex')) {
        if (!enhancedPrompt.includes('cock in mouth') && !enhancedPrompt.includes('penis in mouth')) {
          enhancedPrompt = enhancedPrompt.replace(/\bblowjob\b/gi, 'blowjob, big cock deep in mouth');
          enhancedPrompt = enhancedPrompt.replace(/\boral sex\b/gi, 'oral sex, erect penis filling mouth');
        }
      }
    }

    // Male explicit enhancements
    if (sex === 'male') {
      // Make cock/penis references bigger and more explicit
      if (!enhancedPrompt.includes('big cock') && !enhancedPrompt.includes('large penis')) {
        enhancedPrompt = enhancedPrompt.replace(/\bcock\b/gi, 'big hard cock');
        enhancedPrompt = enhancedPrompt.replace(/\bpenis\b/gi, 'big erect penis');
        enhancedPrompt = enhancedPrompt.replace(/\bdick\b/gi, 'big hard dick');
      }

      // Make balls more explicit
      enhancedPrompt = enhancedPrompt.replace(/\bballs\b/gi, 'balls hanging, testicles visible');
    }

    // Penetration emphasis (both sexes)
    if (enhancedPrompt.toLowerCase().includes('penetration') || enhancedPrompt.toLowerCase().includes('penetrating')) {
      if (!enhancedPrompt.includes('visible penetration')) {
        enhancedPrompt = enhancedPrompt.replace(/\bpenetration\b/gi, 'visible penetration, cock sliding deep inside');
        enhancedPrompt = enhancedPrompt.replace(/\bpenetrating\b/gi, 'penetrating deep, cock clearly visible entering');
      }
    }

    // Sex act emphasis - make it MORE explicit
    if (enhancedPrompt.toLowerCase().includes('having sex') || enhancedPrompt.toLowerCase().includes('fucking')) {
      if (!enhancedPrompt.includes('genitals visible')) {
        enhancedPrompt += ', genitals clearly visible, explicit sexual contact';
      }
    }

    console.log(`✨ [${requestId}] ENHANCED explicit prompt:`, enhancedPrompt);

    // Simplified NSFW boost - shorter to prevent Promptchan timeout
    const nsfwBoost = ', pornographic, explicit nudity, NSFW';

    enhancedPrompt += nsfwBoost;
    console.log(`🔥 [${requestId}] Added minimal NSFW boost:`, nsfwBoost);

    // Add extra nudity emphasis for ALL poses (Photo XL+ tends to add clothes)
    enhancedPrompt += ', completely naked, fully nude, no clothes at all, zero clothing, bare naked body, exposed genitals';
    console.log(`🔥 [${requestId}] Added nudity boost to pre-enhanced prompt`);

    const promptchanRequest = {
      prompt: enhancedPrompt,
      negative_prompt: negativePrompt,
      style: promptchanModelStyle,  // Use correct model based on companion style
      quality: 'Ultra', // Only valid option
      image_size: '512x512', // Valid size for Photo XL+ (was 256x256 - not supported!)
      creativity: 50, // High creativity for Photo XL+
      seed: -1,
      filter: 'None', // No filter for fully uncensored (removes secondary censorship blocks)
      emotion: 'Default',
      detail: 0, // Detail level (0 = default)
      age_slider: 23, // Slightly younger for more attractive faces
      weight_slider: -0.5, // Slimmer body (range: -1 to 1, was -10!)
      breast_slider: 0.3,  // Moderate breast size (range: -1 to 1, was 30!)
      ass_slider: 0.3  // Moderate ass size (range: -1 to 1, was 30!)
    };

    console.log(`📤 [${requestId}] Using pre-enhanced prompt directly:`, promptchanRequest);

    // NO RETRIES - try Promptchan once, if fails go straight to Replicate to avoid 10s timeout
    let promptchanSuccess = false;
    let promptchanResult = null;

    try {
      console.log(`🎲 [${requestId}] Trying Promptchan (no timeout - let it complete naturally)...`);

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
        console.log(`⚠️ [${requestId}] Promptchan failed, will fallback to Replicate below`);
        // Don't throw - just continue to Replicate fallback
      } else {
        const result = await response.json();
        console.log(`✅ [${requestId}] Promptchan image generated with pre-enhanced prompt, gems used:`, result.gems);
        promptchanSuccess = true;
        promptchanResult = result;
      }

    } catch (error) {
      console.error(`❌ [${requestId}] Promptchan error:`, error.message);
      console.log(`⚠️ [${requestId}] Promptchan failed, will fallback to Replicate below`);
      // Don't throw - just continue to Replicate fallback
    }

    // If Promptchan succeeded, return the result
    if (promptchanSuccess && promptchanResult) {
      // Increment usage counter
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
          imageUrl: promptchanResult.image,
          fullPrompt: sanitizedPrompt,
          customPrompt: customPrompt,
          isAnimeStyle: false,
          provider: 'promptchan'
        })
      };
    }

    // Promptchan failed for pre-enhanced prompt - return 500 to trigger Replicate fallback
    console.log(`⚠️ [${requestId}] Pre-enhanced Promptchan failed, returning 500 for Replicate fallback`);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Promptchan failed' })
    };
  }

  // If not pre-enhanced, continue with regular enhancement logic
  console.log(`📝 [${requestId}] Prompt not pre-enhanced, applying backend enhancement`);

  // SPECIAL CASE: For uncensored chat/image-generator with explicit sex prompts, use companion generation format
  // These prompts already have explicit details (blowjob, fucking, etc.) - treat same as image-generator
  const isUncensoredExplicit = (source === 'chat' || source === 'image-generator') && (
    promptLower.includes('blowjob') ||
    promptLower.includes('fucking') ||
    promptLower.includes('penetrat') ||
    promptLower.includes('sucking cock') ||
    promptLower.includes('cock in mouth') ||
    promptLower.includes('dick in pussy') ||
    promptLower.includes('threesome') ||
    promptLower.includes('anal sex') ||
    promptLower.includes('double penetration') ||
    promptLower.includes('eating out') ||
    promptLower.includes('eaten out') ||
    promptLower.includes('69 position') ||
    promptLower.includes('oral sex') ||
    promptLower.includes('pussy licking') ||
    promptLower.includes('cunnilingus') ||
    promptLower.includes('rimming') ||
    promptLower.includes('ass licking') ||
    promptLower.includes('titfuck') ||
    promptLower.includes('tit fuck') ||
    promptLower.includes('handjob') ||
    promptLower.includes('fingering') ||
    promptLower.includes('pussy fingering') ||
    promptLower.includes('doggy style') ||
    promptLower.includes('cowgirl') ||
    promptLower.includes('reverse cowgirl') ||
    promptLower.includes('missionary') ||
    promptLower.includes('spoon') ||
    promptLower.includes('spooning') ||
    promptLower.includes('bent over') ||
    promptLower.includes('legs spread') ||
    promptLower.includes('spread eagle') ||
    promptLower.includes('on knees') ||
    promptLower.includes('spitroast') ||
    promptLower.includes('gangbang') ||
    promptLower.includes('cumshot') ||
    promptLower.includes('facial') ||
    promptLower.includes('creampie')
  );

  if (isUncensoredExplicit) {
    console.log(`🔥 [${requestId}] Detected EXPLICIT sex prompt (${source}) - using companion generation format`);

    // Use companion traits (appearance) instead of generic gender description
    const randomBackgrounds = [
      'luxury bedroom with silk sheets, warm golden lighting',
      'five-star hotel suite bedroom, city lights',
      'modern penthouse bedroom, exposed brick',
      'romantic cabin bedroom, fireplace crackling'
    ];
    const randomBg = randomBackgrounds[Math.floor(Math.random() * randomBackgrounds.length)];

    // Add extra nudity emphasis for ALL explicit sex poses (Photo XL+ tends to add clothes)
    const nudityBoost = ', completely naked, fully nude, no clothes at all, zero clothing, bare naked body, exposed genitals';

    let directPrompt;
    if (style === 'anime' || style === 'animated') {
      directPrompt = `${appearance}, ${sanitizedPrompt}${nudityBoost}, anime style, detailed anime art, high quality artwork, vibrant colors, explicit hardcore sex, ${randomBg}`;
    } else {
      directPrompt = `${appearance}, ${sanitizedPrompt}${nudityBoost}, photorealistic, professional photography, explicit hardcore sex, porn scene, ${randomBg}`;
    }

    console.log(`✅ [${requestId}] Direct sex prompt:`, directPrompt);

    const negativePrompt = 'clothes, clothing, dressed, covered, censored, censorship, red box, red block, red square, pixelated, mosaic, blur bar, black bar, censor bar, underwear, bra, panties, bikini, blur, low quality, bad anatomy, extra limbs, deformed, ugly, text, watermark, logo, signature, bad hands, bad face, monochrome, black and white, giant breasts, huge ass, unrealistic proportions, exaggerated features, cartoonish body, distorted anatomy';

    const promptchanStyle = (style === 'anime' || style === 'animated') ? 'Anime XL+' : 'Photo XL+';

    // For explicit sex acts, use HIGH creativity (50) for better pose interpretation
    // Complex poses like blowjob, doggy, cowgirl need more creative freedom
    const promptchanRequest = {
      prompt: directPrompt,
      negative_prompt: negativePrompt,
      style: promptchanStyle,
      quality: 'Ultra', // Only valid option
      image_size: '512x512', // Valid size for Photo XL+ (was 256x256 - not supported!)
      creativity: 50, // HIGH creativity for complex sex poses with Photo XL+
      seed: -1,
      filter: 'None', // No filter for fully uncensored (removes secondary censorship blocks)
      emotion: 'Default',
      detail: 0, // Detail level (0 = default)
      age_slider: 23, // Slightly younger for more attractive faces
      weight_slider: -0.5, // Slimmer body (range: -1 to 1, was -10 out of range!)
      breast_slider: sex === 'male' ? 0 : 0.3,  // Moderate breast size (range: -1 to 1, was 30!)
      ass_slider: sex === 'male' ? 0 : 0.3      // Moderate ass size (range: -1 to 1, was 30!)
    };

    console.log(`📤 [${requestId}] Promptchan request with DIRECT sex prompt:`, promptchanRequest);

    // NO RETRIES - try Promptchan once, if fails go straight to Replicate to avoid 10s timeout
    let promptchanSuccess = false;
    let promptchanResult = null;

    try {
      // No timeout for explicit sex prompts - let Promptchan complete naturally
      console.log(`🎲 [${requestId}] Calling Promptchan for explicit sex (no timeout - let it complete naturally)...`);

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
        console.log(`⚠️ [${requestId}] Promptchan failed, will skip second attempt and go to Replicate`);
        skipSecondPromptchan = true; // Skip second Promptchan attempt
        // Don't throw - just continue to Replicate fallback
      } else {
        const result = await response.json();
        console.log(`✅ [${requestId}] Promptchan explicit sex image generated, gems used:`, result.gems);
        promptchanSuccess = true;
        promptchanResult = result;
      }

    } catch (error) {
      console.error(`❌ [${requestId}] Promptchan error:`, error.message);
      console.log(`⚠️ [${requestId}] Promptchan failed, will skip second attempt and go to Replicate`);
      skipSecondPromptchan = true; // Skip second Promptchan attempt
      // Don't throw - just continue to Replicate fallback
    }

    // If Promptchan succeeded, return the result
    if (promptchanSuccess && promptchanResult) {
      // Increment usage counter
      if ((source === 'chat' || source === 'image-generator') && (email || auth0_id)) {
        console.log(`📈 [${requestId}] Incrementing usage counter for ${source} (Promptchan explicit)`);
        try {
          const incrementResponse = await fetch(`${process.env.NETLIFY_FUNCTIONS_URL || 'https://selira.ai/.netlify/functions'}/selira-increment-image-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: auth0_id })
          });

          if (incrementResponse.ok) {
            console.log(`✅ [${requestId}] Usage incremented successfully (Promptchan explicit)`);
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
          imageUrl: promptchanResult.image,
          fullPrompt: directPrompt,
          customPrompt: customPrompt,
          isAnimeStyle: false,
          provider: 'promptchan'
        })
      };
    }

    // If we get here, Promptchan failed - fall through to Replicate below
    console.log(`⚠️ [${requestId}] Promptchan failed, falling back to Replicate`);
  }

  // Determine shot type (same as censored version)
  const isFullBody = shotType === 'fullbody' || promptLower.includes('full body') ||
                     promptLower.includes('fullbody') || promptLower.includes('standing') ||
                     promptLower.includes('beach') || promptLower.includes('pose');

  // Smart context enhancement - only add backgrounds if prompt is very minimal
  let contextualEnhancement = '';

  // Check if prompt already has detailed instructions (poses, positions, etc.)
  const hasDetailedInstructions = promptLower.includes('position') ||
                                   promptLower.includes('pose') ||
                                   promptLower.includes('cowgirl') ||
                                   promptLower.includes('doggy') ||
                                   promptLower.includes('missionary') ||
                                   promptLower.includes('blowjob') ||
                                   promptLower.includes('standing') ||
                                   promptLower.includes('sitting') ||
                                   promptLower.includes('lying') ||
                                   promptLower.includes('kneeling') ||
                                   customPrompt.length > 50; // If custom prompt is long, trust it

  // Only add context if prompt is minimal and doesn't have specific instructions
  if (!hasDetailedInstructions) {
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
      // Random sexy diverse backgrounds for ALL uncensored images (companion + chat)
      const randomBackgrounds = [
        ', luxury bedroom with silk sheets, warm golden lighting, candles, rose petals, romantic intimate atmosphere',
        ', five-star hotel suite bedroom, floor-to-ceiling windows, city lights, king size bed, luxury decor',
        ', private jacuzzi suite, steam rising, warm water, candles, mood lighting, intimate spa atmosphere',
        ', tropical beach villa bedroom, ocean view, sunset lighting, open curtains, vacation paradise vibes',
        ', modern penthouse bedroom, exposed brick, designer furniture, warm ambient lighting, urban luxury',
        ', romantic cabin bedroom, fireplace crackling, cozy bed, warm glow, intimate mountain retreat',
        ', luxury yacht master bedroom, panoramic ocean views, white linens, nautical elegance, private luxury',
        ', boutique hotel suite, four-poster bed, silk curtains, chandelier, warm romantic lighting, opulent',
        ', desert resort bedroom, moroccan decor, colorful pillows, lantern lighting, exotic romantic atmosphere',
        ', beachfront bungalow bedroom, tropical breeze, gauze curtains, sunset glow, paradise island vibes',
        ', upscale loft bedroom, modern art, designer bed, floor lamps, industrial chic luxury',
        ', villa infinity pool bedroom, waterfront view, tropical paradise, warm lighting, luxury resort',
        ', countryside estate bedroom, vintage elegance, canopy bed, warm firelight, classic romance',
        ', rooftop suite bedroom, city skyline, neon lights reflecting, modern luxury, urban night vibes',
        ', private spa bedroom, massage table, essential oils, candles, zen atmosphere, sensual wellness',
        ', contemporary bedroom, minimalist luxury, designer furniture, natural light, sophisticated intimate space',
        ', tropical rainforest suite, jungle view, natural sounds, earthy tones, exotic paradise bedroom',
        ', parisian apartment bedroom, classic elegance, ornate details, warm lighting, romantic french vibes'
      ];
      const randomBg = randomBackgrounds[Math.floor(Math.random() * randomBackgrounds.length)];
      contextualEnhancement += randomBg;
      console.log(`🎲 [${requestId}] Random background for uncensored:`, randomBg);
    }
  } else {
    console.log(`📝 [${requestId}] User provided detailed instructions - skipping auto background`);
  }

  // Check if this is companion creation - different enhancement approach
  const isCompanionCreation = source === 'companion-creation';

  let nsfwEnhancement;
  // For UNCENSORED mode, always use EXTREME explicit prompts (even for companion creation)
  // For CENSORED mode, use mild tasteful prompts for companion creation
  if (uncensored) {
    // UNCENSORED: EXTREME explicit prompts for Promptchan Photo XL+
    nsfwEnhancement = sex === 'male'
      ? ', naked man, big hard erect penis visible and prominent in frame, cock standing up, balls hanging visible, shaft and head clearly shown, genitals fully exposed and in focus, muscular body, explicit male nudity, pornographic XXX adult content, full frontal nudity showing everything, aroused hard cock, intimate POV angle'
      : ', naked woman, huge natural breasts exposed with erect nipples visible, wet glistening pussy clearly visible with labia spread open, pussy lips prominent in frame, genitals fully exposed and in focus, legs spread wide showing everything, beautiful curves, explicit female nudity, pornographic XXX adult content, full frontal nudity, aroused wet pussy, intimate POV angle showing genitals';
    console.log(`🔥 [${requestId}] UNCENSORED mode - using EXTREME explicit prompts`);
  } else if (isCompanionCreation) {
    // CENSORED companion creation: tasteful nude portrait
    nsfwEnhancement = sex === 'male'
      ? ', naked, nude, bare chest showing, muscular body, confident pose, seductive expression, sensual, intimate, artistic nude photography, tasteful nudity, elegant masculine beauty'
      : ', naked, nude, bare breasts showing, beautiful curves, elegant pose, seductive gaze, alluring expression, sensual, intimate, artistic nude photography, soft lighting, tasteful nudity, natural beauty, elegant feminine beauty';
    console.log(`🎨 [${requestId}] CENSORED companion creation - using tasteful nude prompts`);
  } else {
    // CENSORED chat/image-generator: explicit but not as extreme as uncensored
    nsfwEnhancement = sex === 'male'
      ? ', naked man, big hard erect penis visible and prominent in frame, cock standing up, balls hanging visible, shaft and head clearly shown, genitals fully exposed and in focus, muscular body, explicit male nudity, pornographic XXX adult content, full frontal nudity showing everything, aroused hard cock, intimate POV angle'
      : ', naked woman, huge natural breasts exposed with erect nipples visible, wet glistening pussy clearly visible with labia spread open, pussy lips prominent in frame, genitals fully exposed and in focus, legs spread wide showing everything, beautiful curves, explicit female nudity, pornographic XXX adult content, full frontal nudity, aroused wet pussy, intimate POV angle showing genitals';
    console.log(`💬 [${requestId}] CENSORED chat/image-gen - using explicit prompts`);
  }

  // Build prompt with shot description matching Replicate format
  let shotDesc, enhancedPrompt;

  if (style === 'anime' || style === 'animated') {
    shotDesc = isFullBody ? 'full body anime illustration' : 'anime portrait';
    // For companion creation: focus on portrait/full body beauty shot
    if (isCompanionCreation) {
      enhancedPrompt = `${shotDesc} of ${appearance}, anime style, ${sanitizedPrompt}${contextualEnhancement}${nsfwEnhancement}, detailed anime art, vibrant colors, clean background, single character`;
    } else {
      // For image generator: keep appearance emphasis
      enhancedPrompt = `${appearance}, ${shotDesc}, anime style, ${sanitizedPrompt}${contextualEnhancement}${nsfwEnhancement}, ${appearance}, detailed anime art, vibrant colors`;
    }
  } else {
    shotDesc = isFullBody ? 'full body photograph' : 'portrait photograph';
    // For companion creation: match Replicate's format for consistency
    if (isCompanionCreation) {
      enhancedPrompt = `${shotDesc} of ${appearance}, ${sanitizedPrompt}${contextualEnhancement}${nsfwEnhancement}, realistic skin texture, realistic facial features, realistic proportions, professional photography, clean background, single person`;
    } else {
      // For image generator: keep appearance emphasis
      enhancedPrompt = `${appearance}, ${shotDesc}, ${sanitizedPrompt}${contextualEnhancement}${nsfwEnhancement}, ${appearance}, photorealistic, ultra realistic, professional photography, detailed`;
    }
  }

  console.log(`📸 [${requestId}] Shot type: ${shotDesc} (isFullBody: ${isFullBody})`);

  console.log(`✨ [${requestId}] Promptchan enhanced prompt:`, enhancedPrompt);

  // Add extra nudity emphasis for ALL poses when uncensored (Photo XL+ tends to add clothes)
  if (uncensored) {
    enhancedPrompt += ', completely naked, fully nude, no clothes at all, zero clothing, bare naked body, exposed genitals';
    console.log(`🔥 [${requestId}] Added nudity boost to enhanced prompt (uncensored mode)`);
    // NOTE: NSFW poses are now injected at the START via sanitizedPrompt (lines 84-131)
    // This ensures poses are the PRIMARY instruction, not an afterthought
  }

  // Determine Promptchan style based on our style parameter
  let promptchanStyle = 'Photo XL+';  // Use Photo XL+ with fixed parameters (512x512, sliders -1 to 1)
  let promptchanFilter = 'None';       // No filter for fully uncensored (removes secondary censorship blocks)

  if (style === 'anime' || style === 'animated') {
    promptchanStyle = 'Anime XL+';
    promptchanFilter = 'None';  // No filter for fully uncensored (removes secondary censorship blocks)
    console.log(`🎌 [${requestId}] Using ANIME style for Promptchan`);
  } else {
    console.log(`📸 [${requestId}] Using Photo XL+ for Promptchan with FIXED parameters`);
  }

  // Add negative prompt to reduce unwanted elements and extreme proportions
  const negativePrompt = 'clothes, clothing, dressed, covered, censored, censorship, red box, red block, red square, pixelated, mosaic, blur bar, black bar, censor bar, underwear, bra, panties, bikini, blur, low quality, bad anatomy, extra limbs, deformed, ugly, text, watermark, logo, signature, bad hands, bad face, monochrome, black and white, giant breasts, huge ass, unrealistic proportions, exaggerated features, cartoonish body, distorted anatomy';

  // Build Promptchan API request
  // For solo/simple poses, use HIGH creativity (50) for better pose variety
  const promptchanRequest = {
    prompt: enhancedPrompt,
    negative_prompt: negativePrompt,
    style: promptchanStyle,
    quality: 'Ultra', // Only valid option - 1 Gem
    image_size: '512x512', // Valid size for Photo XL+ (was 256x256 - not supported!)
    creativity: 50, // High creativity for Photo XL+ (was 20, increased to 50)
    seed: -1, // Random seed
    filter: promptchanFilter, // No filter (uncensored)
    emotion: 'Default',
    detail: 0, // Detail level (0 = default, keeping simple for now)
    age_slider: 23, // Slightly younger for more attractive faces
    weight_slider: -0.5, // Slimmer body (range: -1 to 1, was -10 out of range!)
    breast_slider: sex === 'male' ? 0 : 0.3, // Moderate breast size (range: -1 to 1, was 30!)
    ass_slider: sex === 'male' ? 0 : 0.3 // Moderate ass size (range: -1 to 1, was 30!)
  };

  console.log(`📤 [${requestId}] Promptchan request (Ultra quality):`, promptchanRequest);

  // Skip second Promptchan attempt if first attempt failed (GPU error)
  if (skipSecondPromptchan) {
    console.log(`⏭️ [${requestId}] Skipping second Promptchan attempt (first failed) - going straight to Replicate`);
    throw new Error('Skipping Promptchan - first attempt failed');
  }

  try {
    // No timeout for image-generator page - let Promptchan complete naturally
    console.log(`🎲 [${requestId}] Calling Promptchan (no timeout - let it complete naturally)...`);

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
    if (error.name === 'AbortError') {
      console.error(`⏱️ [${requestId}] Promptchan timeout after 20s - will fallback to Replicate`);
    } else {
      console.error(`❌ [${requestId}] Promptchan generation error:`, error);
    }
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
  console.log(`🚨 [${requestId}] FUNCTION VERSION: v1.2 - WITH UNCENSORED DEBUG LOGS`);

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
      uncensoredType: typeof uncensored,
      email,
      auth0_id: auth0_id ? auth0_id.substring(0, 15) + '...' : 'none'
    });

    // ROUTE TO PROMPTCHAN FOR UNCENSORED IMAGES WITH REPLICATE FALLBACK
    console.log(`🔍 [${requestId}] Uncensored check: uncensored=${uncensored}, type=${typeof uncensored}, === true: ${uncensored === true}, == true: ${uncensored == true}`);
    if (uncensored === true) {
      console.log(`🔓 [${requestId}] Uncensored mode - routing to Promptchan API`);
      const promptchanResult = await generateWithPromptchan(body, requestId, corsHeaders, email, auth0_id);

      // If Promptchan fails (500 error), fall back to Replicate (censored)
      if (promptchanResult.statusCode === 500) {
        console.log(`⚠️ [${requestId}] Promptchan failed, falling back to Replicate (censored)`);
        // Continue to Replicate below (don't return, let it fall through)
      } else {
        // Promptchan succeeded, return the result
        return promptchanResult;
      }
    }

    // Replicate (censored) - either explicitly requested or fallback from Promptchan failure
    console.log(`🔒 [${requestId}] Using Replicate API ${uncensored ? '(fallback from Promptchan)' : '(censored mode)'}`);

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
        const limitResponse = await fetch(`${process.env.NETLIFY_FUNCTIONS_URL || 'https://selira.ai/.netlify/functions'}/selira-check-image-limit`, {
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
      // If no specific background mentioned, add random SEXY diverse backgrounds
      const randomBackgrounds = [
        ', luxury bedroom with silk sheets, warm golden lighting, candles, rose petals, romantic intimate atmosphere',
        ', five-star hotel suite bedroom, floor-to-ceiling windows, city lights, king size bed, luxury decor',
        ', private jacuzzi suite, steam rising, warm water, candles, mood lighting, intimate spa atmosphere',
        ', tropical beach villa bedroom, ocean view, sunset lighting, open curtains, vacation paradise vibes',
        ', modern penthouse bedroom, exposed brick, designer furniture, warm ambient lighting, urban luxury',
        ', romantic cabin bedroom, fireplace crackling, cozy bed, warm glow, intimate mountain retreat',
        ', luxury yacht master bedroom, panoramic ocean views, white linens, nautical elegance, private luxury',
        ', boutique hotel suite, four-poster bed, silk curtains, chandelier, warm romantic lighting, opulent',
        ', desert resort bedroom, moroccan decor, colorful pillows, lantern lighting, exotic romantic atmosphere',
        ', beachfront bungalow bedroom, tropical breeze, gauze curtains, sunset glow, paradise island vibes',
        ', upscale loft bedroom, modern art, designer bed, floor lamps, industrial chic luxury',
        ', villa infinity pool bedroom, waterfront view, tropical paradise, warm lighting, luxury resort',
        ', countryside estate bedroom, vintage elegance, canopy bed, warm firelight, classic romance',
        ', rooftop suite bedroom, city skyline, neon lights reflecting, modern luxury, urban night vibes',
        ', private spa bedroom, massage table, essential oils, candles, zen atmosphere, sensual wellness',
        ', contemporary bedroom, minimalist luxury, designer furniture, natural light, sophisticated intimate space',
        ', tropical rainforest suite, jungle view, natural sounds, earthy tones, exotic paradise bedroom',
        ', parisian apartment bedroom, classic elegance, ornate details, warm lighting, romantic french vibes'
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
        // Use auth0_id directly (should be Airtable record ID from frontend)
        const userId = auth0_id;

        console.log(`📈 [${requestId}] Full increment details:`, {
          userId: userId,
          userIdLength: userId?.length,
          isAirtableId: userId?.startsWith('rec'),
          isAuth0Id: userId?.startsWith('auth0|'),
          isSupabaseId: userId?.length === 36 && userId?.includes('-'),
          auth0_id_param: auth0_id,
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