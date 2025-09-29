const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Download image from URL and save to local file
async function downloadImage(url, filename) {
  try {
    console.log(`📥 Downloading: ${filename}`);
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`❌ Download failed: ${response.status}`);
      return false;
    }

    const buffer = await response.buffer();
    const filepath = path.join('./avatars/', filename);

    fs.writeFileSync(filepath, buffer);
    console.log(`✅ Saved: ${filename}`);
    return true;
  } catch (error) {
    console.log(`❌ Download error: ${error.message}`);
    return false;
  }
}

// Convert companion name to filename
function nameToFilename(name) {
  return name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

async function getAllSeliraCompanions() {
  console.log('🔍 Fetching Selira companions...');

  const response = await fetch('https://selira.ai/.netlify/functions/selira-characters?limit=1000');

  if (!response.ok) {
    throw new Error(`Failed to fetch companions: ${response.status}`);
  }

  const data = await response.json();
  console.log(`📦 Fetched ${data.characters.length} companions`);

  return data.characters;
}

function extractTraitsFromDescription(description) {
  // Fix regex - single backslashes for JavaScript
  const match = description.match(/A\s+(\w+)\s+companion\s+with\s+(\w+)\s+features,\s+(\w+)\s+(\w+)\s+hair/);

  if (match) {
    const [, style, ethnicity, hairLength, hairColor] = match;
    return {
      style: style,
      ethnicity: ethnicity,
      hairLength: hairLength,
      hairColor: hairColor,
      sex: 'female'
    };
  }

  // Fallback defaults
  return {
    style: 'realistic',
    ethnicity: 'white',
    hairLength: 'long',
    hairColor: 'brown',
    sex: 'female'
  };
}

// Exact clothing options from selira-generate-companion-avatar.js
function getSexyClothing(style, category = 'default') {
  const categoryClothing = {
    // Anime & Manga specific - more revealing
    'anime-manga': {
      female: ['sexy school uniform', 'revealing magical girl outfit', 'short kimono', 'crop top sailor uniform', 'sexy maid outfit', 'revealing anime outfit', 'mini skirt and crop top', 'bikini armor']
    },
    anime: {
      female: ['sexy school uniform', 'revealing outfit', 'short kimono', 'bikini top', 'sexy maid outfit', 'revealing anime clothes']
    },
    manga: {
      female: ['sexy manga outfit', 'revealing uniform', 'bikini', 'lingerie style outfit']
    },

    // Cooking & Food - sexy versions
    cooking: {
      female: ['sexy apron only', 'revealing chef outfit', 'apron over lingerie', 'crop top chef outfit', 'bikini with apron']
    },
    food: {
      female: ['sexy waitress outfit', 'revealing server uniform', 'mini skirt uniform', 'crop top and shorts']
    },

    // Fitness & Sports - already revealing
    fitness: {
      female: ['sports bra and short shorts', 'yoga pants and sports bra', 'revealing gym wear', 'sexy workout outfit', 'bikini fitness wear', 'tight athletic wear']
    },
    sports: {
      female: ['cheerleader outfit', 'volleyball bikini', 'tennis skirt', 'athletic bikini', 'sexy sports uniform']
    },

    // Professional & Business - sexy professional
    business: {
      female: ['sexy secretary outfit', 'revealing business dress', 'short skirt suit', 'unbuttoned blouse', 'sexy office wear']
    },

    // Default fallback - sexy companions
    default: {
      female: ['sexy lingerie', 'revealing dress', 'bikini', 'crop top and mini skirt', 'sexy outfit', 'revealing top', 'sensual clothing']
    }
  };

  // Find matching category or use default
  let clothingOptions = categoryClothing.default;

  const categoryLower = (category || 'default').toLowerCase();
  if (categoryClothing[categoryLower]) {
    clothingOptions = categoryClothing[categoryLower];
  } else {
    for (const [key, value] of Object.entries(categoryClothing)) {
      if (categoryLower.includes(key) || key.includes(categoryLower)) {
        clothingOptions = value;
        break;
      }
    }
  }

  // Select female clothing (since all companions are female)
  const femaleClothing = clothingOptions.female || categoryClothing.default.female;
  return femaleClothing[Math.floor(Math.random() * femaleClothing.length)];
}

async function generateAndDownloadAvatar(companion) {
  const name = companion.name;
  console.log(`🔥 Generating EXPLICIT avatar for: ${name}`);

  try {
    const traits = extractTraitsFromDescription(companion.description);
    console.log(`   Traits: ${traits.style}, ${traits.sex}, ${traits.ethnicity}, ${traits.hairLength} ${traits.hairColor} hair`);

    // Get random sexy clothing based on companion description (extract category)
    const category = companion.description.toLowerCase().includes('cooking') ? 'cooking' :
                     companion.description.toLowerCase().includes('fitness') ? 'fitness' :
                     companion.description.toLowerCase().includes('business') ? 'business' : 'default';

    const sexyClothing = getSexyClothing(traits.style, category);
    console.log(`   Clothing: ${sexyClothing}`);

    // Use same character-aware prompt building as chat/create image generation
    const isAnimeStyle = traits.style === 'anime';

    // Character appearance based on creation flow data
    const genderDescription = traits.sex === 'male' ?
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

    // Hair color descriptions
    const hairColorMap = {
      'brown': 'brown hair',
      'black': 'black hair',
      'blonde': 'blonde hair, golden hair',
      'red': 'red hair, ginger hair',
      'auburn': 'auburn hair, reddish-brown hair',
      'gray': 'gray hair, silver hair',
      'white': 'white hair, platinum hair',
      'purple': 'purple hair, violet hair'
    };

    const ethnicityDesc = ethnicityMap[traits.ethnicity] || 'diverse features';
    const hairLengthDesc = hairMap[traits.hairLength] || 'styled hair';
    const hairColorDesc = hairColorMap[traits.hairColor] || 'brown hair';

    // Build character-aware prompt
    const characterAppearance = `${genderDescription}, ${ethnicityDesc}, ${hairLengthDesc}, ${hairColorDesc}`;

    // Create base prompt with seductive/explicit elements for companion avatars
    const basePrompt = `seductive expression, revealing clothing, sensual pose, attractive, wearing ${sexyClothing}, attractive body, bedroom or intimate setting, cozy interior, soft lighting, intimate setting`;

    // Build full prompt with character appearance and context
    let explicitPrompt;
    if (isAnimeStyle) {
      explicitPrompt = `anime portrait of ${characterAppearance}, anime style, ${basePrompt}, detailed anime art, high quality anime illustration, vibrant colors, cel shading, clean background, single anime character, perfect anime anatomy, anime eyes`;
    } else {
      explicitPrompt = `realistic photography, portrait photograph of ${characterAppearance}, ${basePrompt}, photorealistic, real photo, not anime, not cartoon, not illustration, not drawing, professional photography, high quality, professional lighting, clean background, single real person, perfect anatomy, realistic skin, realistic features`;
    }

    console.log(`   🔥 EXPLICIT PROMPT: ${explicitPrompt}`);

    // Use Flux Schnell model directly (same as chat generation)
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN_SELIRA || process.env.REPLICATE_API_TOKEN;
    const modelVersion = "black-forest-labs/flux-schnell:c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e";

    const avatarResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        version: modelVersion,
        input: {
          prompt: explicitPrompt,
          width: 768,
          height: 768,
          num_outputs: 1,
          num_inference_steps: 4,
          seed: Math.floor(Math.random() * 100000)
        }
      })
    });

    if (avatarResponse.ok) {
      const prediction = await avatarResponse.json();
      console.log(`📊 Prediction created: ${prediction.id}, status: ${prediction.status}`);

      // Wait for the prediction to complete (max 30 seconds)
      let result = prediction;
      let attempts = 0;
      const maxAttempts = 30;

      while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

        const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`,
            'Accept': 'application/json'
          }
        });

        if (statusResponse.ok) {
          result = await statusResponse.json();
          console.log(`⏳ Status [${attempts}/${maxAttempts}]: ${result.status}`);
        }
      }

      if (result.status === 'succeeded' && result.output?.[0]) {
        const imageUrl = result.output[0];
        console.log(`✅ Generated EXPLICIT: ${imageUrl}`);

        // Download the image immediately
        const filename = `${nameToFilename(name)}-explicit-${Date.now()}.webp`;
        const downloaded = await downloadImage(imageUrl, filename);

        if (downloaded) {
          const localUrl = `https://selira.ai/avatars/${filename}`;
          console.log(`🔗 Local URL: ${localUrl}`);
          return localUrl;
        }
      } else {
        console.log(`⚠️ Generation failed or timed out: ${result.status}`);
      }
    } else {
      const errorText = await avatarResponse.text();
      console.log(`⚠️ Avatar generation failed: ${avatarResponse.status} - ${errorText}`);

      // Try slightly less explicit prompt for NSFW errors
      if (errorText.includes('NSFW content detected') || errorText.includes('content policy')) {
        console.log(`   🔄 Trying with moderate explicit prompt...`);
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Use more conservative version but keep character appearance
        const moderatePrompt = isAnimeStyle ?
          `anime portrait of ${characterAppearance}, anime style, attractive pose, appealing expression, anime character, vibrant colors, digital anime art, upper body, anime artwork, detailed facial features, anime eyes, single character, solo` :
          `realistic photography, portrait photograph of ${characterAppearance}, attractive expression, appealing clothing, confident pose, attractive, photorealistic, professional pose, attractive body, portrait photography, attractive model, professional photography, single person, solo, one woman only`;

        const conservativeResponse = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            version: modelVersion,
            input: {
              prompt: moderatePrompt,
              width: 768,
              height: 768,
              num_outputs: 1,
              num_inference_steps: 4,
              seed: Math.floor(Math.random() * 100000)
            }
          })
        });

        if (conservativeResponse.ok) {
          const conservativePrediction = await conservativeResponse.json();
          console.log(`📊 Conservative prediction created: ${conservativePrediction.id}`);

          // Wait for conservative prediction
          let conservativeResult = conservativePrediction;
          let conservativeAttempts = 0;
          const maxConservativeAttempts = 30;

          while (conservativeResult.status !== 'succeeded' && conservativeResult.status !== 'failed' && conservativeAttempts < maxConservativeAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            conservativeAttempts++;

            const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${conservativePrediction.id}`, {
              headers: {
                'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                'Accept': 'application/json'
              }
            });

            if (statusResponse.ok) {
              conservativeResult = await statusResponse.json();
              console.log(`⏳ Conservative status [${conservativeAttempts}/${maxConservativeAttempts}]: ${conservativeResult.status}`);
            }
          }

          if (conservativeResult.status === 'succeeded' && conservativeResult.output?.[0]) {
            const conservativeImageUrl = conservativeResult.output[0];
            console.log(`✅ Generated moderate explicit: ${conservativeImageUrl}`);

            const filename = `${nameToFilename(name)}-moderate-${Date.now()}.webp`;
            const downloaded = await downloadImage(conservativeImageUrl, filename);

            if (downloaded) {
              const localUrl = `https://selira.ai/avatars/${filename}`;
              console.log(`🔗 Local URL: ${localUrl}`);
              return localUrl;
            }
          }
        }
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  return null;
}

