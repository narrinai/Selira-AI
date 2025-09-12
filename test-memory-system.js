#!/usr/bin/env node

// Test script for Selira AI Memory System
// Usage: node test-memory-system.js

const https = require('https');

// Test configuration
const BASE_URL = 'https://selira.ai/.netlify/functions';
const TEST_USER_ID = 'test-user-' + Date.now();
const TEST_CHARACTER = 'aragorn'; // Use existing character

console.log('🧪 Starting Memory System Test');
console.log('📋 Test Config:', {
  baseUrl: BASE_URL,
  userId: TEST_USER_ID,
  character: TEST_CHARACTER
});

// Helper function to make API calls
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

// Test scenarios
const testMessages = [
  {
    message: "My name is Sarah and I'm 25 years old",
    expected: { importance: 8, tags: ['personal_info'], emotion: 'neutral' }
  },
  {
    message: "I love fantasy books and adventure stories",
    expected: { importance: 6, tags: ['preference'], emotion: 'happy' }
  },
  {
    message: "Do you remember what my name is?",
    expected: { importance: 2, tags: ['memory_check'], emotion: 'neutral' }
  },
  {
    message: "Hello, how are you?",
    expected: { importance: 1, tags: ['casual'], emotion: 'neutral' }
  },
  {
    message: "I'm feeling really excited about my new job!",
    expected: { importance: 5, tags: ['emotional', 'personal_info'], emotion: 'excited' }
  }
];

// Main test function
async function runMemoryTests() {
  try {
    console.log('\n🔬 Testing Memory Analysis...\n');
    
    for (let i = 0; i < testMessages.length; i++) {
      const test = testMessages[i];
      console.log(`📝 Test ${i + 1}: "${test.message}"`);
      
      try {
        // Test message analysis
        const analysisResult = await callAPI('analyze-memory', {
          message: test.message,
          context: 'Testing memory system'
        });
        
        console.log(`   Status: ${analysisResult.status}`);
        
        if (analysisResult.status === 200 && analysisResult.data.success) {
          const analysis = analysisResult.data.analysis;
          console.log(`   ✅ Importance: ${analysis.memory_importance} (expected: ~${test.expected.importance})`);
          console.log(`   ✅ Emotion: ${analysis.emotional_state} (expected: ${test.expected.emotion})`);
          console.log(`   ✅ Tags: [${analysis.memory_tags.join(', ')}]`);
          console.log(`   ✅ Summary: "${analysis.summary}"`);
          console.log(`   ✅ Method: ${analysisResult.data.method}`);
        } else {
          console.log(`   ❌ Failed:`, analysisResult.data);
        }
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      console.log('');
    }
    
    console.log('\n🔍 Testing Memory Retrieval...\n');
    
    // Test memory retrieval
    try {
      const memoryResult = await callAPI('memory', {
        action: 'get_memories',
        user_uid: TEST_USER_ID,
        character_slug: TEST_CHARACTER
      });
      
      console.log(`Memory retrieval status: ${memoryResult.status}`);
      
      if (memoryResult.status === 200 && memoryResult.data.success) {
        console.log(`✅ Found ${memoryResult.data.memories.length} memories`);
        
        if (memoryResult.data.memories.length > 0) {
          console.log('📋 Sample memory:');
          const memory = memoryResult.data.memories[0];
          console.log(`   - Summary: "${memory.summary}"`);
          console.log(`   - Importance: ${memory.importance}`);
          console.log(`   - Emotion: ${memory.emotional_state}`);
          console.log(`   - Tags: [${memory.tags.join(', ')}]`);
        }
      } else {
        console.log('❌ Memory retrieval failed:', memoryResult.data);
      }
      
    } catch (error) {
      console.log(`❌ Memory retrieval error: ${error.message}`);
    }
    
    console.log('\n🎯 Testing Memory Debug...\n');
    
    // Test memory debug function
    try {
      const debugResult = await callAPI('memory-debug', {
        action: 'get_memories',
        user_uid: TEST_USER_ID,
        character_slug: TEST_CHARACTER
      });
      
      console.log(`Debug status: ${debugResult.status}`);
      
      if (debugResult.status === 200 && debugResult.data.success) {
        console.log('✅ Debug info:', {
          totalRecords: debugResult.data.debug.recordAnalysis.length,
          matchingRecords: debugResult.data.debug.matchingRecordsCount,
          hasMemoryData: debugResult.data.debug.recordAnalysis.filter(r => r.HasMemoryData).length
        });
      } else {
        console.log('❌ Debug failed:', debugResult.data);
      }
      
    } catch (error) {
      console.log(`❌ Debug error: ${error.message}`);
    }
    
    console.log('\n✅ Memory System Test Complete!\n');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run tests
runMemoryTests();