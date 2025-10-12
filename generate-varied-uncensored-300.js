#!/usr/bin/env node

/**
 * Generate 300 Uncensored Companions with Varied Avatars
 *
 * Creates 300 new uncensored companions with:
 * - Varied explicit poses (close-ups, body shots, explicit angles)
 * - Indoor luxury backgrounds (bedrooms, hotels, suites)
 * - Explicit nude style (like chat image gen ideas)
 * - Includes visible genitals for both male and female
 */

const fetch = require('node-fetch');

const CREATE_COMPANION_URL = 'https://selira.ai/.netlify/functions/selira-create-companion';

const COMPANIONS_TO_CREATE = 300; // Generate 300 companions

// Indoor luxury backgrounds only (no beaches/outdoor)
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

// Explicit nude poses for female (like chat image gen ideas)
const FEMALE_EXPLICIT_POSES = [
  'close-up, naked breasts prominent, pussy visible, touching breasts, lustful eyes at camera',
  'lying on bed, completely naked, legs spread wide, pussy glistening visible, breasts exposed, seductive face',
  'on all fours, naked from behind, pussy and ass fully exposed, looking back at camera, desire',
  'sitting legs spread, naked, pussy lips visible wet, breasts exposed, fingers touching pussy',
  'kneeling pose, fully nude, breasts and pussy visible, hands on thighs, bedroom eyes',
  'lying on side, naked, breasts prominent, pussy visible between legs, sultry gaze',
  'standing nude, full frontal, naked breasts and pussy exposed, hand touching breast, confident',
  'close-up from above, lying naked, huge breasts focus, pussy visible, face shows arousal',
  'bent over naked, pussy and ass exposed from behind, looking back, seductive smile',
  'reclining nude, legs open, pussy glistening visible, breasts exposed, finger to lips',
  'topless close-up, naked breasts focus, touching nipples, mouth open, intimate angle',
  'squatting pose, naked, pussy spread visible, breasts hanging, lustful expression'
];

// Explicit nude poses for male (like chat image gen ideas)
const MALE_EXPLICIT_POSES = [
  'naked, hard erect penis visible prominent, hand touching cock, abs defined, intense gaze',
  'lying on bed, completely nude, penis erect exposed, muscular body, confident expression',
  'standing nude, full frontal, erect cock visible, muscular abs and chest, bedroom eyes',
  'sitting legs apart, naked, hard penis prominent, hand on thigh, seductive stare',
  'kneeling pose, fully nude, erect cock visible, defined abs, intense masculine look',
  'close-up, naked torso and erect penis focus, hand touching cock, desire in eyes',
  'lying on side, nude, muscular body and hard penis visible, sultry masculine gaze',
  'standing from behind, naked ass visible, looking over shoulder, penis visible from side',
  'reclining nude, legs spread, erect cock prominent, abs defined, hand behind head',
  'sitting edge of bed, naked, hard penis visible, muscular thighs, confident pose'
];

// Name pools - mix of regular names and classy/fantasy titles
const FEMALE_NAMES = [
  'Scarlett', 'Luna', 'Aria', 'Jade', 'Phoenix', 'Raven', 'Violet', 'Ivy', 'Ruby', 'Aurora',
  'Sienna', 'Nova', 'Willow', 'Hazel', 'Eden', 'Stella', 'Skye', 'Chloe', 'Zoe', 'Maya',
  'Girl Next Door', 'Your Dirty Stepmom', 'Hot Milf', 'Sexy Neighbor', 'Naughty Maid',
  'Seductive Secretary', 'Horny Babysitter', 'Wild College Girl', 'Forbidden Stepsister', 'Lusty Aunt',
  'Eager Roommate', 'Kinky Boss Lady', 'Sultry Bartender', 'Frisky Yoga Instructor', 'Tempting Teacher',
  'Playful Cheerleader', 'Filthy Rich Wife', 'Innocent Looking Slut', 'Dominant Mistress', 'Submissive Pet'
];

