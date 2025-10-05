const fetch = require('node-fetch');
require('dotenv').config();

async function debugAria() {
  const response = await fetch('https://selira.ai/.netlify/functions/selira-characters?limit=1000&includePrivate=true');
  const data = await response.json();

  const aria = data.characters.find(c => c.slug === 'aria-moonlight');

  if (!aria) {
    console.log('Aria not found');
    return;
  }

  console.log('=== ARIA MOONLIGHT DEBUG ===\n');
  console.log('Raw data from API:');
  console.log('  name:', aria.name);
  console.log('  companion_type:', aria.companion_type);
  console.log('  sex:', aria.sex);
  console.log('  ethnicity:', aria.ethnicity);
  console.log('  hair_length:', aria.hair_length);
  console.log('  hair_color:', aria.hair_color);
  console.log('');

  // Simulate exact logic from complete-avatar-solution-v3.js
  const traits = {
    style: aria.companion_type || 'realistic',
    sex: aria.sex || 'female',
    ethnicity: aria.ethnicity || 'white',
    hairLength: aria.hair_length || 'medium',
    hairColor: aria.hair_color || 'brown'
  };

  console.log('Processed traits:');
  console.log('  style:', traits.style);
  console.log('  sex:', traits.sex);
  console.log('  ethnicity:', traits.ethnicity);
  console.log('  hairLength:', traits.hairLength);
  console.log('  hairColor:', traits.hairColor);
  console.log('');

  // Check which style
  const isAnimeStyle = traits.style === 'anime';
  console.log('Is Anime Style?', isAnimeStyle);
  console.log('');

  // Maps from complete-avatar-solution-v3.js
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

  const hairLengthMap = {
    'short': 'short hair',
    'medium': 'medium length hair, shoulder-length hair',
    'long': 'long hair, flowing hair'
  };

  const hairColorMap = {
    'brown': 'brown hair, brunette',
    'black': 'black hair, dark hair',
    'blonde': 'BLONDE hair, golden blonde hair, light blonde hair',
    'red': 'red hair, ginger hair, vibrant red hair',
    'auburn': 'auburn hair, reddish-brown hair',
    'gray': 'gray hair, silver hair',
    'white': 'white hair, platinum blonde hair',
    'purple': 'purple hair, violet hair'
  };

  const ethnicityDesc = ethnicityMap[traits.ethnicity] || 'diverse features';
  const hairLengthDesc = hairLengthMap[traits.hairLength] || 'styled hair';
  const hairColorDesc = hairColorMap[traits.hairColor] || 'brown hair';

  console.log('Mapped descriptions:');
  console.log('  ethnicityDesc:', ethnicityDesc);
  console.log('  hairLengthDesc:', hairLengthDesc);
  console.log('  hairColorDesc:', hairColorDesc);
  console.log('');

  // Simulated clothing
  const stylishClothing = 'micro bikini';

  // Build prompt
  let avatarPrompt;
  if (isAnimeStyle) {
    avatarPrompt = `beautiful anime girl, ${ethnicityDesc}, ${hairLengthDesc}, ${hairColorDesc}, very attractive face, extremely seductive expression, detailed anime art, very erotic pose, wearing ${stylishClothing}, anime style, vibrant colors, high quality anime artwork, detailed facial features, anime eyes, perfect anatomy, correct human anatomy, two arms, two hands, very sensual pose, large breasts, curvy figure, big butt, voluptuous body, exposed skin, revealing clothing, single character, solo, no extra limbs, proper proportions, bedroom background, intimate setting, seductive atmosphere`;
  } else {
    avatarPrompt = `beautiful woman, ${ethnicityDesc}, ${hairLengthDesc}, ${hairColorDesc}, attractive face, seductive expression, alluring pose, wearing ${stylishClothing}, photorealistic, professional photography, soft romantic lighting, glamour photography style, eye contact, sharp focus, attractive model, confident pose, single person, solo, perfect human anatomy, two arms, two hands, correct proportions, no extra limbs, bedroom background, beach setting, luxury suite, intimate atmosphere`;
  }

  console.log('=== FINAL PROMPT ===');
  console.log(avatarPrompt);
  console.log('');

  // Count how many times "blonde" appears
  const blondeCount = (avatarPrompt.match(/blonde/gi) || []).length;
  const brownCount = (avatarPrompt.match(/brown/gi) || []).length;

  console.log('Prompt analysis:');
  console.log('  "blonde" appears:', blondeCount, 'times');
  console.log('  "brown" appears:', brownCount, 'times');
  console.log('  Total length:', avatarPrompt.length, 'characters');
}

debugAria().catch(console.error);
