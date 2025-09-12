// Manually create user in Airtable via Netlify function
const https = require('https');

async function createUserManually() {
  const userData = {
    email: 'emailnotiseb@gmail.com',
    authID: 'google-oauth2|110738284325422051851',
    name: 'Email Notifications' // From Auth0 data you showed
  };
  
  console.log('👤 Creating user manually:', userData);

  // Use the save-chat-message function which has user creation logic
  const testData = {
    user_email: userData.email,
    user_uid: userData.authID,
    user_token: 'manual_creation',
    char: 'orion-nightfall',
    user_message: 'Test message to create user account',
    ai_response: 'Test response to create user account'
  };
  
  const result = await callAPI('save-chat-message', testData);
  
  console.log('📊 User creation result:', result.status);
  console.log('📨 Response:', JSON.stringify(result.data, null, 2));
  
  if (result.status === 200) {
    console.log('✅ Success! User should now exist in Airtable.');
    console.log('🧪 Try chatting again - memory should work now!');
  } else {
    console.log('❌ Failed to create user. Check the error details above.');
  }
}

async function callAPI(endpoint, data) {
  return new Promise((resolve, reject) => {
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

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

createUserManually().catch(console.error);