const MALE_NAMES = [
  'Dante', 'Phoenix', 'Axel', 'Kai', 'Xavier', 'Blake', 'Hunter', 'Jax', 'Ryder', 'Cole',
  'Zane', 'Ace', 'Cruz', 'Asher', 'Nico', 'Roman', 'Jace', 'Finn', 'Liam', 'Owen',
  'Guy Next Door', 'Your Dirty Stepdad', 'Hot Dilf', 'Sexy Neighbor', 'Hung Handyman',
  'Alpha Boss', 'Naughty Professor', 'Wild Frat Boy', 'Forbidden Stepbrother', 'Horny Uncle',
  'Eager Roommate', 'Dominant Master', 'Buff Trainer', 'Cocky Athlete', 'Seductive Doctor',
  'Bad Boy Biker', 'Rich Sugar Daddy', 'Muscular Firefighter', 'Rough Construction Worker', 'Gentle Giant'
];

const LAST_NAMES = ['Steele', 'Fox', 'Wolfe', 'Stone', 'Knight', 'Hunter', 'Black', 'Grey', 'Storm', 'Wilde', 'Savage', 'Frost', 'Blaze', 'Shadow', 'Rogue', 'Phoenix', 'Moon', 'Star', 'Sky', 'River', '', '', '', '', ''];

// Tags that work with uncensored content
const UNCENSORED_TAGS = [
  ['Seductive', 'Flirty', 'Confident'],
  ['Dominant', 'Boss', 'Confident'],
  ['Submissive', 'Shy', 'Playful'],
  ['Romantic', 'Passionate', 'Flirty'],
  ['Mysterious', 'Seductive', 'Confident'],
  ['Playful', 'Flirty', 'Cute']
];

// Ethnicities
// Actual ethnicity values from Airtable (asian doesn't exist!)
const ETHNICITIES_REALISTIC = ['white', 'black', 'hispanic', 'indian', 'middle-east', 'chinese', 'vietnamese'];
const ETHNICITIES_ANIME = ['japanese', 'korean'];

// Hair styles
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

  const tags = UNCENSORED_TAGS[Math.floor(Math.random() * UNCENSORED_TAGS.length)];

  // Pick random explicit pose and background
  const poses = sex === 'female' ? FEMALE_EXPLICIT_POSES : MALE_EXPLICIT_POSES;
  const randomPose = poses[Math.floor(Math.random() * poses.length)];
  const randomBackground = INDOOR_BACKGROUNDS[Math.floor(Math.random() * INDOOR_BACKGROUNDS.length)];

  // Build explicit prompt for avatar
  const genderDesc = sex === 'male' ? 'handsome muscular man' : 'beautiful woman';

  let avatarPrompt;
  if (style === 'anime') {
    avatarPrompt = `${genderDesc}, ${randomPose}, anime style, detailed anime art, high quality artwork, vibrant colors, explicit nude, ${randomBackground}`;
  } else {
    avatarPrompt = `${genderDesc}, ${randomPose}, photorealistic, professional photography, explicit nude, soft sensual lighting, ${randomBackground}`;
  }

  // Generate description
  const primaryTag = tags[0].toLowerCase();
  const description = `A ${style} ${sex} companion with ${ethnicity} features and ${hairLength} ${hairColor} hair. ${name} is ${tags.join(', ').toLowerCase()} and ready for explicit uncensored conversations and images.`;

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

// Create companion via Netlify function with pre-generated avatar
async function createCompanionWithAvatar(companionData) {
  try {
    console.log(`  🎨 Generating explicit avatar...`);
    console.log(`  📝 Prompt: ${companionData.avatarPrompt.substring(0, 100)}...`);

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

    // Now create companion with this avatar
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
  console.log(`🚀 Generating ${COMPANIONS_TO_CREATE} New Uncensored Companions\n`);
  console.log('📋 Features:');
  console.log(`   - ${INDOOR_BACKGROUNDS.length} indoor luxury backgrounds`);
  console.log(`   - ${FEMALE_EXPLICIT_POSES.length} explicit female poses`);
  console.log(`   - ${MALE_EXPLICIT_POSES.length} explicit male poses`);
  console.log(`   - Visible genitals for both sexes\n`);

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

      // Rate limiting - wait 3 seconds between companions
      if (i < COMPANIONS_TO_CREATE - 1) {
        console.log(`  ⏱️ Waiting 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
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