async function updateCompanionAvatar(companionId, avatarUrl, name) {
  console.log(`💾 Updating ${name} in Airtable`);

  try {
    const updateResponse = await fetch('https://selira.ai/.netlify/functions/selira-update-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companionId: companionId,
        avatarUrl: avatarUrl
      })
    });

    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log(`✅ Success: ${result.message}`);
      return true;
    } else {
      const errorText = await updateResponse.text();
      console.log(`❌ Failed: ${updateResponse.status} - ${errorText}`);
      return false;
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    console.log('🔥 Starting EXPLICIT avatar solution V3 (max sexuality)...\n');

    // Get all companions
    const allCompanions = await getAllSeliraCompanions();

    // Find companions without proper avatars
    const companionsNeedingAvatars = allCompanions.filter(companion => {
      return !companion.avatar_url ||
             companion.avatar_url === '' ||
             companion.avatar_url.includes('replicate.delivery') ||
             companion.avatar_url.includes('placeholder');
    });

    console.log(`🔍 Found ${companionsNeedingAvatars.length} companions needing EXPLICIT avatars\n`);

    if (companionsNeedingAvatars.length === 0) {
      console.log('🎉 All companions already have working avatars!');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < companionsNeedingAvatars.length; i++) {
      const companion = companionsNeedingAvatars[i];

      console.log(`\n[${i + 1}/${companionsNeedingAvatars.length}] Processing: ${companion.name}`);
      console.log(`   Description sample: ${companion.description.substring(0, 100)}...`);

      // Generate, download and get local URL
      const localAvatarUrl = await generateAndDownloadAvatar(companion);

      if (localAvatarUrl) {
        // Update Airtable with local URL
        const updated = await updateCompanionAvatar(companion.id, localAvatarUrl, companion.name);
        if (updated) {
          successCount++;
        } else {
          failCount++;
        }
      } else {
        failCount++;
      }

      // Add longer delay between requests due to API rate limits
      if (i < companionsNeedingAvatars.length - 1) {
        console.log('⏳ Waiting 15 seconds...');
        await new Promise(resolve => setTimeout(resolve, 15000));
      }

      // Take longer break every 3 companions
      if ((i + 1) % 3 === 0 && i < companionsNeedingAvatars.length - 1) {
        console.log('☕ Taking a 60 second break...');
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }

    console.log(`\n📊 EXPLICIT avatar solution V3 finished!`);
    console.log(`✅ Successfully processed: ${successCount} companions`);
    console.log(`❌ Failed: ${failCount} companions`);

    if (successCount > 0) {
      console.log(`\n🔥 All avatars are now using stable local URLs with MAXIMUM SEXUALITY!`);
    }

  } catch (error) {
    console.error('❌ Error in main process:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);