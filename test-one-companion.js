// Test ONE companion generation with full debug output
const fetch = require('node-fetch');

async function testCompanion() {
  // Abigail Moore - realistic companion
  const companion = {
    name: 'Abigail Moore',
    slug: 'abigail-moore',
    companion_type: 'realistic',
    sex: 'female',
    ethnicity: 'hispanic',
    hair_length: 'short',
    hair_color: 'brown',
    description: 'A charming romantic companion'
  };

  console.log(`\n🧪 Testing companion: ${companion.name}`);
  console.log(`   companion_type: "${companion.companion_type}"`);
  console.log(`   sex: "${companion.sex}"`);
  console.log(`   ethnicity: "${companion.ethnicity}"`);
  console.log(`   hair: ${companion.hair_length} ${companion.hair_color}`);

  // Build realistic prompt
  const prompt = 'attractive face, seductive expression, alluring pose, wearing sexy outfit, photorealistic, professional photography';

  console.log(`\n📤 Sending request to Netlify function...`);
  console.log(`   style: "${companion.companion_type}"`);
  console.log(`   category: "realistic"`);

  const response = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customPrompt: prompt,
      characterName: companion.name,
      category: 'realistic',
      style: companion.companion_type,
      shotType: 'portrait',
      sex: companion.sex,
      ethnicity: companion.ethnicity,
      hairLength: companion.hair_length,
      hairColor: companion.hair_color
    })
  });

  if (!response.ok) {
    console.error(`❌ Error: ${response.status}`);
    const text = await response.text();
    console.error(text);
    return;
  }

  const result = await response.json();
  console.log(`\n✅ Result:`);
  console.log(`   success: ${result.success}`);
  console.log(`   isAnimeStyle: ${result.isAnimeStyle}`);
  console.log(`   imageUrl: ${result.imageUrl}`);
  console.log(`   fullPrompt: ${result.fullPrompt.substring(0, 150)}...`);

  console.log(`\n📊 Analysis:`);
  if (result.isAnimeStyle) {
    console.log(`   ❌ PROBLEM: Generated ANIME style despite style="realistic"`);
  } else {
    console.log(`   ✅ Correct: Generated REALISTIC style`);
  }

  if (result.fullPrompt.includes('not anime')) {
    console.log(`   ✅ Prompt contains "not anime"`);
  } else {
    console.log(`   ❌ Prompt missing "not anime"`);
  }

  if (result.fullPrompt.includes('anime')) {
    console.log(`   ⚠️  Warning: Prompt contains word "anime"`);
  }
}

testCompanion().catch(console.error);
