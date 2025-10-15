// netlify/functions/generate-premium-avatars.js
// Generate 3 high-quality avatar variations for uncensored companions
// Uses Promptchan Hyperreal XL v2 model for maximum quality
// Processes ONE companion per call to avoid Netlify timeout (26s limit)

const fetch = require('node-fetch');

// Airtable configuration
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = 'Characters';

// Promptchan configuration
const PROMPTCHAN_API_KEY = process.env.PROMPTCHAN_API_KEY_SELIRA;

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Build appearance string from companion traits
function buildAppearanceString(companion) {
  const parts = [];

  // Gender base
  if (companion.sex === 'male') {
    parts.push('handsome man, masculine physique, strong features');
  } else {
    parts.push('beautiful woman, feminine physique, attractive features');
  }

  // Ethnicity
  if (companion.ethnicity) {
    const ethnicityMap = {
      'white': 'Caucasian features, pale skin',
      'black': 'Black African American, DARK BROWN SKIN TONE, African features',
      'asian': 'East Asian features, light Asian skin',
      'indian': 'South Asian features, brown skin',
      'latina': 'Latina features, tan skin',
      'middle-eastern': 'Middle Eastern features, olive skin',
      'mixed': 'mixed ethnicity features'
    };
    parts.push(ethnicityMap[companion.ethnicity] || companion.ethnicity);
  }

  // Hair
  if (companion.hair_color && companion.hair_length) {
    parts.push(`${companion.hair_length} ${companion.hair_color} hair`);
  } else if (companion.hair_color) {
    parts.push(`${companion.hair_color} hair`);
  } else if (companion.hair_length) {
    parts.push(`${companion.hair_length} hair`);
  }

  return parts.join(', ');
}

