// Test specifically for the emailnotiseb@gmail.com user
const https = require('https');

async function testSpecificUser() {
  console.log('🔍 Testing specific user lookup strategies');
  
  const userData = {
    email: 'emailnotiseb@gmail.com',
    authID: 'google-oauth2|110738284325422051851'
  };
  
  console.log('👤 Target user:', userData);

  // Test 1: Try the memory function which should work
  console.log('\n📋 Test 1: Memory function (shows user lookup strategy)');
  
  const memoryTest = await callAPI('memory', {
    action: 'get_memories',
    user_uid: userData.authID,
    user_email: userData.email,
    character_slug: 'orion-nightfall'
  });
  
  console.log('Memory function result:', memoryTest.status, memoryTest.data);

  // Test 2: Try memory debug for more details
  console.log('\n🔍 Test 2: Memory debug (detailed info)');
  
  const debugTest = await callAPI('memory-debug', {
    action: 'get_memories', 
    user_uid: userData.authID,
    character_slug: 'orion-nightfall'
  });
  
  console.log('Debug result:', debugTest.status, JSON.stringify(debugTest.data, null, 2));

  // Test 3: Test the analyze-memory function (should always work)
  console.log('\n🧠 Test 3: Analyze memory (should work)');
  
  const analyzeTest = await callAPI('analyze-memory', {
    message: 'My name is Sebastiaan and I love testing',
    context: 'Debug test'
  });
  
  console.log('Analysis result:', analyzeTest.status, analyzeTest.data?.analysis);
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

testSpecificUser().catch(console.error);