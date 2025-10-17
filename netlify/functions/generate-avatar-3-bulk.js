// netlify/functions/generate-avatar-3-bulk.js
// Scheduled function to generate avatar_url_3 for companions that don't have one yet
// Runs daily at 4:00 AM UTC to gradually fill in missing third avatars

const fetch = require('node-fetch');

// Airtable configuration
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = 'Characters';

// Configuration
const BATCH_SIZE = 1; // Process 1 companion per run (Netlify 26s timeout limit)
const DELAY_BETWEEN_GENERATIONS = 0; // No delay needed for single companion

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
  console.log(`🎨 Generating avatar_url_3 for: ${companion.name} (${companion.id})`);

  const appearance = buildAppearanceString(companion);
  const uncensored = companion.content_filter === 'Uncensored';

  // Variation prompts - 4 specific poses that rotate
  const variations = companion.sex === 'male' ? [
    'full body portrait, handsome man sitting with legs spread wide apart, large erect cock and big hanging balls fully visible between legs, full frontal nudity, showing entire body from head to knees, explicit masculine pose',
    'full body shot, muscular man lying on back with legs spread open, big hard cock erect and pointing up, balls visible, showing face chest abs and cock, full exposure, inviting seductive pose',
    'full body view, athletic man bent over looking back, firm ass cheeks spread, thick cock hanging down visible between legs, balls dangling, showing face and body, doggy style position'
  ] : [
    // FEMALE: Side View Blowjob
    'beautiful woman kneeling in profile, side view, large erect cock in her mouth, thick penis shaft attached to man\'s groin visible from the side, lips wrapped around cock, side angle showing both faces, man standing, woman\'s breasts visible from side, head bobbing, saliva dripping, side profile blowjob, sexual act from side perspective, NSFW, completely naked, fully nude, explicit side view'
  ];
  const randomVariation = variations[Math.floor(Math.random() * variations.length)];

  // Check if this is a POV pose (contains "man" or "male")
  const isPOVPose = randomVariation.toLowerCase().includes('man') || randomVariation.toLowerCase().includes('male groin');

  const customPrompt = uncensored
    ? (isPOVPose
        ? `${randomVariation}, seductive, alluring, intimate, artistic portrait, sensual atmosphere, POV perspective`
        : `${randomVariation}, seductive, alluring, intimate, artistic portrait, sensual atmosphere, SOLO portrait of single person only`)
    : `${randomVariation}, professional portrait, elegant, tasteful, single person only`;

  console.log(`   📝 Appearance: ${appearance}`);
  console.log(`   🎭 Style: ${companion.companion_type || 'realistic'}`);
  console.log(`   🔒 Censored: ${!uncensored}`);
  console.log(`   ✨ Variation: ${randomVariation}`);

  try {
    // Call the image generation function - using Photo XL+ v2 model for avatar_url_3
    const response = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image-xl2', {
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
        source: 'avatar-3-bulk-generation',
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
    console.error(`   ❌ Failed to generate avatar_url_3 for ${companion.name}:`, error.message);
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
        filename: filename,
        skipGitBackup: true  // Skip GitHub commits during bulk operations to prevent deployment spam
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

// Update companion with avatar_url_3
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
        avatar_url_3: imageUrl
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to update Airtable: ${response.status}`);
  }

  console.log(`   💾 Updated Avatar_URL_3 in Airtable`);
}

// Main handler
exports.handler = async (event, context) => {
  console.log('🚀 Starting bulk avatar_url_3 generation...');

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
    // 1. Fetch companions without avatar_url_3
    console.log('📊 Fetching PUBLIC UNCENSORED FEMALE companions without Avatar_URL_3...');

    let allCompanions = [];
    let offset = null;

    do {
      // Filter: No Avatar_URL_3 AND content_filter = 'Uncensored' AND sex = 'female' AND Public = 1 (only public companions)
      const filterFormula = encodeURIComponent("AND(NOT({Avatar_URL_3}), {content_filter} = 'Uncensored', {sex} = 'female', {Public} = 1)");
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

    console.log(`📦 Found ${allCompanions.length} companions without Avatar_URL_3`);

    if (allCompanions.length === 0) {
      console.log('✅ All companions already have Avatar_URL_3!');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'All companions already have avatar_url_3',
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
        // Generate avatar_url_3 (returns Replicate URL)
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
