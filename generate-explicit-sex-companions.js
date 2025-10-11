#!/usr/bin/env node

/**
 * Generate Explicit Sex Companions with Improved Quality
 *
 * Improvements:
 * - No purple/pink skin tones - realistic natural skin colors
 * - Bigger breasts and ass for females
 * - More oral sex and penetration scenes for females
 * - Explicit sex acts visible
 */

const fetch = require('node-fetch');

const CREATE_COMPANION_URL = 'https://selira.ai/.netlify/functions/selira-create-companion';

const COMPANIONS_TO_CREATE = parseInt(process.argv[2]) || 100;

// Indoor luxury backgrounds only
const INDOOR_BACKGROUNDS = [
  'luxury bedroom with silk sheets, warm golden lighting, candles, rose petals',
  'five-star hotel suite bedroom, floor-to-ceiling windows, city lights, king size bed',
  'private jacuzzi suite, steam rising, warm water, candles, mood lighting',
  'modern penthouse bedroom, exposed brick, designer furniture, warm ambient lighting',
  'romantic cabin bedroom, fireplace crackling, cozy bed, warm glow',
  'luxury yacht master bedroom, panoramic views, white linens, nautical elegance',
  'boutique hotel suite, four-poster bed, silk curtains, chandelier, warm romantic lighting',
  'desert resort bedroom, moroccan decor, colorful pillows, lantern lighting',
  'upscale loft bedroom, modern art, designer bed, floor lamps, industrial chic',
  'countryside estate bedroom, vintage elegance, canopy bed, warm firelight',
  'rooftop suite bedroom, city skyline, neon lights reflecting, modern luxury',
  'private spa bedroom, massage table, essential oils, candles, zen atmosphere',
  'contemporary bedroom, minimalist luxury, designer furniture, soft natural light',
  'parisian apartment bedroom, classic elegance, ornate details, warm lighting'
];

// IMPROVED: More oral sex and penetration for females, bigger breasts/ass, natural skin tones
const FEMALE_SEX_POSES = [
  'giving blowjob, big cock in mouth, lips wrapped around shaft, huge natural breasts visible, looking up at camera, realistic skin tone, not pink',
  'getting fucked hard, big penis thrusting deep in pussy, huge tits bouncing, legs spread wide, face shows orgasm, natural skin',
  'riding cock reverse cowgirl, big dick inside pussy, huge ass prominent, back arched, realistic tan skin, not purple',
  'bent over getting penetrated, big cock in pussy from behind, huge ass exposed, looking back, natural caucasian skin',
  'on knees sucking cock, huge breasts hanging, mouth full of dick, lustful eyes up, realistic fair skin tone',
  'missionary position, big penis deep in wet pussy, huge tits visible, legs wrapped around, natural olive skin',
  'deepthroat blowjob, cock down throat, huge natural breasts, drooling, gagging, realistic skin not pink',
  'doggy style, big dick pounding pussy, huge ass jiggling, hands gripping sheets, natural tan skin',
  'lying back legs spread, getting eaten out, tongue on pussy, huge breasts exposed, natural skin tone',
  'threesome, sucking one cock while another fucks pussy, huge tits bouncing, realistic caucasian skin',
  'anal sex, big cock in ass, huge breasts swinging, mouth open screaming, natural skin not purple',
  'double penetration, two cocks in pussy and ass, huge tits, face shows ecstasy, realistic skin tone',
  'titfuck, big cock between huge breasts, cum on tits, natural fair skin, not pink',
  'straddling face, pussy on mouth getting licked, huge breasts, hands on headboard, natural skin',
  'squatting on cock, huge dick inside pussy, big ass prominent, natural olive skin not purple'
];

// Males with erect penis visible, natural skin tones
const MALE_SEX_POSES = [
  'getting blowjob, big erect cock in mouth, muscular body, abs defined, natural skin tone not pink',
  'fucking pussy hard, big dick thrusting in, muscular abs visible, intense face, realistic tan skin',
  'receiving handjob, huge erect penis being stroked, muscular chest, natural caucasian skin',
  'getting ridden, woman on top bouncing on big cock, muscular torso visible, realistic skin',
  'standing fucking from behind, big erect dick in pussy, muscular body, natural olive skin not purple',
  'lying back getting sucked, big hard cock in mouth, muscular abs, realistic fair skin',
  'penetrating missionary, huge erect penis inside pussy, muscular body over her, natural skin',
  'standing naked, huge erect cock prominent, muscular abs and chest, natural tan skin not pink',
  'sitting while being ridden, big dick inside pussy, muscular thighs, realistic caucasian skin',
  'cumming, big cock ejaculating, muscular body, intense orgasm face, natural skin tone'
];

