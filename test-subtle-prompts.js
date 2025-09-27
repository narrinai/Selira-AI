const fetch = require('node-fetch');

// Test subtle vs explicit prompts
async function testSubtlePrompts() {
  console.log('🧪 Testing subtle vs explicit prompts...\n');

  const prompts = [
    // Current explicit (niet werkend)
    "Beautiful sexy white female, seductive expression, revealing clothing, sensual pose, attractive, photorealistic, flirtatious expression, seductive pose, wearing bikini, attractive body",

    // Subtiele versie 1
    "Beautiful white woman, confident expression, stylish outfit, elegant pose, attractive, photorealistic, charming smile, fashionable clothing, attractive appearance",

    // Subtiele versie 2
    "Attractive white woman, alluring gaze, form-fitting dress, graceful pose, beautiful, photorealistic, captivating smile, figure-hugging outfit, stunning appearance",

    // Subtiele versie 3 (fashion focus)
    "Beautiful white woman, confident pose, designer bikini, beach photography, attractive, professional photoshoot, glamorous style, summer fashion, model pose"
  ];

  for (let i = 0; i < prompts.length; i++) {
    console.log(`\n🧪 Test ${i + 1}: ${prompts[i].substring(0, 50)}...`);

    try {
      const response = await fetch('https://selira.ai/.netlify/functions/generate-avatar-replicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customPrompt: prompts[i],
          characterName: "Test Woman",
          category: "realistic",
          style: "realistic",
          shotType: "portrait",
          sex: "female",
          ethnicity: "white",
          hairLength: "medium",
          hairColor: "brown"
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Success: ${result.imageUrl || 'No URL'}`);
      } else {
        const errorText = await response.text();
        console.log(`❌ Failed: ${response.status} - ${errorText.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    if (i < prompts.length - 1) {
      console.log('⏳ Waiting 10 seconds...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  console.log('\n✅ Test complete! Compare the results to see which approach works best.');
}

testSubtlePrompts().catch(console.error);