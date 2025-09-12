// Test when clean Selira functions are deployed
const https = require('https');

async function testCleanFunctions() {
  console.log('🧪 Testing Clean Selira Functions Deployment');
  
  const newUser = {
    email: 'info@narrin.ai',
    auth0_id: 'google-oauth2|101391091673592003021'
  };
  
  console.log('👤 Testing with user:', newUser.email);

  // Test 1: New sync function
  console.log('\n🔄 Test 1: selira-user-sync');
  
  const syncResult = await callAPI('selira-user-sync', {
    auth0_id: newUser.auth0_id,
    email: newUser.email,
    name: 'Sebastiaan Smits'
  });
  
  console.log('   Status:', syncResult.status);
  if (syncResult.status === 200) {
    console.log('   ✅ Sync function deployed and working!');
    console.log('   Result:', syncResult.data);
  } else if (syncResult.status === 404) {
    console.log('   ❌ Function not deployed yet');
  } else {
    console.log('   ⚠️ Function error:', syncResult.data);
  }

  // Test 2: New save function
  console.log('\n💾 Test 2: selira-save-chat');
  
  const saveResult = await callAPI('selira-save-chat', {
    email: newUser.email,
    auth0_id: newUser.auth0_id,
    character_slug: 'orion-nightfall',
    user_message: 'My name is Sebastiaan and I am 30 years old',
    ai_response: 'Nice to meet you Sebastiaan!'
  });
  
  console.log('   Status:', saveResult.status);
  if (saveResult.status === 200) {
    console.log('   ✅ Save function deployed and working!');
    console.log('   Result:', saveResult.data);
  } else if (saveResult.status === 404) {
    console.log('   ❌ Function not deployed yet');
  } else {
    console.log('   ⚠️ Function error:', saveResult.data);
  }

  // Test 3: New memory function
  console.log('\n🧠 Test 3: selira-get-memory');
  
  const memoryResult = await callAPI('selira-get-memory', {
    email: newUser.email,
    auth0_id: newUser.auth0_id,
    character_slug: 'orion-nightfall'
  });
  
  console.log('   Status:', memoryResult.status);
  if (memoryResult.status === 200) {
    console.log('   ✅ Memory function deployed and working!');
    console.log('   Memories found:', memoryResult.data?.count || 0);
  } else if (memoryResult.status === 404) {
    console.log('   ❌ Function not deployed yet');
  } else {
    console.log('   ⚠️ Function error:', memoryResult.data);
  }

  console.log('\n🎯 Deployment Status:');
  if (syncResult.status === 200 && saveResult.status === 200 && memoryResult.status === 200) {
    console.log('✅ ALL FUNCTIONS DEPLOYED! Memory system ready to re-enable.');
  } else {
    console.log('⏳ Still deploying... Try again in 1-2 minutes.');
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

testCleanFunctions().catch(console.error);