// Name pools
const FEMALE_NAMES = ['Scarlett', 'Luna', 'Aria', 'Jade', 'Phoenix', 'Raven', 'Violet', 'Ivy', 'Ruby', 'Aurora', 'Sienna', 'Nova', 'Willow', 'Hazel', 'Eden', 'Ember', 'Stella', 'Chloe', 'Maya', 'Zara'];
const MALE_NAMES = ['Dante', 'Phoenix', 'Axel', 'Kai', 'Xavier', 'Blake', 'Hunter', 'Jax', 'Ryder', 'Cole', 'Zane', 'Ace', 'Cruz', 'Asher', 'Nico', 'Jett', 'Knox', 'Steel', 'Wolf', 'Ryker'];
const LAST_NAMES = ['Steele', 'Fox', 'Wolfe', 'Stone', 'Knight', 'Hunter', 'Black', 'Grey', 'Storm', 'Wilde', 'Savage', 'Frost', 'Blaze', 'Shadow', 'Rogue', 'Viper', 'Hawk', 'Drake', 'Cruz', 'Sin'];

// Only use tags that exist in Airtable (removed Passionate)
const SAFE_TAGS = [
  ['Seductive', 'Flirty', 'Confident'],
  ['Dominant', 'Boss', 'Confident'],
  ['Submissive', 'Shy', 'Playful'],
  ['Romantic', 'Flirty', 'Playful'],
  ['Mysterious', 'Seductive', 'Confident'],
  ['Playful', 'Flirty', 'Cute']
];

// Actual ethnicity values from Airtable
const ETHNICITIES_REALISTIC = ['white', 'black', 'hispanic', 'indian', 'middle-east', 'chinese', 'vietnamese'];
const ETHNICITIES_ANIME = ['japanese', 'korean'];

const HAIR_LENGTHS = ['short', 'medium', 'long'];
const HAIR_COLORS = ['brown', 'black', 'blonde', 'red', 'auburn'];

// Generate companion data
function generateCompanionData(index) {
  const sex = index % 2 === 0 ? 'female' : 'male';
  const style = Math.random() > 0.5 ? 'realistic' : 'anime';

  const firstNames = sex === 'female' ? FEMALE_NAMES : MALE_NAMES;
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const name = `${firstName} ${lastName}`;

  const ethnicities = style === 'anime' ? ETHNICITIES_ANIME : ETHNICITIES_REALISTIC;
  const ethnicity = ethnicities[Math.floor(Math.random() * ethnicities.length)];

  const hairLength = HAIR_LENGTHS[Math.floor(Math.random() * HAIR_LENGTHS.length)];
  const hairColor = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)];

  const tags = SAFE_TAGS[Math.floor(Math.random() * SAFE_TAGS.length)];

  // Pick random sex pose and background
  const poses = sex === 'female' ? FEMALE_SEX_POSES : MALE_SEX_POSES;
  const randomPose = poses[Math.floor(Math.random() * poses.length)];
  const randomBackground = INDOOR_BACKGROUNDS[Math.floor(Math.random() * INDOOR_BACKGROUNDS.length)];

  // Build explicit sex prompt with emphasis on natural skin tones and bigger features
  const genderDesc = sex === 'male' ? 'handsome muscular man' : 'beautiful woman with huge natural breasts and big round ass';

  // Add skin tone emphasis based on ethnicity for accurate representation
  let skinEmphasis;
  if (ethnicity === 'black') {
    skinEmphasis = ', dark brown skin, african american skin tone, deep brown complexion, ebony skin, not purple, not pink';
  } else if (ethnicity === 'hispanic') {
    skinEmphasis = ', tan olive skin, latina skin tone, natural brown complexion, warm skin, not pink';
  } else if (ethnicity === 'indian') {
    skinEmphasis = ', brown indian skin tone, south asian complexion, natural tan skin, not purple';
  } else if (ethnicity === 'middle-east') {
    skinEmphasis = ', middle eastern skin tone, olive to tan complexion, natural mediterranean skin, not pink';
  } else if (ethnicity === 'chinese') {
    skinEmphasis = ', chinese skin tone, fair to light asian skin, natural east asian complexion, not pink';
  } else if (ethnicity === 'vietnamese') {
    skinEmphasis = ', vietnamese skin tone, light to tan asian skin, natural southeast asian complexion, not pink';
  } else if (ethnicity === 'japanese' || ethnicity === 'korean') {
    skinEmphasis = ', asian skin tone, fair to light skin, natural east asian complexion, not pink';
  } else {
    skinEmphasis = ', caucasian fair skin, white skin tone, pale to tan complexion, not purple, not pink';
  }

  let avatarPrompt;
  if (style === 'anime') {
    avatarPrompt = `${genderDesc}, ${randomPose}, anime style, detailed anime art, high quality artwork, vibrant colors, explicit hardcore sex${skinEmphasis}, ${randomBackground}`;
  } else {
    avatarPrompt = `${genderDesc}, ${randomPose}, photorealistic, professional photography, explicit hardcore sex, porn scene${skinEmphasis}, ${randomBackground}`;
  }

  const description = `A ${style} ${sex} companion with ${ethnicity} features and ${hairLength} ${hairColor} hair. ${name} is ${tags.join(', ').toLowerCase()} and ready for explicit hardcore sex conversations and images.`;

  return {
    name,
    description,
    tags,
    style,
    sex,
    ethnicity,
    hairLength,
    hairColor,
    avatarPrompt
  };
}

