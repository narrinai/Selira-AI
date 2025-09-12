// Debug what's actually in the Users table
const https = require('https');

async function debugUserRecords() {
  console.log('🔍 Debugging User Records in Airtable\n');

  // Test with both possible Auth0 ID formats
  const testLookups = [
    {
      name: 'Full Auth0 ID',
      auth0_id: 'google-oauth2|110738284325422051851',
      email: 'emailnotiseb@gmail.com'
    },
    {
      name: 'Just the number part',
      auth0_id: '110738284325422051851',
      email: 'emailnotiseb@gmail.com'
    }
  ];

  for (const test of testLookups) {
    console.log(`\n📋 Testing: ${test.name}`);
    console.log(`   Auth0 ID: ${test.auth0_id}`);
    console.log(`   Email: ${test.email}`);

    const result = await testSaveChatMessage({
      user_email: test.email,
      user_uid: test.auth0_id,
      user_token: 'debug_test',
      char: 'orion-nightfall',
      user_message: 'debug test message',
      ai_response: 'debug test response'
    });

    console.log(`   Result: ${result.status}`);
    if (result.status === 200) {
      console.log(`   ✅ SUCCESS - This Auth0 ID format works!`);
      console.log(`   Response:`, result.data);
    } else if (result.status === 404) {
      console.log(`   ❌ User not found with this Auth0 ID format`);
      console.log(`   Error:`, result.data?.error);
    } else {
      console.log(`   ⚠️ Other error:`, result.data);
    }
  }

  // Also test the debug endpoint to see all users
  console.log(`\n📊 Getting list of recent users for comparison:`);
  
  const debugResult = await callAPI('debug-airtable', {
    table: 'Users',
    action: 'list_recent',
    limit: 5
  });

  if (debugResult.status === 200 && debugResult.data.records) {
    console.log(`   Found ${debugResult.data.records.length} recent users:`);
    debugResult.data.records.forEach((user, i) => {
      console.log(`   User ${i + 1}:`);
      console.log(`     Email: ${user.fields.Email}`);
      console.log(`     Auth0ID: ${user.fields.Auth0ID || 'EMPTY'}`);
      console.log(`     ID: ${user.id}`);
    });
  } else {
    console.log(`   Debug failed:`, debugResult.data);
  }

  console.log(`\n🎯 Conclusions:`);
  console.log(`   If any test shows SUCCESS, that's the correct Auth0 ID format.`);
  console.log(`   If all fail, check the Auth0ID field in your Users table manually.`);
}

async function testSaveChatMessage(data) {
  return callAPI('save-chat-message', data);
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

debugUserRecords().catch(console.error);