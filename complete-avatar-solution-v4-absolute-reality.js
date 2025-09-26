const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// EXPLICIT Avatar Generator V4 - Absolute Reality v1.8.1 Direct Implementation
// Bypasses Netlify function and calls Replicate directly with uncensored model

async function main() {
  console.log('🔥 Starting ABSOLUTE REALITY V4 (Maximum Sexuality & Uncensored)...\n');

  // Environment variables
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || 'patPkLfZQdNhKWYKF5.f67f48d5e54c8aba88e5dd07cf9fb4c9f0d97b14c0e40e48f3bb87df4db6c4b6';
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN_SELIRA || process.env.REPLICATE_API_TOKEN || 'r8_KhJ0J9J8Q8Q9Q7Q6Q5Q4Q3Q2Q1Q0Q';

  if (!REPLICATE_API_TOKEN || REPLICATE_API_TOKEN.startsWith('r8_KhJ0J9J8Q8Q9Q7Q6Q5Q4Q3Q2Q1Q0Q')) {
    console.error('❌ REPLICATE_API_TOKEN not found');
    console.log('💡 Set REPLICATE_API_TOKEN_SELIRA in environment');
    return;
  }

  console.log('🔑 Using Replicate token:', REPLICATE_API_TOKEN.substring(0, 8) + '...');

  try {
    // Fetch companions needing avatars
    console.log('🔍 Fetching Selira companions...');
    const airtableResponse = await fetch('https://api.airtable.com/v0/app5Xqa4KmvZ8wvaV/Companions?maxRecords=100&filterByFormula=AND({Avatar_URL}="",NOT({Name}=""))', {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`
      }
    });

    if (!airtableResponse.ok) {
      console.error('❌ Airtable error:', airtableResponse.status);
      return;
    }

    const data = await airtableResponse.json();
    const companions = data.records || [];
    console.log(`📦 Fetched ${companions.length} companions`);

    const companionsNeedingAvatars = companions.filter(c => !c.fields.Avatar_URL);
    console.log(`🔍 Found ${companionsNeedingAvatars.length} companions needing EXPLICIT avatars\n`);

    if (companionsNeedingAvatars.length === 0) {
      console.log('✨ All companions already have avatars!');
      return;
    }

    // Process each companion
    for (let i = 0; i < companionsNeedingAvatars.length; i++) {
      const companion = companionsNeedingAvatars[i];
      const companionName = companion.fields.Name;

      console.log(`[${i + 1}/${companionsNeedingAvatars.length}] Processing: ${companionName}`);
      console.log(`   Description sample: ${companion.fields.Description.substring(0, 100)}...`);

      // Extract companion traits
      const description = companion.fields.Description.toLowerCase();
      const isAnimeCategory = description.includes('anime');
      const companionType = isAnimeCategory ? 'anime' : 'realistic';
      const sex = 'female'; // Most companions are female

      // Extract ethnicity
      let ethnicity = 'white';
      if (description.includes('black')) ethnicity = 'black';
      else if (description.includes('asian')) ethnicity = 'asian';
      else if (description.includes('hispanic')) ethnicity = 'hispanic';
      else if (description.includes('korean')) ethnicity = 'korean';
      else if (description.includes('japanese')) ethnicity = 'japanese';
      else if (description.includes('chinese')) ethnicity = 'chinese';

      // Extract hair details
      let hairLength = 'medium';
      if (description.includes('long')) hairLength = 'long';
      else if (description.includes('short')) hairLength = 'short';

      let hairColor = 'brown';
      if (description.includes('blonde')) hairColor = 'blonde';
      else if (description.includes('black hair')) hairColor = 'black';
      else if (description.includes('red hair')) hairColor = 'red';
      else if (description.includes('white hair')) hairColor = 'white';

      // Determine category for clothing
      let category = 'general';
      if (description.includes('cooking')) category = 'cooking';
      else if (description.includes('anime')) category = 'anime-manga';

      console.log(`   Traits: ${companionType}, ${sex}, ${ethnicity}, ${hairLength} ${hairColor} hair`);

      try {
        // Generate explicit avatar with Absolute Reality v1.8.1 DIRECTLY
        const imageUrl = await generateAbsoluteRealityAvatar({
          companionType,
          sex,
          ethnicity,
          hairLength,
          hairColor,
          category,
          token: REPLICATE_API_TOKEN
        });

        if (imageUrl) {
          // Download image
          const filename = `${companionName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-explicit-${Date.now()}.webp`;
          const localPath = path.join(__dirname, 'avatars', filename);

          console.log(`📥 Downloading: ${filename}`);
          const imageResponse = await fetch(imageUrl);

          if (imageResponse.ok) {
            const buffer = await imageResponse.buffer();

            // Ensure avatars directory exists
            const avatarsDir = path.join(__dirname, 'avatars');
            if (!fs.existsSync(avatarsDir)) {
              fs.mkdirSync(avatarsDir, { recursive: true });
            }

            fs.writeFileSync(localPath, buffer);
            console.log(`✅ Saved: ${filename}`);

            const localUrl = `https://selira.ai/avatars/${filename}`;
            console.log(`🔗 Local URL: ${localUrl}`);

            // Update Airtable
            console.log(`💾 Updating ${companionName} in Airtable`);
            const updateResponse = await fetch(`https://api.airtable.com/v0/app5Xqa4KmvZ8wvaV/Companions/${companion.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                fields: {
                  Avatar_URL: localUrl
                }
              })
            });

            if (updateResponse.ok) {
              console.log('✅ Success: Avatar URL updated successfully');
            } else {
              console.error('❌ Failed to update Airtable:', updateResponse.status);
            }
          } else {
            console.error('❌ Failed to download image:', imageResponse.status);
          }
        }

        // Delay between requests
        if (i < companionsNeedingAvatars.length - 1) {
          console.log('⏳ Waiting 15 seconds...\n');
          await new Promise(resolve => setTimeout(resolve, 15000));

          // Longer break every 5 companions
          if ((i + 1) % 5 === 0) {
            console.log('☕ Taking a 60 second break...\n');
            await new Promise(resolve => setTimeout(resolve, 60000));
          }
        }

      } catch (error) {
        console.error(`❌ Error processing ${companionName}:`, error.message);
        console.log('⏳ Waiting 30 seconds before continuing...\n');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    console.log('\n🎉 Completed all companions with Absolute Reality v1.8.1!');

  } catch (error) {
    console.error('💥 Main error:', error.message);
  }
}

// Generate avatar using Absolute Reality v1.8.1 directly via Replicate API
async function generateAbsoluteRealityAvatar({ companionType, sex, ethnicity, hairLength, hairColor, category, token }) {
  const requestId = Math.random().toString(36).substring(7);

  // Create explicit prompt based on traits
  let explicitPrompt;
  let clothing;

  const ethnicGender = `${ethnicity} ${sex}`;
  const hairDesc = `${hairLength} ${hairColor} hair`;

  if (companionType === 'anime') {
    // Anime clothing options
    const animeClothing = ['sexy school uniform', 'revealing magical girl outfit', 'short kimono', 'crop top sailor uniform', 'sexy maid outfit', 'revealing anime outfit', 'mini skirt and crop top', 'bikini armor'];
    clothing = animeClothing[Math.floor(Math.random() * animeClothing.length)];

    explicitPrompt = `Sexy anime girl, ${ethnicGender}, ${hairDesc}, seductive pose, ${clothing}, revealing outfit, detailed anime art, attractive, flirtatious expression, seductive pose, attractive body, bedroom background, anime art style, sexy anime character, vibrant colors, sensual lighting, digital anime art, ecchi style, full body or upper body, seductive composition, high quality anime artwork, detailed facial features, anime eyes, perfect anime anatomy, suggestive pose, single character, solo, one person only`;
  } else {
    // Realistic clothing options
    const realisticClothing = ['sexy lingerie', 'revealing dress', 'bikini', 'crop top and shorts', 'lingerie style outfit', 'sensual clothing', 'revealing top', 'intimate wear'];
    clothing = realisticClothing[Math.floor(Math.random() * realisticClothing.length)];

    explicitPrompt = `Beautiful sexy ${ethnicGender}, ${hairDesc}, seductive expression, ${clothing}, revealing clothing, sensual pose, attractive, photorealistic, flirtatious expression, seductive pose, attractive body, bedroom or intimate setting, full body or upper body shot, sensual photography, attractive model, soft romantic lighting, glamour photography style, alluring pose, eye contact, sharp focus, professional photography, shallow depth of field, sexy photoshoot, single person, solo, one woman only`;
  }

  console.log(`🔥 Generating EXPLICIT avatar with Absolute Reality v1.8.1`);
  console.log(`   Clothing: ${clothing}`);
  console.log(`   🔥 EXPLICIT PROMPT: ${explicitPrompt.substring(0, 100)}...`);

  try {
    // Call Replicate API directly with Absolute Reality v1.8.1
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: "asiryan/absolutereality-v1.8.1",
        input: {
          prompt: explicitPrompt,
          negative_prompt: 'low quality, blurry, bad anatomy, multiple people, crowd, group, deformed, extra limbs, extra arms, extra legs',
          width: 768,
          height: 768,
          num_outputs: 1,
          num_inference_steps: 25,
          guidance_scale: 7.5
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${requestId}] Replicate API error:`, response.status, errorText);

      // Try to get model version hash if direct name fails
      if (response.status === 422 || response.status === 404) {
        console.log(`🔄 [${requestId}] Trying to get model version hash...`);
        return await generateWithVersionHash(explicitPrompt, token, requestId);
      }

      return null;
    }

    const prediction = await response.json();
    console.log(`✅ [${requestId}] Prediction created:`, prediction.id);

    // Wait for completion
    return await waitForPredictionCompletion(prediction.id, token, requestId);

  } catch (error) {
    console.error(`❌ [${requestId}] Generation error:`, error.message);
    return null;
  }
}

// Fallback: Get model version hash and retry
async function generateWithVersionHash(prompt, token, requestId) {
  try {
    const modelResponse = await fetch('https://api.replicate.com/v1/models/asiryan/absolutereality-v1.8.1', {
      headers: {
        'Authorization': `Token ${token}`
      }
    });

    if (modelResponse.ok) {
      const modelData = await modelResponse.json();
      const versionId = modelData.latest_version?.id;

      if (versionId) {
        console.log(`🔄 [${requestId}] Retrying with version hash:`, versionId.substring(0, 8) + '...');

        const retryResponse = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            version: versionId,
            input: {
              prompt: prompt,
              negative_prompt: 'low quality, blurry, bad anatomy, multiple people, crowd, group, deformed, extra limbs, extra arms, extra legs',
              width: 768,
              height: 768,
              num_outputs: 1,
              num_inference_steps: 25,
              guidance_scale: 7.5
            }
          })
        });

        if (retryResponse.ok) {
          const prediction = await retryResponse.json();
          console.log(`✅ [${requestId}] Prediction created with version hash:`, prediction.id);
          return await waitForPredictionCompletion(prediction.id, token, requestId);
        }
      }
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Version hash fallback failed:`, error.message);
  }

  return null;
}

// Wait for prediction to complete
async function waitForPredictionCompletion(predictionId, token, requestId) {
  console.log(`⏳ [${requestId}] Waiting for generation to complete...`);

  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    attempts++;

    try {
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });

      if (statusResponse.ok) {
        const result = await statusResponse.json();
        console.log(`📊 [${requestId}] [${attempts}/${maxAttempts}] Status: ${result.status}`);

        if (result.status === 'succeeded') {
          const imageUrl = result.output?.[0];
          if (imageUrl) {
            console.log(`✅ [${requestId}] Generated EXPLICIT image: ${imageUrl.substring(0, 50)}...`);
            return imageUrl;
          } else {
            console.error(`❌ [${requestId}] No image in output:`, result.output);
            return null;
          }
        } else if (result.status === 'failed') {
          console.error(`❌ [${requestId}] Generation failed:`, result.error);
          return null;
        }
      } else {
        console.log(`⚠️ [${requestId}] Status check failed: ${statusResponse.status}`);
      }
    } catch (error) {
      console.log(`⚠️ [${requestId}] Status check error: ${error.message}`);
    }
  }

  console.error(`❌ [${requestId}] Timeout after ${maxAttempts} attempts`);
  return null;
}

// Start the process
main().catch(console.error);