// Create companion with pre-generated avatar
async function createCompanionWithAvatar(companionData) {
  try {
    console.log(`  🎨 Generating explicit sex avatar...`);
    console.log(`  📝 Prompt: ${companionData.avatarPrompt.substring(0, 120)}...`);

    // Generate avatar first
    const avatarResponse = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customPrompt: companionData.avatarPrompt,
        characterName: companionData.name,
        category: companionData.style === 'anime' ? 'anime-manga' : 'realistic',
        style: companionData.style,
        shotType: 'portrait',
        sex: companionData.sex,
        ethnicity: companionData.ethnicity,
        hairLength: companionData.hairLength,
        hairColor: companionData.hairColor,
        uncensored: true,
        source: 'companion-creation'
      })
    });

    if (!avatarResponse.ok) {
      const errorText = await avatarResponse.text();
      throw new Error(`Avatar generation failed: ${avatarResponse.status} - ${errorText}`);
    }

    const avatarResult = await avatarResponse.json();

    if (!avatarResult.success || !avatarResult.imageUrl) {
      throw new Error('No avatar URL in response');
    }

    console.log(`  ✅ Avatar generated: ${avatarResult.imageUrl.substring(0, 60)}...`);

    // Now create companion
    console.log(`  💾 Creating companion in Airtable...`);

    const companionResponse = await fetch(CREATE_COMPANION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: companionData.name,
        description: companionData.description,
        tags: companionData.tags,
        artStyle: companionData.style,
        sex: companionData.sex,
        ethnicity: companionData.ethnicity,
        hairLength: companionData.hairLength,
        hairColor: companionData.hairColor,
        visibility: 'public',
        isUnfiltered: true,
        preGeneratedAvatarUrl: avatarResult.imageUrl
      })
    });

    if (!companionResponse.ok) {
      const errorText = await companionResponse.text();
      throw new Error(`Companion creation failed: ${companionResponse.status} - ${errorText}`);
    }

    const result = await companionResponse.json();
    console.log(`  ✅ Companion created successfully!`);
    return result;

  } catch (error) {
    throw error;
  }
}

// Main execution
async function main() {
  console.log(`🚀 Generating ${COMPANIONS_TO_CREATE} Explicit Sex Companions\n`);
  console.log('📋 Improvements:');
  console.log(`   - Natural realistic skin tones (not purple/pink)`);
  console.log(`   - Bigger breasts and ass for females`);
  console.log(`   - ${FEMALE_SEX_POSES.length} explicit female sex poses (oral, penetration, etc.)`);
  console.log(`   - ${MALE_SEX_POSES.length} explicit male sex poses`);
  console.log(`   - ${INDOOR_BACKGROUNDS.length} indoor luxury backgrounds\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < COMPANIONS_TO_CREATE; i++) {
    console.log(`\n[${i + 1}/${COMPANIONS_TO_CREATE}] Creating companion...`);

    try {
      const companionData = generateCompanionData(i);
      console.log(`  📝 Name: ${companionData.name}`);
      console.log(`  🎨 Style: ${companionData.style}, Sex: ${companionData.sex}`);
      console.log(`  🏷️ Tags: ${companionData.tags.join(', ')}`);

      await createCompanionWithAvatar(companionData);
      successCount++;

      // Rate limiting - wait 4 seconds between companions (longer to avoid timeouts)
      if (i < COMPANIONS_TO_CREATE - 1) {
        console.log(`  ⏱️ Waiting 4 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n\n📊 Summary:`);
  console.log(`  ✅ Successfully created: ${successCount} companions`);
  console.log(`  ❌ Failed: ${failCount} companions`);
  console.log(`\n🎉 Done!`);
}

main().catch(console.error);
