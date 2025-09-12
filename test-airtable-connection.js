#!/usr/bin/env node

// Simple test to verify Airtable connection and data structure

const https = require('https');

console.log('🔗 Testing Airtable Connection for Memory System');

// Helper function to test API endpoint
async function testEndpoint(endpoint, data, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`📡 Endpoint: ${endpoint}`);
  
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
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Success: ${parsed.success}`);
          
          if (parsed.success) {
            console.log(`   ✅ ${description} - WORKING`);
            if (parsed.memories) {
              console.log(`   📊 Found ${parsed.memories.length} memories`);
            }
            if (parsed.analysis) {
              console.log(`   🧠 Analysis: ${parsed.analysis.memory_importance}/10 importance`);
            }
          } else {
            console.log(`   ❌ ${description} - FAILED`);
            console.log(`   Error: ${parsed.error}`);
          }
          
          resolve(parsed);
        } catch (e) {
          console.log(`   ❌ JSON Parse Error: ${e.message}`);
          console.log(`   Raw response: ${responseData.substring(0, 200)}...`);
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Request Error: ${error.message}`);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  try {
    // Test 1: Message Analysis
    await testEndpoint('analyze-memory', {
      message: 'My name is TestUser and I love testing systems',
      context: 'Connection test'
    }, 'Message Analysis');

    // Test 2: Memory Retrieval
    await testEndpoint('memory', {
      action: 'get_memories',
      user_uid: 'test-user-12345',
      character_slug: 'luna'
    }, 'Memory Retrieval');

    // Test 3: Memory Debug
    await testEndpoint('memory-debug', {
      action: 'get_memories',
      user_uid: 'test-user-12345', 
      character_slug: 'luna'
    }, 'Memory Debug Info');

    // Test 4: Character Data (for context)
    await testEndpoint('characters', {}, 'Character Data Fetch');

    console.log('\n🎯 Connection Test Summary:');
    console.log('✅ If all tests show "WORKING", your memory system is properly connected!');
    console.log('❌ If any show "FAILED", check your Airtable configuration and Netlify functions.');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Run: node test-memory-system.js (for detailed analysis testing)');
    console.log('2. Run: node test-chat-memory.js (for interactive chat testing)');
    console.log('3. Test on live site: selira.ai/chat with real conversations');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

runTests();