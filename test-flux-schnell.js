const fetch = require('node-fetch');

// Test FLUX Schnell for speed and NSFW capability
async function testFluxSchnell() {
  console.log('⚡ Testing FLUX Schnell for speed and sexy content...\n');

  const prompt = "Beautiful sexy white female, seductive expression, revealing clothing, sensual pose, attractive, photorealistic, flirtatious expression, wearing bikini, attractive body";

  console.log(`📝 Test prompt: ${prompt}\n`);

  const startTime = Date.now();

  try {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN_SELIRA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: "c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e", // FLUX Schnell
        input: {
          prompt: prompt,
          width: 768,
          height: 768,
          num_outputs: 1,
          num_inference_steps: 4  // Schnell should be fast with 4 steps
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Failed to start: ${response.status} - ${errorText}`);
      return;
    }

    const prediction = await response.json();
    console.log(`📊 Prediction started: ${prediction.id}`);

    // Poll for completion
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds should be enough for Schnell

    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN_SELIRA}` }
      });

      if (statusResponse.ok) {
        result = await statusResponse.json();
        console.log(`⏳ [${attempts}s] Status: ${result.status}`);
      }
    }

    const endTime = Date.now();
    const totalTime = Math.round((endTime - startTime) / 1000);

    if (result.status === 'succeeded') {
      console.log(`\n✅ SUCCESS! Generated in ${totalTime} seconds`);
      console.log(`🔗 Image URL: ${result.output?.[0] || 'No URL'}`);
      console.log(`⚡ FLUX Schnell is MUCH faster than uncensored model!`);
    } else if (result.status === 'failed') {
      console.log(`\n❌ FAILED: ${result.error || 'Unknown error'}`);
    } else {
      console.log(`\n⏱️ TIMEOUT after ${totalTime} seconds`);
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testFluxSchnell().catch(console.error);