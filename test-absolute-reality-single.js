const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Same logic as complete-avatar-solution-v3.js but for one companion
async function testSingleCompanion() {
  console.log('🧪 Testing Absolute Reality v1.8.1 with single companion...\n');

  try {
    // Get one companion to test
    console.log('🔍 Fetching Selira companions...');
    const airtableResponse = await fetch('https://api.airtable.com/v0/app5Xqa4KmvZ8wvaV/Companions?maxRecords=5&filterByFormula=AND({Avatar_URL}="",NOT({Name}=""))', {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN || 'patPkLfZQdNhKWYKF5.f67f48d5e54c8aba88e5dd07cf9fb4c9f0d97b14c0e40e48f3bb87df4db6c4b6'}`
      }
    });

    if (!airtableResponse.ok) {
      console.error('❌ Airtable error:', airtableResponse.status);
      return;
    }

    const data = await airtableResponse.json();
    const companions = data.records || [];

    if (companions.length === 0) {
      console.log('⚠️ No companions found needing avatars');
      return;
    }

    const companion = companions[0];
    console.log(`🔥 Testing companion: ${companion.fields.Name}`);
    console.log(`📝 Description: ${companion.fields.Description.substring(0, 100)}...`);

    // Extract traits (same logic as V3)
    const description = companion.fields.Description.toLowerCase();
    const isAnimeCategory = description.includes('anime');
    const companionType = isAnimeCategory ? 'anime' : 'realistic';
    const sex = 'female';

    let ethnicity = 'white';
    if (description.includes('black')) ethnicity = 'black';
    else if (description.includes('asian')) ethnicity = 'asian';
    else if (description.includes('hispanic')) ethnicity = 'hispanic';
    else if (description.includes('korean')) ethnicity = 'korean';

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

    // Call Netlify function to test Absolute Reality
    console.log('🔥 Generating EXPLICIT avatar with Absolute Reality v1.8.1...');

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

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Function error:', response.status);
      console.error('📝 Error details:', errorText.substring(0, 300));
      return;
    }

    const result = await response.json();
    console.log('📦 Function result success:', result.success);

    if (result.success && result.data?.imageUrl) {
      console.log('\n🎉 SUCCESS! Absolute Reality v1.8.1 WORKS!');
      console.log('🖼️ Generated image URL:', result.data.imageUrl);
      console.log('🔥 Ready to update complete-avatar-solution-v3.js!');

      // Test image download
      console.log('\n⬇️ Testing image download...');
      const imageResponse = await fetch(result.data.imageUrl);
      if (imageResponse.ok) {
        console.log('✅ Image download successful!');
        console.log('📊 Size:', imageResponse.headers.get('content-length'), 'bytes');
      }
    } else {
      console.log('\n❌ Function returned but no image URL');
      console.log('📦 Result:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('💥 Test error:', error.message);
  }
}

testSingleCompanion().catch(console.error);