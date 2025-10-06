// Test Mona's exact parameters
const fetch = require('node-fetch');

async function testMona() {
  console.log(`\n🧪 Testing Mona's exact parameters...`);

  const response = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customPrompt: 'attractive face, seductive expression, alluring pose, wearing exposed breasts outfit, photorealistic, professional photography, soft romantic lighting',
      characterName: 'Mona Test',
      category: 'realistic',
      style: 'realistic',
      shotType: 'portrait',
      sex: 'female',
      ethnicity: 'japanese',
      hairLength: 'medium',
      hairColor: 'purple'
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
  console.log(`\n📊 Analysis:`);
  if (result.isAnimeStyle) {
    console.log(`   ❌ PROBLEM: Generated ANIME style`);
  } else {
    console.log(`   ✅ Generated REALISTIC style`);
  }
}

testMona().catch(console.error);
