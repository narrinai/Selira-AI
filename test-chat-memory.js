#!/usr/bin/env node

// Interactive Chat Memory Test
// Simulates a real conversation to test memory persistence

const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Test configuration
const TEST_USER_ID = 'memory-test-user';
const TEST_CHARACTER = 'luna'; // Use a common character

console.log('🎭 Interactive Chat Memory Test');
console.log('💬 Testing with character:', TEST_CHARACTER);
console.log('👤 Test user ID:', TEST_USER_ID);
console.log('\n📝 Type messages to test memory system');
console.log('💡 Try messages like:');
console.log('   - "My name is John"');
console.log('   - "I love fantasy books"'); 
console.log('   - "Do you remember my name?"');
console.log('   - Type "quit" to exit\n');

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

// Function to analyze a message
async function analyzeMessage(message) {
  try {
    const result = await callAPI('analyze-memory', {
      message: message,
      context: 'Interactive test conversation'
    });
    
    if (result.status === 200 && result.data.success) {
      const analysis = result.data.analysis;
      console.log(`   🧠 Analysis:`);
      console.log(`      Importance: ${analysis.memory_importance}/10`);
      console.log(`      Emotion: ${analysis.emotional_state}`);
      console.log(`      Tags: [${analysis.memory_tags.join(', ')}]`);
      console.log(`      Summary: "${analysis.summary}"`);
      console.log(`      Method: ${result.data.method}`);
      
      // If important enough, it would be saved as memory
      if (analysis.memory_importance >= 7) {
        console.log(`   💾 This would be saved as a memory (importance >= 7)`);
      } else {
        console.log(`   📝 This would only be saved as chat history (importance < 7)`);
      }
    } else {
      console.log(`   ❌ Analysis failed:`, result.data);
    }
  } catch (error) {
    console.log(`   ❌ Error analyzing message: ${error.message}`);
  }
}

// Function to simulate a chat message
async function sendChatMessage(message) {
  try {
    const result = await callAPI('openrouter-chat', {
      message: message,
      character_slug: TEST_CHARACTER,
      auth0_id: TEST_USER_ID,
      model: 'mistralai/mistral-nemo'
    });
    
    if (result.status === 200 && result.data.success) {
      console.log(`   🤖 ${TEST_CHARACTER}: "${result.data.response.substring(0, 100)}..."`);
      console.log(`   📊 Model: ${result.data.model_used}`);
      console.log(`   💾 Saved to DB: ${result.data.saved_to_db}`);
    } else {
      console.log(`   ❌ Chat failed:`, result.data);
    }
  } catch (error) {
    console.log(`   ❌ Error sending message: ${error.message}`);
  }
}

// Function to check current memories
async function checkMemories() {
  try {
    const result = await callAPI('memory', {
      action: 'get_memories',
      user_uid: TEST_USER_ID,
      character_slug: TEST_CHARACTER
    });
    
    if (result.status === 200 && result.data.success) {
      console.log(`\n🧠 Current Memories (${result.data.memories.length}):`);
      result.data.memories.forEach((memory, index) => {
        console.log(`   ${index + 1}. "${memory.summary}" (${memory.importance}/10)`);
      });
      console.log('');
    } else {
      console.log(`   ❌ Memory check failed:`, result.data);
    }
  } catch (error) {
    console.log(`   ❌ Error checking memories: ${error.message}`);
  }
}

// Interactive chat loop
function startChat() {
  rl.question('💬 You: ', async (message) => {
    if (message.toLowerCase() === 'quit') {
      console.log('\n👋 Test session ended. Check your Airtable for saved memories!');
      rl.close();
      return;
    }
    
    if (message.toLowerCase() === 'memories') {
      await checkMemories();
      startChat();
      return;
    }
    
    if (message.toLowerCase() === 'help') {
      console.log('\n📚 Commands:');
      console.log('   - Type any message to test memory analysis');
      console.log('   - "memories" - Check current saved memories');
      console.log('   - "quit" - Exit test');
      console.log('   - "help" - Show this help\n');
      startChat();
      return;
    }
    
    console.log(`\n📝 Processing: "${message}"`);
    
    // First analyze the message
    await analyzeMessage(message);
    
    // Then send as chat message (simulates real flow)
    await sendChatMessage(message);
    
    console.log('');
    startChat();
  });
}

// Start the interactive session
console.log('💡 Type "help" for commands, "memories" to check saved memories, "quit" to exit\n');
startChat();