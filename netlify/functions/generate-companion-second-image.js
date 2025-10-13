// Generate second image for companion with different pose
// Uses Replicate for censored companions, Promptchan for uncensored
// Saves to avatar_url_2 field in Airtable

const fetch = require('node-fetch');

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

    // 3. Generate image with different pose
    let imageUrl;

    if (isCensored) {
      // Use Replicate for censored companions
      imageUrl = await generateWithReplicate({
        sex,
        ethnicity,
        hairLength,
        hairColor,
        companionType
      });
    } else {
      // Use Promptchan for uncensored companions
      imageUrl = await generateWithPromptchan({
        sex,
        ethnicity,
        hairLength,
        hairColor,
        companionType
      });
    }

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

// Generate with Replicate (censored)
async function generateWithReplicate({ sex, ethnicity, hairLength, hairColor, companionType }) {
  console.log('🎨 Generating with Replicate (censored)...');

  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN_SELIRA || process.env.REPLICATE_API_TOKEN;

  if (!REPLICATE_API_TOKEN) {
    throw new Error('Replicate API token not configured');
  }

  console.log('✅ Using Replicate API token');

  // Build appearance description
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
    'long': 'long flowing hair'
  };

  const hairColorMap = {
    'brown': 'brown hair',
    'black': 'black hair',
    'blonde': 'blonde hair',
    'red': 'red hair',
    'auburn': 'auburn hair',
    'gray': 'gray hair',
    'white': 'white hair'
  };

  const ethnicityDesc = ethnicityMap[ethnicity] || '';
  const hairLengthDesc = hairLength === 'bald' ? 'bald' : hairLengthMap[hairLength] || 'styled hair';
  const hairColorDesc = hairLength === 'bald' ? '' : (hairColorMap[hairColor] || 'brown hair');

  const appearance = [genderDesc, ethnicityDesc, hairColorDesc, hairLengthDesc].filter(Boolean).join(', ');

  // Different pose for second image - more dynamic/seductive
  const poses = [
    'sitting on bed, looking at camera with sultry expression',
    'leaning against wall, playful smile',
    'lying on stomach, propped up on elbows, flirty gaze',
    'standing with hand on hip, confident pose',
    'kneeling on bed, looking over shoulder'
  ];

  const randomPose = poses[Math.floor(Math.random() * poses.length)];

  const prompt = `Professional photograph of ${appearance}, ${randomPose}, soft lighting, photorealistic, high quality, 8k, detailed`;

  const negativePrompt = 'ugly, deformed, noisy, blurry, distorted, out of focus, bad anatomy, extra limbs, poorly drawn face, poorly drawn hands, missing fingers, nudity, nude, low quality, watermark, text, signature';

  console.log('📝 Prompt:', prompt);

  const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: 'ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4',
      input: {
        prompt: prompt,
        negative_prompt: negativePrompt,
        width: 512,
        height: 768,
        num_outputs: 1,
        guidance_scale: 7.5,
        num_inference_steps: 50
      }
    })
  });

  if (!replicateResponse.ok) {
    const errorText = await replicateResponse.text();
    throw new Error(`Replicate API error: ${errorText}`);
  }

  const prediction = await replicateResponse.json();
  console.log('⏳ Prediction started:', prediction.id);

  // Poll for completion
  let result = prediction;
  let attempts = 0;
  const maxAttempts = 60; // 60 seconds max

  while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`
      }
    });

    result = await pollResponse.json();
    attempts++;
  }

  if (result.status === 'failed') {
    throw new Error('Replicate generation failed');
  }

  if (!result.output || result.output.length === 0) {
    throw new Error('No output from Replicate');
  }

  return result.output[0];
}

// Generate with Promptchan (uncensored)
async function generateWithPromptchan({ sex, ethnicity, hairLength, hairColor, companionType }) {
  console.log('🎨 Generating with Promptchan (uncensored)...');

  const PROMPTCHAN_API_KEY = process.env.PROMPTCHAN_API_KEY_SELIRA;

  if (!PROMPTCHAN_API_KEY) {
    throw new Error('Promptchan API key not configured');
  }

  // Build appearance description
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
    'auburn': 'auburn hair'
  };

  const ethnicityDesc = ethnicityMap[ethnicity] || '';
  const hairLengthDesc = hairLength === 'bald' ? 'bald' : hairLengthMap[hairLength] || 'styled hair';
  const hairColorDesc = hairLength === 'bald' ? '' : (hairColorMap[hairColor] || 'brown hair');

  const appearance = [genderDesc, ethnicityDesc, hairColorDesc, hairLengthDesc].filter(Boolean).join(', ');

  // Different explicit pose for second image
  const poses = [
    'sitting on bed nude, legs spread, looking at camera seductively',
    'lying on back nude, legs up, inviting pose',
    'on all fours nude, looking back at camera',
    'standing nude, touching breasts, sexy expression',
    'kneeling nude, hands between legs, lustful gaze'
  ];

  const randomPose = poses[Math.floor(Math.random() * poses.length)];

  const prompt = `${appearance}, ${randomPose}, nude, naked, full body, high quality, photorealistic, detailed, 8k`;

  const negativePrompt = 'clothes, clothing, dressed, covered, censored, underwear, bra, panties, bikini, blur, low quality, bad anatomy, extra limbs, deformed, ugly, text, watermark, logo';

  console.log('📝 Prompt:', prompt);

  // Determine model based on companion type
  const modelStyle = companionType === 'anime' || companionType === 'animated' ? 'Anime XL+' : 'Hyperreal XL+';

  const promptchanResponse = await fetch('https://api.promptchan.ai/v2/image/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PROMPTCHAN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: prompt,
      negative_prompt: negativePrompt,
      model_style: modelStyle,
      width: 512,
      height: 768,
      creativity: 30,
      num_images: 1
    })
  });

  if (!promptchanResponse.ok) {
    const errorText = await promptchanResponse.text();
    throw new Error(`Promptchan API error: ${errorText}`);
  }

  const result = await promptchanResponse.json();

  if (!result.images || result.images.length === 0) {
    throw new Error('No images returned from Promptchan');
  }

  return result.images[0].url;
}