// Generate single image with Promptchan Hyperreal XL v2
async function generateImageWithHyperrealXL(companion, variationNumber, requestId) {
  console.log(`🎨 [${requestId}] Generating variation ${variationNumber}/3 for: ${companion.name}`);

  const appearance = buildAppearanceString(companion);

  // High-quality variation prompts - SOLO POSES ONLY for females
  const variations = companion.sex === 'male' ? [
    'full body portrait, sitting with legs spread apart, large erect cock and hanging balls fully visible, showing face chest abs and genitals, full frontal nudity, confident dominant pose, professional lighting',
    'full body shot, standing with legs apart, big hard penis prominently displayed center frame, showing entire body from head to feet, explicit masculine pose, studio photography',
    'full body view, reclining with legs spread, thick erect cock pointing up, showing face torso and genitals, intimate masculine exposure, high quality portrait'
  ] : [
    // FEMALE SOLO ONLY - NO POV, NO PENIS, just beautiful woman alone
    'beautiful woman ALONE, lying on back with legs spread wide, pussy visible, full frontal nudity, breasts exposed, SOLO portrait, single person only, no other people, professional studio lighting',
    'gorgeous woman BY HERSELF, sitting with legs apart, pussy lips visible, breasts hanging, SOLO nude exposure, alone, single woman only, high quality intimate portrait',
    'stunning woman SOLO, kneeling with legs spread, pussy front view, naked breasts, SOLO full body nude, by herself, one person only, professional photography'
  ];

  const randomVariation = variations[variationNumber % variations.length];

  // Build enhanced prompt with appearance traits emphasized
  const enhancedPrompt = `${appearance}, ${randomVariation}, photorealistic, ultra realistic, professional photography, detailed skin texture, realistic proportions, masterpiece quality, 8k resolution`;

  console.log(`   📝 Appearance: ${appearance}`);
  console.log(`   ✨ Variation: ${randomVariation}`);

  // Negative prompt - block unwanted elements
  let negativePrompt = 'clothes, clothing, dressed, covered, censored, censorship, blur, low quality, bad anatomy, extra limbs, deformed, ugly, text, watermark, logo, signature, bad hands, bad face, monochrome, unrealistic proportions, distorted anatomy, cartoon, anime, illustration, drawing';

  // For females, block penis/male genitals
  if (companion.sex === 'female') {
    negativePrompt += ', penis, cock, dick, male genitals, male genitalia, erect penis, testicles, balls, scrotum, POV, point of view shot, man, male, guy, multiple people, two people, couple, sex, intercourse, penetration, blowjob, handjob';
    console.log(`   🚫 Female companion - blocking penis/male content`);
  }

  // Promptchan Hyperreal XL v2 request with HIGH QUALITY settings
  const promptchanRequest = {
    prompt: enhancedPrompt,
    negative_prompt: negativePrompt,
    style: 'Hyperreal XL v2',  // PREMIUM MODEL for maximum quality
    quality: 'Ultra',           // Highest quality
    image_size: '1024x1024',    // Large size for detail
    creativity: 60,             // High creativity for better poses
    seed: -1,                   // Random seed for variation
    filter: 'None',             // No censorship
    emotion: 'Default',
    detail: 1,                  // Higher detail level
    age_slider: 25,             // Attractive age
    weight_slider: -0.3,        // Fit body
    breast_slider: companion.sex === 'male' ? 0 : 0.5,  // Natural proportions
    ass_slider: companion.sex === 'male' ? 0 : 0.5
  };

  console.log(`   📤 Promptchan Hyperreal XL v2 request:`, {
    style: promptchanRequest.style,
    quality: promptchanRequest.quality,
    size: promptchanRequest.image_size,
    creativity: promptchanRequest.creativity,
    detail: promptchanRequest.detail
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
      throw new Error(`Promptchan API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`   ✅ Image generated, gems used: ${result.gems}`);

    return {
      success: true,
      imageUrl: result.image,
      variation: variationNumber,
      gems: result.gems
    };

  } catch (error) {
    console.error(`   ❌ Failed to generate variation ${variationNumber}:`, error.message);
    return {
      success: false,
      error: error.message,
      variation: variationNumber
    };
  }
}

// Upload image to ImgBB
async function uploadToImgbb(imageUrl, companionName, variationNumber) {
  console.log(`   📦 Uploading variation ${variationNumber} to ImgBB...`);

  try {
    const filename = `${companionName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-premium-${variationNumber}-${Date.now()}.webp`;

    const response = await fetch('https://selira.ai/.netlify/functions/selira-download-avatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrl: imageUrl,
        filename: filename,
        skipGitBackup: true  // Skip GitHub commits for premium generation
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ImgBB upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success || !result.localUrl) {
      throw new Error(`ImgBB upload returned no URL: ${JSON.stringify(result)}`);
    }

    console.log(`   ✅ Uploaded to ImgBB: ${result.localUrl}`);
    return result.localUrl;

  } catch (error) {
    console.error(`   ❌ Failed to upload variation ${variationNumber}:`, error.message);
    throw error;
  }
}

// Main handler - processes ONE companion with 3 variations
exports.handler = async (event, context) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🚀 [${requestId}] Premium avatar generation started`);

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (!PROMPTCHAN_API_KEY || !AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing API configuration' })
    };
  }

  try {
    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { slug } = body;

    if (!slug) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing companion slug' })
      };
    }

    console.log(`📋 [${requestId}] Processing companion slug: ${slug}`);

    // 1. Fetch companion from Airtable by slug
    const filterFormula = encodeURIComponent(`{slug} = '${slug}'`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula=${filterFormula}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable fetch failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Companion not found: ${slug}` })
      };
    }

    const record = data.records[0];
    const companion = {
      id: record.id,
      name: record.fields.Name,
      slug: record.fields.slug,
      sex: record.fields.sex,
      ethnicity: record.fields.ethnicity,
      hair_length: record.fields.hair_length,
      hair_color: record.fields.hair_color,
      companion_type: record.fields.companion_type,
      content_filter: record.fields.content_filter
    };

    console.log(`✅ [${requestId}] Found companion: ${companion.name} (${companion.sex}, ${companion.content_filter})`);

    // 2. Generate 3 variations
    const variations = [];
    const errors = [];
    let totalGems = 0;

    for (let i = 1; i <= 3; i++) {
      console.log(`\n[${requestId}] === Generating variation ${i}/3 ===`);

      try {
        // Generate image
        const imageResult = await generateImageWithHyperrealXL(companion, i, requestId);

        if (!imageResult.success) {
          errors.push(`Variation ${i}: ${imageResult.error}`);
          continue;
        }

        totalGems += imageResult.gems || 0;

        // Upload to ImgBB
        const imgbbUrl = await uploadToImgbb(imageResult.imageUrl, companion.name, i);

        variations.push({
          variation: i,
          replicateUrl: imageResult.imageUrl,
          imgbbUrl: imgbbUrl,
          success: true
        });

        console.log(`   🎉 Variation ${i} completed successfully`);

        // Small delay between variations to avoid rate limits
        if (i < 3) {
          console.log(`   ⏱️ Waiting 2 seconds before next variation...`);
          await sleep(2000);
        }

      } catch (error) {
        errors.push(`Variation ${i}: ${error.message}`);
        console.error(`   ❌ Variation ${i} failed:`, error.message);
      }
    }

    console.log(`\n📊 [${requestId}] Premium generation completed!`);
    console.log(`   ✅ Success: ${variations.length}/3`);
    console.log(`   ❌ Failed: ${errors.length}/3`);
    console.log(`   💎 Total gems used: ${totalGems}`);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        companion: {
          name: companion.name,
          slug: companion.slug,
          sex: companion.sex
        },
        variations: variations,
        successCount: variations.length,
        failCount: errors.length,
        totalGems: totalGems,
        errors: errors.length > 0 ? errors : undefined
      })
    };

  } catch (error) {
    console.error(`❌ [${requestId}] Premium generation error:`, error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};
