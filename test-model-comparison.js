const fetch = require('node-fetch');

// Test script to compare FLUX vs Absolute Reality with identical prompts
async function testModels() {
  console.log('🔬 Testing FLUX vs Absolute Reality with identical prompts...\n');

  const testPrompt = "Beautiful sexy white female, seductive expression, revealing clothing, sensual pose, attractive, photorealistic, flirtatious expression, seductive pose, wearing sexy lingerie, attractive body, bedroom or intimate setting, full body or upper body shot, sensual photography, attractive model, soft romantic lighting, glamour photography style, alluring pose, eye contact, sharp focus, professional photography, shallow depth of field, sexy photoshoot, single person, solo, one woman only";

  console.log(`📝 Test prompt: ${testPrompt}\n`);

  // Test 1: FLUX dev model (what worked before)
  console.log('🧪 Test 1: FLUX dev model');
  try {
    const fluxResponse = await fetch('https://selira.ai/.netlify/functions/generate-avatar-replicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customPrompt: testPrompt,
        characterName: "Test Aurora",
        category: "realistic",
        style: "realistic",
        shotType: "portrait",
        sex: "female",
        ethnicity: "white",
        hairLength: "medium",
        hairColor: "black",
        useFlux: true // Force FLUX if there's such option
      })
    });

    if (fluxResponse.ok) {
      const fluxResult = await fluxResponse.json();
      console.log('✅ FLUX result:', fluxResult.imageUrl || 'No image URL');
    } else {
      const errorText = await fluxResponse.text();
      console.log('❌ FLUX failed:', fluxResponse.status, errorText);
    }
  } catch (error) {
    console.log('❌ FLUX error:', error.message);
  }

  console.log('\n⏳ Waiting 10 seconds between tests...\n');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Test 2: Absolute Reality (current setup)
  console.log('🧪 Test 2: Absolute Reality v1.8.1');
  try {
    const absoluteResponse = await fetch('https://selira.ai/.netlify/functions/generate-avatar-replicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customPrompt: testPrompt,
        characterName: "Test Aurora",
        category: "realistic",
        style: "realistic",
        shotType: "portrait",
        sex: "female",
        ethnicity: "white",
        hairLength: "medium",
        hairColor: "black"
      })
    });

    if (absoluteResponse.ok) {
      const absoluteResult = await absoluteResponse.json();
      console.log('✅ Absolute Reality result:', absoluteResult.imageUrl || 'No image URL');
    } else {
      const errorText = await absoluteResponse.text();
      console.log('❌ Absolute Reality failed:', absoluteResponse.status, errorText);
    }
  } catch (error) {
    console.log('❌ Absolute Reality error:', error.message);
  }

  console.log('\n🔬 Comparison complete!');
  console.log('\n💡 Key observations to look for:');
  console.log('   - FLUX might generate more sensual/sexy results');
  console.log('   - Absolute Reality might be too conservative despite being "uncensored"');
  console.log('   - Different models have different prompt interpretation');
}

testModels().catch(console.error);