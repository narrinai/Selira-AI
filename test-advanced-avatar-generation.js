const fetch = require('node-fetch');

// Test script for Advanced AI avatar generation
async function testAdvancedGeneration() {
  console.log('🎨 Testing Advanced AI avatar generation...\n');

  // Test cases
  const testCases = [
    {
      name: 'Anime Test',
      data: {
        customPrompt: 'Sexy anime girl, asian female, seductive pose, revealing magical girl outfit, bedroom background, ecchi style, high quality anime artwork, single character',
        characterName: 'Test Anime Girl',
        category: 'anime-manga',
        style: 'anime',
        shotType: 'portrait',
        sex: 'female',
        ethnicity: 'asian',
        hairLength: 'long',
        hairColor: 'black'
      }
    },
    {
      name: 'Realistic Test',
      data: {
        customPrompt: 'Beautiful sexy white female, seductive expression, revealing clothing, sensual pose, photorealistic, glamour photography style, professional photography, single person',
        characterName: 'Test Realistic Woman',
        category: 'realistic',
        style: 'realistic',
        shotType: 'portrait',
        sex: 'female',
        ethnicity: 'white',
        hairLength: 'medium',
        hairColor: 'blonde'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`🧪 Testing: ${testCase.name}`);
    console.log(`   Model: ${testCase.data.style === 'anime' ? 'MeinaHentai v5' : 'Absolute Reality v1.8.1'}`);
    console.log(`   Prompt: ${testCase.data.customPrompt.substring(0, 80)}...`);

    try {
      const response = await fetch('https://selira.ai/.netlify/functions/selira-generate-advanced-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.data)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`   ✅ Success: ${result.imageUrl}`);
        console.log(`   📊 Model used: ${result.model}`);
        console.log(`   🎨 Provider: ${result.provider}`);
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Failed: ${response.status} - ${errorText}`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('   ⏳ Waiting 3 seconds before next test...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('🏁 Advanced AI testing completed!');
}

// Run the test
testAdvancedGeneration().catch(console.error);