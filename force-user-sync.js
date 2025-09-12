// Force sync the current Auth0 user to Airtable
const https = require('https');

async function forceSyncUser() {
  console.log('🔄 Force syncing Auth0 user to Airtable...');
  
  const userData = {
    auth0_id: 'google-oauth2|110738284325422051851',
    email: 'emailnotiseb@gmail.com',
    name: 'Email Notifications',
    nickname: 'emailnotiseb'
  };
  
  console.log('👤 Syncing user:', userData);

  const result = await callAPI('sync-auth0-user', userData);
  
  console.log('📊 Sync result:', result.status);
  console.log('📨 Response:', JSON.stringify(result.data, null, 2));
  
  if (result.status === 200) {
    console.log('✅ Sync successful! Try chatting again.');
    
    // Now test if save-chat-message works
    console.log('\n🧪 Testing save-chat-message after sync...');
    
    const chatTest = await callAPI('save-chat-message', {
      user_email: userData.email,
      user_uid: userData.auth0_id,
      user_token: 'test_token',
      char: 'orion-nightfall',
      user_message: 'Test message after sync',
      ai_response: 'Test response after sync'
    });
    
    console.log('💬 Chat save result:', chatTest.status);
    console.log('📨 Chat response:', JSON.stringify(chatTest.data, null, 2));
    
    if (chatTest.status === 200) {
      console.log('🎉 SUCCESS! Memory system should now work!');
    }
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

forceSyncUser().catch(console.error);