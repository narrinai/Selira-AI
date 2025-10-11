#!/usr/bin/env node

/**
 * Regenerate Uncensored Companion Avatars with Variety
 *
 * Creates better avatars for uncensored companions with:
 * - Varied poses (close-ups, body shots, artistic poses)
 * - Indoor luxury backgrounds (bedrooms, hotels, suites)
 * - Tasteful artistic nude style (not hardcore porn)
 */

const fetch = require('node-fetch');

const AIRTABLE_BASE_ID = 'app5Xqa4KmvZ8wvaV'; // Selira AI Database
const AIRTABLE_TOKEN = process.argv[2];

if (!AIRTABLE_TOKEN) {
  console.error('❌ Missing AIRTABLE_TOKEN!');
  console.error('Usage: node regenerate-uncensored-avatars.js YOUR_AIRTABLE_TOKEN [LIMIT]');
  process.exit(1);
}

const LIMIT = parseInt(process.argv[3]) || 5; // Default 5 companions for testing

// Indoor luxury backgrounds only (no beaches/outdoor)
const INDOOR_BACKGROUNDS = [
  'luxury bedroom with silk sheets, warm golden lighting, candles, rose petals, romantic intimate atmosphere',
  'five-star hotel suite bedroom, floor-to-ceiling windows, city lights, king size bed, luxury decor',
  'private jacuzzi suite, steam rising, warm water, candles, mood lighting, intimate spa atmosphere',
  'modern penthouse bedroom, exposed brick, designer furniture, warm ambient lighting, urban luxury',
  'romantic cabin bedroom, fireplace crackling, cozy bed, warm glow, intimate mountain retreat',
  'luxury yacht master bedroom, panoramic ocean views, white linens, nautical elegance, private luxury',
  'boutique hotel suite, four-poster bed, silk curtains, chandelier, warm romantic lighting, opulent',
  'desert resort bedroom, moroccan decor, colorful pillows, lantern lighting, exotic romantic atmosphere',
  'upscale loft bedroom, modern art, designer bed, floor lamps, industrial chic luxury',
  'countryside estate bedroom, vintage elegance, canopy bed, warm firelight, classic romance',
  'rooftop suite bedroom, city skyline, neon lights reflecting, modern luxury, urban night vibes',
  'private spa bedroom, massage table, essential oils, candles, zen atmosphere, sensual wellness',
  'contemporary bedroom, minimalist luxury, designer furniture, natural light, sophisticated intimate space',
  'parisian apartment bedroom, classic elegance, ornate details, warm lighting, romantic french vibes'
];

// Artistic nude poses for female companions (tasteful, not hardcore)
const FEMALE_POSES = [
  'close-up portrait, naked shoulders and breasts visible, seductive gaze at camera, artistic lighting',
  'lying on bed, nude body elegantly posed, breasts visible, one hand touching hair, sultry expression',
  'sitting on bed edge, naked, breasts and curves visible, legs crossed, confident seductive look',
  'arched back pose, nude from behind, curves highlighted, looking over shoulder, alluring eyes',
  'kneeling pose, naked, breasts visible, hands in hair, seductive expression, artistic composition',
  'lying on side, nude, breasts and hips visible, one leg bent, bedroom eyes at camera',
  'standing nude, full frontal, breasts and body visible, hand on hip, confident sultry gaze',
  'close-up from above, lying down naked, breasts prominent, face with desire, intimate angle',
  'sitting in chair, nude, legs apart, breasts visible, touching neck, provocative stare',
  'on hands and knees, nude from behind, curves visible, looking back at camera, seductive smile',
  'reclining pose, naked, breasts and body visible, one arm above head, alluring expression',
  'topless close-up, naked breasts focus, seductive face, intimate portrait, soft sensual lighting'
];

// Artistic nude poses for male companions (tasteful, not explicit)
const MALE_POSES = [
  'shirtless close-up, defined abs and chest visible, intense gaze at camera, masculine energy',
  'lying on bed, naked upper body, muscular torso visible, confident expression, artistic lighting',
  'sitting on bed edge, shirtless, abs and chest visible, hand through hair, seductive look',
  'standing pose, shirtless, muscular body visible, arms crossed, confident masculine stare',
  'reclining pose, naked torso, defined muscles highlighted, bedroom eyes at camera',
  'close-up portrait, bare chest and shoulders, intense masculine gaze, intimate angle',
  'kneeling pose, shirtless, abs and chest prominent, hands on thighs, seductive expression',
  'lying on side, naked upper body, muscles visible, hand propping head, sultry look',
  'sitting in chair, shirtless, muscular torso visible, legs spread, confident pose',
  'standing from behind, bare back muscles visible, looking over shoulder, masculine allure'
];

