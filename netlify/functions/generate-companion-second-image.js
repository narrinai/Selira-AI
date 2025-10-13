// Generate second image for companion with different pose
// Uses selira-generate-custom-image function (same as fix-replicate-urls.js)
// Saves to avatar_url_2 field in Airtable

const fetch = require('node-fetch');

// Build custom prompt for second image (same style as fix-replicate-urls.js + different poses)
function buildSecondImagePrompt({ sex, companionType }) {
  const isAnimeStyle = companionType === 'anime';

  // Seductive clothing options for second pose
  const revealingClothing = sex === 'male'
    ? ['shirtless showing abs', 'tight underwear', 'revealing swim trunks', 'open shirt muscular chest', 'barely covered lower body', 'athletic shorts shirtless']
    : ['ultra-revealing lingerie', 'micro string bikini', 'see-through dress', 'topless with tiny shorts', 'barely covered outfit', 'transparent lingerie', 'tiny thong bikini'];

  const randomClothing = revealingClothing[Math.floor(Math.random() * revealingClothing.length)];

  // Different poses for variety (not front-facing like first image)
  const poses = sex === 'male'
    ? [
        'lying on bed looking at camera',
        'sitting on edge of bed leaning back',
        'kneeling on bed looking over shoulder',
        'standing with side profile showing body',
        'reclining on couch with confident expression',
        'sitting with legs spread showing confidence',
        'lying sideways propped up on elbow'
      ]
    : [
        'lying on bed looking at camera seductively',
        'sitting on edge of bed legs crossed showing curves',
        'kneeling on bed arching back showing body',
        'standing with side profile highlighting curves',
        'reclining on bed with inviting pose',
        'sitting with legs to side showing feminine pose',
        'lying sideways showing curves and body shape',
        'on all fours looking back at camera playfully'
      ];

  const randomPose = poses[Math.floor(Math.random() * poses.length)];

  // Build prompt based on style (anime vs realistic) with specific pose
  let prompt;
  if (isAnimeStyle) {
    if (sex === 'male') {
      prompt = `very attractive face, extremely seductive expression, detailed anime art, ${randomPose}, very erotic pose, wearing ${randomClothing}, vibrant colors, high quality anime artwork, detailed facial features, anime eyes, perfect anatomy, correct human anatomy, two arms, two hands, very sensual pose, muscular chest, abs visible, athletic build, masculine physique, exposed skin, revealing clothing, single character, solo, no extra limbs, proper proportions, bedroom background, intimate setting, seductive atmosphere`;
    } else {
      prompt = `very attractive face, extremely seductive expression, detailed anime art, ${randomPose}, very erotic pose, wearing ${randomClothing}, vibrant colors, high quality anime artwork, detailed facial features, anime eyes, perfect anatomy, correct human anatomy, two arms, two hands, very sensual pose, large breasts, curvy figure, big butt, voluptuous body, exposed skin, revealing clothing, single character, solo, no extra limbs, proper proportions, bedroom background, intimate setting, seductive atmosphere`;
    }
  } else {
    if (sex === 'male') {
      prompt = `attractive face, seductive expression, ${randomPose}, alluring pose, wearing ${randomClothing}, photorealistic, professional photography, soft romantic lighting, glamour photography style, eye contact, sharp focus, attractive model, confident pose, single person, solo, perfect human anatomy, two arms, two hands, correct proportions, no extra limbs, muscular chest, abs visible, athletic masculine body, bedroom background, beach setting, luxury suite, intimate atmosphere`;
    } else {
      prompt = `attractive face, seductive expression, ${randomPose}, alluring pose, wearing ${randomClothing}, photorealistic, professional photography, soft romantic lighting, glamour photography style, eye contact, sharp focus, attractive model, confident pose, single person, solo, perfect human anatomy, two arms, two hands, correct proportions, no extra limbs, bedroom background, beach setting, luxury suite, intimate atmosphere`;
    }
  }

  return prompt;
}

exports.handler = async function(event, context) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
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
    const { companionSlug } = JSON.parse(event.body);

    if (!companionSlug) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'companionSlug is required' })
      };
    }

    console.log(`🎨 Generating second image for companion: ${companionSlug}`);

    // 1. Fetch companion data from Airtable - use Selira-specific variables
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      throw new Error('Airtable credentials not configured');
    }

    console.log('✅ Using Selira Airtable credentials');

    // Search for companion by slug
    const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula={Slug}='${companionSlug}'`;

    const companionResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!companionResponse.ok) {
      throw new Error(`Failed to fetch companion: ${companionResponse.statusText}`);
    }

    const companionData = await companionResponse.json();

    if (!companionData.records || companionData.records.length === 0) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Companion not found' })
      };
    }

    const companion = companionData.records[0];
    const fields = companion.fields;

    console.log(`✅ Found companion: ${fields.Name}`);
    console.log(`📋 Content filter:`, fields.content_filter);

    // 2. Determine if censored or uncensored - check both field name variations
    const contentFilter = fields.content_filter || fields['Content Filter'] || 'Censored';
    const isCensored = contentFilter === 'Censored';
    const companionType = fields.companion_type || fields['Companion Type'] || 'realistic';
    const sex = fields.sex || fields.Sex || 'female';
    const ethnicity = fields.ethnicity || fields.Ethnicity || 'white';
    const hairLength = fields.hair_length || fields['Hair Length'] || 'long';
    const hairColor = fields.hair_color || fields['Hair Color'] || 'brown';

    console.log(`🎨 Companion details:`, {
      type: companionType,
      sex,
      ethnicity,
      hairLength,
      hairColor,
      censored: isCensored
    });

    // 3. Generate image using existing custom image generation function (same as fix-replicate-urls.js)
    const customPrompt = buildSecondImagePrompt({
      sex,
      companionType
    });

    console.log('📝 Custom prompt:', customPrompt.substring(0, 100) + '...');

    // Call the existing selira-generate-custom-image function
    const imageGenUrl = `${process.env.URL || 'https://selira.ai'}/.netlify/functions/selira-generate-custom-image`;

    const imageGenResponse = await fetch(imageGenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customPrompt: customPrompt,
        characterName: fields.Name,
        category: companionType === 'anime' ? 'anime-manga' : 'default',
        style: companionType,
        shotType: 'portrait',
        sex: sex,
        ethnicity: ethnicity,
        hairLength: hairLength,
        hairColor: hairColor,
        uncensored: !isCensored
      })
    });

    if (!imageGenResponse.ok) {
      const errorText = await imageGenResponse.text();
      throw new Error(`Image generation failed: ${errorText}`);
    }

    const imageResult = await imageGenResponse.json();

    if (!imageResult.success || !imageResult.imageUrl) {
      throw new Error('No image URL returned from generation');
    }

    const imageUrl = imageResult.imageUrl;
    console.log(`✅ Generated image URL: ${imageUrl}`);

    // 4. Save to Airtable avatar_url_2 field
    const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters/${companion.id}`;

    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'avatar_url_2': imageUrl
        }
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update Airtable: ${errorText}`);
    }

    console.log(`✅ Saved image URL to Airtable`);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        imageUrl,
        companionName: fields.Name,
        censored: isCensored
      })
    };

  } catch (error) {
    console.error('❌ Error generating second image:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};

