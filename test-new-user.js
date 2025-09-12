// Test the new user that was just created
const https = require('https');

async function testNewUser() {
  console.log('🧪 Testing newly created user');
  
  const newUser = {
    email: 'info@narrin.ai',
    auth0_id: 'google-oauth2|101391091673592003021',
    user_id: 'rec4dtew8RBQ2GtCt' // From registration logs
  };
  
  console.log('👤 New user data:', newUser);

  // Test 1: Test save-chat-message with new user
  console.log('\n💬 Test 1: save-chat-message');
  
  const saveResult = await callAPI('save-chat-message', {
    user_email: newUser.email,
    user_uid: newUser.auth0_id,
    user_token: 'test_token',
    char: 'orion-nightfall',
    user_message: 'My name is Sebastiaan and I am 30 years old',
    ai_response: 'Nice to meet you Sebastiaan!'
  });
  
  console.log('   Status:', saveResult.status);
  console.log('   Response:', JSON.stringify(saveResult.data, null, 2));

  // Test 2: Test memory retrieval
  console.log('\n🧠 Test 2: memory retrieval');
  
  const memoryResult = await callAPI('memory', {
    action: 'get_memories',
    user_uid: newUser.auth0_id,
    user_email: newUser.email,
    character_slug: 'orion-nightfall'
  });
  
  console.log('   Status:', memoryResult.status);
  console.log('   Response:', JSON.stringify(memoryResult.data, null, 2));

  // Test 3: Test sync function directly
  console.log('\n🔄 Test 3: sync-auth0-user');
  
  const syncResult = await callAPI('sync-auth0-user', {
    auth0_id: newUser.auth0_id,
    email: newUser.email,
    name: 'Sebastiaan Smits'
  });
  
  console.log('   Status:', syncResult.status);
  console.log('   Response:', JSON.stringify(syncResult.data, null, 2));
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

testNewUser().catch(console.error);