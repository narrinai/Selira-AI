// Direct Airtable API test without Netlify functions
const https = require('https');

// Environment variables would normally be loaded from .env
// Since we can't access them directly, we'll test the endpoint
console.log('🔍 Testing Direct Airtable Access via Netlify Function');

async function testDirectLookup() {
  // Test 1: Test the characters endpoint to verify Airtable connection
  console.log('\n📋 Test 1: Characters endpoint (should work)');
  
  const charactersOptions = {
    hostname: 'selira.ai',
    port: 443,
    path: '/.netlify/functions/characters',
    method: 'GET'
  };

  const charactersResult = await new Promise((resolve) => {
    const req = https.request(charactersOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('   Status:', res.statusCode);
        try {
          const parsed = JSON.parse(data);
          console.log('   Success:', parsed.success);
          console.log('   Characters found:', parsed.characters?.length || 0);
          resolve(parsed);
        } catch (e) {
          console.log('   Error parsing:', data.substring(0, 100));
          resolve(null);
        }
      });
    });
    req.on('error', (e) => {
      console.log('   Request error:', e.message);
      resolve(null);
    });
    req.end();
  });

  // Test 2: Debug the exact user lookup
  console.log('\n🔍 Test 2: Debug user lookup');
  
  const debugOptions = {
    hostname: 'selira.ai',
    port: 443,
    path: '/.netlify/functions/debug-airtable',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };

  const debugData = JSON.stringify({
    table: 'Users',
    action: 'list_recent',
    limit: 5
  });

  const debugResult = await new Promise((resolve) => {
    const req = https.request(debugOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('   Status:', res.statusCode);
        try {
          const parsed = JSON.parse(data);
          console.log('   Success:', parsed.success);
          if (parsed.records) {
            console.log('   Recent users found:', parsed.records.length);
            parsed.records.forEach((record, i) => {
              console.log(`   User ${i + 1}:`, {
                email: record.fields.Email,
                authID: record.fields.AuthID,
                id: record.id
              });
            });
          }
          resolve(parsed);
        } catch (e) {
          console.log('   Error parsing:', data.substring(0, 100));
          resolve(null);
        }
      });
    });
    req.on('error', (e) => {
      console.log('   Request error:', e.message);
      resolve(null);
    });
    req.write(debugData);
    req.end();
  });

  // Test 3: Test memory function directly
  console.log('\n🧠 Test 3: Memory function direct test');
  
  const memoryOptions = {
    hostname: 'selira.ai',
    port: 443,
    path: '/.netlify/functions/memory',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };

  const memoryData = JSON.stringify({
    action: 'get_memories',
    user_uid: 'google-oauth2|110738284325422051851',
    user_email: 'emailnotiseb@gmail.com',
    character_slug: 'orion-nightfall'
  });

  await new Promise((resolve) => {
    const req = https.request(memoryOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('   Status:', res.statusCode);
        try {
          const parsed = JSON.parse(data);
          console.log('   Memory result:', JSON.stringify(parsed, null, 2));
          resolve(parsed);
        } catch (e) {
          console.log('   Error parsing:', data.substring(0, 200));
          resolve(null);
        }
      });
    });
    req.on('error', (e) => {
      console.log('   Request error:', e.message);
      resolve(null);
    });
    req.write(memoryData);
    req.end();
  });

  console.log('\n🎯 Summary:');
  console.log('If all tests pass, Airtable connection works.');
  console.log('If user lookup fails, the AuthID might not exist in Airtable yet.');
  console.log('Next step: Check your Airtable Users table manually.');
}

testDirectLookup();