// Fetch all uncensored companions
async function fetchUncensoredCompanions() {
  console.log('📡 Fetching uncensored companions from Airtable...\n');

  let allCompanions = [];
  let offset = null;

  while (true) {
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula={content_filter}='Uncensored'&maxRecords=100`;
    if (offset) {
      url += `&offset=${offset}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable fetch failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      break;
    }

    allCompanions.push(...data.records);
    console.log(`📦 Fetched ${data.records.length} companions (${allCompanions.length} total)`);

    if (!data.offset) {
      break;
    }

    offset = data.offset;
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n✅ Found ${allCompanions.length} uncensored companions\n`);
  return allCompanions;
}

// Generate new avatar via selira-generate-custom-image with artistic nude prompts
async function generateNewAvatar(companion) {
  const isMale = companion.fields.sex === 'male';
  const style = companion.fields.companion_type || 'realistic';
  const sex = companion.fields.sex || 'female';
  const ethnicity = companion.fields.ethnicity || 'white';
  const hairLength = companion.fields.hair_length || 'long';
  const hairColor = companion.fields.hair_color || 'brown';

  // Pick random pose and background
  const poses = isMale ? MALE_POSES : FEMALE_POSES;
  const randomPose = poses[Math.floor(Math.random() * poses.length)];
  const randomBackground = INDOOR_BACKGROUNDS[Math.floor(Math.random() * INDOOR_BACKGROUNDS.length)];

  // Build artistic nude prompt
  const genderDesc = isMale ? 'handsome muscular man' : 'beautiful woman';
  const bodyDesc = isMale ? 'athletic muscular build, defined abs and chest' : 'attractive curves, beautiful breasts';

  let prompt;
  if (style === 'anime') {
    prompt = `${genderDesc}, ${randomPose}, ${bodyDesc}, anime style, detailed anime art, high quality artwork, vibrant colors, artistic nude, ${randomBackground}`;
  } else {
    prompt = `${genderDesc}, ${randomPose}, ${bodyDesc}, photorealistic, professional photography, artistic nude portrait, soft sensual lighting, ${randomBackground}`;
  }

  console.log(`  📝 Prompt: ${prompt.substring(0, 100)}...`);

  try {
    const response = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customPrompt: prompt,
        characterName: companion.fields.Slug,
        category: style === 'anime' ? 'anime-manga' : 'realistic',
        style: style,
        shotType: 'portrait',
        sex: sex,
        ethnicity: ethnicity,
        hairLength: hairLength,
        hairColor: hairColor,
        uncensored: true,
        source: 'companion-avatar-regeneration'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success || !result.imageUrl) {
      throw new Error('No image URL in response');
    }

    return result.imageUrl;

  } catch (error) {
    throw error;
  }
}

// Update companion avatar in Airtable
async function updateCompanionAvatar(companionId, avatarUrl) {
  const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      records: [{
        id: companionId,
        fields: {
          Avatar_URL: avatarUrl
        }
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Airtable update failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Main execution
async function main() {
  console.log(`🚀 Regenerating Uncensored Companion Avatars (Limit: ${LIMIT})\n`);
  console.log('📋 Using:');
  console.log(`   - ${INDOOR_BACKGROUNDS.length} indoor luxury backgrounds`);
  console.log(`   - ${FEMALE_POSES.length} female artistic poses`);
  console.log(`   - ${MALE_POSES.length} male artistic poses\n`);

  const companions = await fetchUncensoredCompanions();

  if (companions.length === 0) {
    console.log('❌ No uncensored companions found!');
    return;
  }

  // Limit to specified number
  const companionsToUpdate = companions.slice(0, LIMIT);
  console.log(`🎯 Regenerating avatars for ${companionsToUpdate.length} companions\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < companionsToUpdate.length; i++) {
    const companion = companionsToUpdate[i];
    console.log(`\n[${i + 1}/${companionsToUpdate.length}] ${companion.fields.Name}`);
    console.log(`  🎨 Style: ${companion.fields.companion_type}, Sex: ${companion.fields.sex}`);
    console.log(`  🔗 Current avatar: ${companion.fields.Avatar_URL?.substring(0, 60)}...`);

    try {
      // Generate new avatar
      console.log(`  🎨 Generating new artistic nude avatar...`);
      const newAvatarUrl = await generateNewAvatar(companion);
      console.log(`  ✅ New avatar: ${newAvatarUrl.substring(0, 60)}...`);

      // Update in Airtable
      console.log(`  💾 Updating Airtable...`);
      await updateCompanionAvatar(companion.id, newAvatarUrl);
      console.log(`  ✅ Updated successfully!`);

      successCount++;

      // Rate limiting - wait 3 seconds between requests
      if (i < companionsToUpdate.length - 1) {
        console.log(`  ⏱️ Waiting 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n\n📊 Summary:`);
  console.log(`  ✅ Successfully regenerated: ${successCount} avatars`);
  console.log(`  ❌ Failed: ${failCount} avatars`);
  console.log(`\n🎉 Done!`);
}

main().catch(console.error);
