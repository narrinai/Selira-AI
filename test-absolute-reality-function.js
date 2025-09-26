const fetch = require('node-fetch');

async function testAbsoluteRealityFunction() {
  console.log('🧪 Testing Absolute Reality v1.8.1 through Netlify function...\n');

  const netlifyUrl = 'https://narrinai.netlify.app/.netlify/functions/selira-generate-custom-image';

  const testPayload = {
    companion_type: 'realistic',
    sex: 'female',
    ethnicity: 'white',
    hair_length: 'long',
    hair_color: 'blonde',
    category: 'cooking',
    explicit: true
  };

  console.log('🎯 Test payload:', testPayload);
  console.log('🌐 Calling Netlify function...');

  try {
    const response = await fetch(netlifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Function error:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Function response:', JSON.stringify(result, null, 2));

    if (result.success && result.data?.imageUrl) {
      console.log('\n🎉 SUCCESS! Absolute Reality v1.8.1 works!');
      console.log('🖼️ Generated image:', result.data.imageUrl);
    } else {
      console.log('\n⚠️ Function returned but no image URL');
    }

  } catch (error) {
    console.error('💥 Test error:', error.message);
  }
}

testAbsoluteRealityFunction().catch(console.error);