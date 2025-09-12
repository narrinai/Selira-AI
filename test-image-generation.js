// Test image generation function
const https = require('https');

async function testImageGeneration() {
  console.log('🎨 Testing Image Generation Function');
  
  const testData = {
    customPrompt: 'beautiful portrait',
    characterName: 'Test Character',
    category: 'realistic',
    style: 'realistic',
    shotType: 'portrait',
    sex: 'female',
    ethnicity: 'white',
    hairLength: 'medium',
    hairColor: 'brown'
  };
  
  console.log('📋 Test data:', testData);

  const result = await callAPI('generate-custom-image', testData);
  
  console.log('📊 Result status:', result.status);
  console.log('📨 Result data:', JSON.stringify(result.data, null, 2));
  
  if (result.status === 200) {
    console.log('✅ Image generation working!');
  } else if (result.status === 500) {
    console.log('❌ Image generation has internal error');
    console.log('🔍 Check if error shows token issues or API problems');
  } else {
    console.log('⚠️ Unexpected status:', result.status);
  }
}

async function callAPI(endpoint, data) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'selira.ai',
      port: 443,
      path: `/.netlify/functions/${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', () => {
      resolve({ status: 500, data: { error: 'Request failed' } });
    });

    req.write(postData);
    req.end();
  });
}

testImageGeneration().catch(console.error);