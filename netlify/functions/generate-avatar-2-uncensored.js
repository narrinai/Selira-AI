// netlify/functions/generate-avatar-2-bulk.js
// Scheduled function to generate avatar_url_2 for companions that don't have one yet
// Runs daily at 4:00 AM UTC to gradually fill in missing second avatars

const fetch = require('node-fetch');

// Airtable configuration
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = 'Characters';

// Configuration
const BATCH_SIZE = 20; // Process 20 companions per run
const DELAY_BETWEEN_GENERATIONS = 5000; // 5 seconds delay to avoid rate limits

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Build appearance string from companion traits
function buildAppearanceString(companion) {
  const parts = [];

  // Gender base
  if (companion.sex === 'male') {
    parts.push('handsome man');
  } else {
    parts.push('beautiful woman');
  }

  // Ethnicity
  if (companion.ethnicity) {
    const ethnicityMap = {
      'white': 'Caucasian features, pale skin',
      'black': 'Black African American, DARK BROWN SKIN TONE, African features, Black person',
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

// Generate second avatar for a companion
async function generateAvatar2(companion) {
  console.log(`🎨 Generating avatar_url_2 for: ${companion.name} (${companion.id})`);

  const appearance = buildAppearanceString(companion);
  const uncensored = companion.content_filter === 'Uncensored';

  // Variation prompts for different angles/poses - gender specific
  const variations = uncensored ? (companion.sex === 'male' ? [
    // Explicit NSFW poses for MALE companions
    'lying on back with legs spread wide, arms above head, cock and balls visible, full frontal male nudity, erect penis prominent',
    'sitting with legs spread apart, leaning back, cock erect and visible, balls hanging, full nude exposure',
    'kneeling upright with legs spread, hands on thighs, cock front view, muscular chest, full body nude',
    'lying on side with top leg raised, cock visible from side angle, muscular body, completely naked',
    'standing with legs apart, one hand on hip, full frontal nude, cock and balls visible, masculine pose',
    'sitting with knees pulled up, cock visible between legs, muscular torso, nude intimate pose',
    'on all fours with ass up, cock hanging visible from behind, muscular back, doggy style position nude',
    'reclining with legs spread open, one arm behind head, cock erect, muscular body, inviting nude pose',
    'squatting with legs wide apart, cock and balls fully visible hanging, low angle explicit nude',
    'lying on back with one leg raised high, cock visible, muscular legs, flexible nude pose',
    'sitting with one leg up, other spread, cock visible, muscular torso, asymmetric nude composition',
    'kneeling with legs spread, sitting back, cock visible from front, muscular thighs, submissive nude angle',
    'standing bent over, ass and cock visible from behind, muscular glutes, explicit rear nude view',
    'lying face down with ass up, cock visible hanging down, muscular back, prone position nude',
    'sitting legs spread eagle, cock and balls fully exposed center frame, muscular body, explicit frontal nude',
    'lying on side with legs scissored open, cock visible, muscular physique, intimate side nude',
    'squatting on toes, legs wide, cock hanging visible, muscular legs, explicit low angle nude',
    'reclining with legs over head, cock and balls visible, muscular flexibility, explicit nude pose'
  ] : [
    // Explicit NSFW poses for FEMALE companions - mix of solo and POV with penis
    'lying on back with legs spread wide, arms above head, pussy visible, full frontal nudity, breasts exposed, nipples erect',
    'POV blowjob, kneeling looking up, cock in mouth, lips wrapped around penis, breasts visible, focus on face and breasts',
    'sitting with legs spread apart, leaning back, pussy lips visible, breasts hanging, full nude exposure',
    'POV doggy style, on all fours, ass up, cock penetrating pussy from behind, breasts hanging, looking back over shoulder',
    'kneeling upright with legs spread, hands on thighs, pussy front view, naked breasts, full body nude',
    'POV cowgirl, riding on top, cock inside pussy, breasts bouncing, looking down at camera, hands on chest',
    'lying on side with top leg raised, pussy visible from side angle, breasts exposed, completely naked',
    'POV missionary, lying on back legs spread, cock penetrating pussy, breasts exposed, intimate face expression',
    'standing with legs apart, one hand on hip, full frontal nude, pussy visible, breasts exposed',
    'POV handjob, kneeling, hand stroking cock, breasts pressed together, looking at camera seductively',
    'on all fours with ass up, pussy visible from behind, breasts hanging, doggy style position nude',
    'POV titjob, breasts wrapped around cock, looking up, nipples visible, penis between breasts',
    'reclining with legs spread open, one arm behind head, pussy spread, breasts exposed, inviting nude pose',
    'POV reverse cowgirl, riding cock facing away, ass visible, pussy lips stretched around penis, looking back',
    'squatting with legs wide apart, pussy fully visible, breasts exposed, low angle explicit nude',
    'POV prone bone, lying flat on stomach, ass up, cock penetrating from behind, face turned to side',
    'lying on back with one leg raised high, pussy spread visible, breasts exposed, flexible nude pose',
    'POV standing fuck, bent over, hands on wall, cock penetrating from behind, breasts hanging, ass visible',
    'sitting with one leg up, other spread, pussy visible, breasts exposed, asymmetric nude composition',
    'POV deepthroat, head tilted back, cock deep in throat, drool visible, breasts exposed, submissive position',
    'kneeling with legs spread, sitting back, pussy visible from front, breasts exposed, submissive nude angle',
    'POV spooning sex, lying on side, cock penetrating from behind, breasts visible, intimate close angle',
    'standing bent over, ass and pussy visible from behind, breasts hanging, explicit rear nude view',
    'POV cumshot, kneeling mouth open, tongue out, breasts exposed, anticipating facial, seductive expression',
    'sitting legs spread eagle, pussy fully exposed center frame, breasts out, explicit frontal nude',
    'lying on side with legs scissored open, pussy visible, breasts exposed, intimate side nude'
  ]) : [
    'different angle, looking over shoulder',
    'unique pose, turned to the side',
    'different perspective, confident expression',
    'alternative angle, alluring gaze',
    'varied pose, seductive smile'
  ];
  const randomVariation = variations[Math.floor(Math.random() * variations.length)];

  const customPrompt = uncensored
    ? `${randomVariation}, naked, completely nude, no clothes, full nudity, explicit, pornographic, XXX, NSFW, seductive expression, intimate lighting`
    : `${randomVariation}, professional portrait, elegant, tasteful`;

  console.log(`   📝 Appearance: ${appearance}`);
  console.log(`   🎭 Style: ${companion.companion_type || 'realistic'}`);
  console.log(`   🔒 Censored: ${!uncensored}`);
  console.log(`   ✨ Variation: ${randomVariation}`);

  try {
    // Call the image generation function
    const response = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customPrompt: customPrompt,
        characterName: companion.name,
        category: companion.category || (companion.companion_type === 'anime' ? 'anime-manga' : 'realistic'),
        style: companion.companion_type || 'realistic',
        shotType: 'portrait', // Consistent with avatar_url_1
        sex: companion.sex || 'female',
        ethnicity: companion.ethnicity || 'white',
        hairLength: companion.hair_length || 'long',
        hairColor: companion.hair_color || 'brown',
        source: 'companion-creation',
        uncensored: uncensored
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image generation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success || !result.imageUrl) {
      throw new Error(`Image generation returned no URL: ${JSON.stringify(result)}`);
    }

    console.log(`   ✅ Generated image: ${result.imageUrl}`);
    return result.imageUrl;

  } catch (error) {
    console.error(`   ❌ Failed to generate avatar_url_2 for ${companion.name}:`, error.message);
    throw error;
  }
}

// Upload image to imgbb
async function uploadToImgbb(replicateUrl, companionName) {
  console.log(`   📦 Uploading to ImgBB...`);

  try {
    const filename = `${companionName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-avatar-2-${Date.now()}.webp`;

    const response = await fetch('https://selira.ai/.netlify/functions/selira-download-avatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrl: replicateUrl,
        filename: filename
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
    console.error(`   ❌ Failed to upload to ImgBB:`, error.message);
    throw error;
  }
}

// Update companion with avatar_url_2
async function updateCompanionAvatar2(companionId, imageUrl) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${companionId}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        avatar_url_2: imageUrl
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to update Airtable: ${response.status}`);
  }

  console.log(`   💾 Updated Avatar_URL_2 in Airtable`);
}

// Main handler
exports.handler = async (event, context) => {
  console.log('🚀 Starting bulk avatar_url_2 generation...');

  // Check for manual trigger via query parameter
  const queryParams = event.queryStringParameters || {};
  const isManualTrigger = queryParams.trigger === 'manual' || queryParams.run === 'now';

  if (isManualTrigger) {
    console.log('✨ Manual trigger detected - will process Selira companions only');
  } else {
    console.log('⏰ Scheduled trigger (cron job)');
  }

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Airtable configuration' })
    };
  }

  try {
    // 1. Fetch companions without avatar_url_2
    console.log('📊 Fetching UNCENSORED Selira companions without Avatar_URL_2...');

    let allCompanions = [];
    let offset = null;

    do {
      // Filter: No Avatar_URL_2 AND Created_by = 'Selira' AND content_filter = 'Uncensored'
      const filterFormula = encodeURIComponent("AND(NOT({avatar_url_2}), {Created_by} = 'Selira', {content_filter} = 'Uncensored')");
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula=${filterFormula}&maxRecords=${BATCH_SIZE}${offset ? `&offset=${offset}` : ''}`;

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
      allCompanions = allCompanions.concat(data.records);
      offset = data.offset;
    } while (offset && allCompanions.length < BATCH_SIZE);

    console.log(`📦 Found ${allCompanions.length} companions without Avatar_URL_2`);

    if (allCompanions.length === 0) {
      console.log('✅ All companions already have Avatar_URL_2!');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'All companions already have avatar_url_2',
          processed: 0
        })
      };
    }

    // 2. Process companions
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (let i = 0; i < Math.min(allCompanions.length, BATCH_SIZE); i++) {
      const record = allCompanions[i];
      const companion = {
        id: record.id,
        name: record.fields.Name,
        sex: record.fields.sex,
        ethnicity: record.fields.ethnicity,
        hair_length: record.fields.hair_length,
        hair_color: record.fields.hair_color,
        companion_type: record.fields.companion_type,
        content_filter: record.fields.content_filter,
        category: record.fields.Category
      };

      console.log(`\n[${i + 1}/${Math.min(allCompanions.length, BATCH_SIZE)}] Processing: ${companion.name}`);

      try {
        // Generate avatar_url_2 (returns Replicate URL)
        const replicateUrl = await generateAvatar2(companion);

        // Upload to ImgBB to get permanent ibb.co URL
        const imgbbUrl = await uploadToImgbb(replicateUrl, companion.name);

        // Update Airtable with imgbb URL
        await updateCompanionAvatar2(record.id, imgbbUrl);

        successCount++;
        console.log(`   🎉 Success for ${companion.name}`);

        // Delay before next generation (except for last one)
        if (i < Math.min(allCompanions.length, BATCH_SIZE) - 1) {
          console.log(`   ⏱️ Waiting ${DELAY_BETWEEN_GENERATIONS / 1000}s before next generation...`);
          await sleep(DELAY_BETWEEN_GENERATIONS);
        }

      } catch (error) {
        failCount++;
        const errorMsg = `${companion.name}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`   ❌ Failed for ${companion.name}:`, error.message);

        // Continue to next companion even if this one failed
        continue;
      }
    }

    console.log('\n📊 Bulk generation completed!');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    if (errors.length > 0) {
      console.log(`   📋 Errors:`, errors);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        processed: successCount + failCount,
        successCount,
        failCount,
        errors: errors.length > 0 ? errors : undefined
      })
    };

  } catch (error) {
    console.error('❌ Bulk generation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};
