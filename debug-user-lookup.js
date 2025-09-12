// Quick debug script to test user lookup
const https = require('https');

async function debugUserLookup() {
  const testData = {
    user_email: 'emailnotiseb@gmail.com',
    user_uid: 'google-oauth2|110738284325422051851',
    user_token: 'auth0_authenticated',
    char: 'orion-nightfall',
    user_message: 'debug test',
    ai_response: 'debug response'
  };
  
  console.log('🔍 Testing user lookup with:', {
    email: testData.user_email,
    uid: testData.user_uid
  });
  
  const postData = JSON.stringify(testData);
  
  const options = {
    hostname: 'selira.ai',
    port: 443,
    path: '/.netlify/functions/save-chat-message',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log('📊 Response Status:', res.statusCode);
        console.log('📨 Response Data:', responseData);
        
        try {
          const parsed = JSON.parse(responseData);
          console.log('✅ Parsed Response:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('❌ Failed to parse JSON, raw response:', responseData);
        }
        
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

debugUserLookup().catch(console.error);