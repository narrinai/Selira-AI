const fetch = require('node-fetch');

// Simple test for Absolute Reality v1.8.1 on Replicate
async function testAbsoluteReality() {
  console.log('🧪 Testing Absolute Reality v1.8.1 on Replicate...\n');

  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN_SELIRA || process.env.REPLICATE_API_TOKEN;

  if (!REPLICATE_API_TOKEN) {
    console.error('❌ REPLICATE_API_TOKEN not found in environment (checked both REPLICATE_API_TOKEN_SELIRA and REPLICATE_API_TOKEN)');
    return;
  }

  console.log('🔑 Using Replicate API token:', REPLICATE_API_TOKEN.substring(0, 8) + '...');

  // Test prompt
  const testPrompt = 'Beautiful sexy white female, seductive expression, revealing clothing, sensual pose, attractive, photorealistic, glamour photography style, professional photography, single person';

  console.log('🎨 Test prompt:', testPrompt);
  console.log('🔨 Using model: asiryan/absolutereality-v1.8.1\n');

  try {
    // Call Replicate API directly without version hash (let Replicate use latest)
    console.log('📡 Calling Replicate API...');

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: "asiryan/absolutereality-v1.8.1", // Try without hash first
        input: {
          prompt: testPrompt,
          negative_prompt: 'low quality, blurry, bad anatomy, multiple people, crowd, group',
          width: 768,
          height: 768,
          num_outputs: 1,
          num_inference_steps: 25,
          guidance_scale: 7.5
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Replicate API error:', response.status, errorText);

      // If direct model name fails, try to get the latest version
      console.log('\n🔄 Trying to get model versions...');

      const modelResponse = await fetch('https://api.replicate.com/v1/models/asiryan/absolutereality-v1.8.1', {
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`
        }
      });

      if (modelResponse.ok) {
        const modelData = await modelResponse.json();
        console.log('📊 Model info:', {
          name: modelData.name,
          latest_version: modelData.latest_version?.id
        });

        if (modelData.latest_version?.id) {
          console.log(`\n🔄 Retrying with version hash: ${modelData.latest_version.id}`);

          const retryResponse = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
              'Authorization': `Token ${REPLICATE_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              version: modelData.latest_version.id,
              input: {
                prompt: testPrompt,
                negative_prompt: 'low quality, blurry, bad anatomy, multiple people, crowd, group',
                width: 768,
                height: 768,
                num_outputs: 1,
                num_inference_steps: 25,
                guidance_scale: 7.5
              }
            })
          });

          if (retryResponse.ok) {
            const prediction = await retryResponse.json();
            console.log('✅ Prediction created:', prediction.id);
            console.log('🔗 Version hash:', modelData.latest_version.id);
            return;
          }
        }
      }

      return;
    }

    const prediction = await response.json();
    console.log('✅ Prediction created:', prediction.id);

    // Wait for completion
    console.log('⏳ Waiting for generation to complete...');

    let result = prediction;
    let attempts = 0;
    const maxAttempts = 45;

    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`
        }
      });

      if (statusResponse.ok) {
        result = await statusResponse.json();
        console.log(`📊 [${attempts}/${maxAttempts}] Status: ${result.status}`);
      }
    }

    if (result.status === 'succeeded') {
      console.log('\n🎉 SUCCESS!');
      console.log('🖼️ Generated image:', result.output?.[0]);
      console.log('⚡ Absolute Reality v1.8.1 works on Replicate!');
    } else if (result.status === 'failed') {
      console.log('\n❌ FAILED!');
      console.log('💥 Error:', result.error);
    } else {
      console.log('\n⏰ TIMEOUT!');
      console.log('📊 Final status:', result.status);
    }

  } catch (error) {
    console.error('💥 Test error:', error.message);
  }
}

// Run the test
testAbsoluteReality().catch(console.error);