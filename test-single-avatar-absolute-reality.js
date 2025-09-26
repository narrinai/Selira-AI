const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function testSingleAvatar() {
  console.log('🧪 Testing single avatar generation with Absolute Reality v1.8.1...\n');

  // Test data for a realistic female companion
  const testCompanion = {
    id: 'test-companion',
    fields: {
      Name: 'Test Aaliyah',
      Description: 'A realistic companion with white features, long blonde hair\n\nExtra Instructions: Test companion for Absolute Reality v1.8.1 model testing.'
    }
  };

  console.log('🔥 Testing companion:', testCompanion.fields.Name);
  console.log('📝 Description:', testCompanion.fields.Description.substring(0, 80) + '...');

  // Extract traits (same logic as complete-avatar-solution-v3.js)
  const description = testCompanion.fields.Description.toLowerCase();
  const isAnimeCategory = description.includes('anime');
  const companionType = isAnimeCategory ? 'anime' : 'realistic';
  const sex = 'female'; // Most companions are female

  let ethnicity = 'white';
  if (description.includes('black')) ethnicity = 'black';
  else if (description.includes('asian')) ethnicity = 'asian';
  else if (description.includes('hispanic')) ethnicity = 'hispanic';
  else if (description.includes('korean')) ethnicity = 'korean';
  else if (description.includes('japanese')) ethnicity = 'japanese';
  else if (description.includes('chinese')) ethnicity = 'chinese';

  let hairLength = 'medium';
  if (description.includes('long')) hairLength = 'long';
  else if (description.includes('short')) hairLength = 'short';

  let hairColor = 'brown';
  if (description.includes('blonde')) hairColor = 'blonde';
  else if (description.includes('black hair')) hairColor = 'black';
  else if (description.includes('red hair')) hairColor = 'red';
  else if (description.includes('white hair')) hairColor = 'white';

  let category = 'general';
  if (description.includes('cooking')) category = 'cooking';
  else if (description.includes('anime')) category = 'anime-manga';

  console.log(`   Traits: ${companionType}, ${sex}, ${ethnicity}, ${hairLength} ${hairColor} hair`);

  try {
    // Call Netlify function directly (same as complete-avatar-solution-v3.js)
    const response = await fetch('https://narrinai.netlify.app/.netlify/functions/selira-generate-custom-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        companion_type: companionType,
        sex: sex,
        ethnicity: ethnicity,
        hair_length: hairLength,
        hair_color: hairColor,
        category: category,
        explicit: true
      })
    });

    console.log('📡 Function response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Function error:', response.status, errorText.substring(0, 200));
      return;
    }

    const result = await response.json();
    console.log('📦 Function result:', JSON.stringify(result, null, 2));

    if (result.success && result.data?.imageUrl) {
      console.log('\n🎉 SUCCESS! Absolute Reality v1.8.1 works through Netlify function!');
      console.log('🖼️ Generated image URL:', result.data.imageUrl);

      // Try to download the image to verify it exists
      console.log('⬇️ Testing image download...');
      const imageResponse = await fetch(result.data.imageUrl);
      if (imageResponse.ok) {
        console.log('✅ Image download successful!');
        console.log('📊 Image size:', imageResponse.headers.get('content-length'), 'bytes');
        console.log('🎯 Content type:', imageResponse.headers.get('content-type'));
      } else {
        console.log('⚠️ Image download failed:', imageResponse.status);
      }
    } else {
      console.log('\n❌ Function returned but no image URL found');
      console.log('📦 Result:', result);
    }

  } catch (error) {
    console.error('💥 Test error:', error.message);
  }
}

testSingleAvatar().catch(console.error);