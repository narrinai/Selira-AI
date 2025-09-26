const fetch = require('node-fetch');

async function testAbsoluteRealityDirect() {
  console.log('🧪 Testing Absolute Reality v1.8.1 directly...\n');

  // Check for Replicate token from environment
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || 'YOUR_TOKEN_HERE';

  if (REPLICATE_API_TOKEN === 'YOUR_TOKEN_HERE') {
    console.log('⚠️ No Replicate token found in environment.');
    console.log('💡 Set REPLICATE_API_TOKEN environment variable or add it to .env file');
    console.log('🔧 You can get a token from: https://replicate.com/account/api-tokens');
    return;
  }

  console.log('🔑 Using Replicate API token:', REPLICATE_API_TOKEN.substring(0, 8) + '...');

  // Test prompt (explicit but not too explicit for initial test)
  const testPrompt = 'Beautiful sexy white female, seductive expression, revealing clothing, sensual pose, attractive, photorealistic, glamour photography style, professional photography, single person';

  console.log('🎨 Test prompt:', testPrompt);
  console.log('🔨 Using model: asiryan/absolutereality-v1.8.1\\n');

  try {
    // First try: Call Replicate API directly with model name
    console.log('📡 Calling Replicate API...');

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: "asiryan/absolutereality-v1.8.1",
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

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Replicate API error:', response.status, errorText);

      // If direct model name fails, try to get the latest version
      console.log('\\n🔄 Trying to get model versions...');

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
          console.log(`\\n🔄 Retrying with version hash: ${modelData.latest_version.id}`);

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
            console.log('✅ Prediction created with version hash:', prediction.id);
            console.log('🔗 Version hash used:', modelData.latest_version.id);

            // Wait for completion
            const finalResult = await waitForCompletion(prediction.id, REPLICATE_API_TOKEN);
            return finalResult;
          } else {
            const retryError = await retryResponse.text();
            console.error('❌ Retry failed:', retryResponse.status, retryError);
          }
        }
      }

      return;
    }

    const prediction = await response.json();
    console.log('✅ Prediction created:', prediction.id);

    // Wait for completion
    const finalResult = await waitForCompletion(prediction.id, REPLICATE_API_TOKEN);
    return finalResult;

  } catch (error) {
    console.error('💥 Test error:', error.message);
  }
}

async function waitForCompletion(predictionId, token) {
  console.log('⏳ Waiting for generation to complete...');

  let attempts = 0;
  const maxAttempts = 60; // 2 minutes max

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;

    try {
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });

      if (statusResponse.ok) {
        const result = await statusResponse.json();
        console.log(`📊 [${attempts}/${maxAttempts}] Status: ${result.status}`);

        if (result.status === 'succeeded') {
          console.log('\\n🎉 SUCCESS!');
          console.log('🖼️ Generated image:', result.output?.[0]);
          console.log('⚡ Absolute Reality v1.8.1 works on Replicate!');
          console.log('\\n🔥 Ready to update Netlify functions and avatar generation scripts!');
          return true;
        } else if (result.status === 'failed') {
          console.log('\\n❌ FAILED!');
          console.log('💥 Error:', result.error);
          return false;
        }
      } else {
        console.log(`⚠️ Status check failed: ${statusResponse.status}`);
      }
    } catch (error) {
      console.log(`⚠️ Status check error: ${error.message}`);
    }
  }

  console.log('\\n⏰ TIMEOUT!');
  console.log('📊 Exceeded maximum wait time');
  return false;
}

testAbsoluteRealityDirect().catch(console.error);