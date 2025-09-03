// Add one test character to Selira for chat testing

const fetch = require('node-fetch');

const SELIRA_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
const SELIRA_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

async function addTestCharacter() {
  console.log('🚀 Adding test character to Selira...');
  
  const testCharacter = {
    fields: {
      Name: "Emerald",
      Slug: "emerald", 
      Title: "Mindful Companion",
      Description: "A supportive AI companion who helps with daily thoughts and meaningful conversations.",
      Personality: "You are Emerald, a warm and supportive mindful companion. You help people process their daily thoughts and experiences in a caring, non-judgmental way. You're great at listening, asking thoughtful questions, and helping people find clarity in their thinking. Keep conversations natural and supportive.",
      Category: "Friendship",
      Tags: ["Popular", "Supportive", "Mindful"],
      Visibility: "public",
      IsActive: true,
      CreatedAt: new Date().toISOString()
    }
  };
  
  try {
    const response = await fetch(`https://api.airtable.com/v0/${SELIRA_BASE_ID}/Characters`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SELIRA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCharacter)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test character added successfully!');
      console.log('📋 Character details:', {
        name: result.fields.Name,
        slug: result.fields.Slug,
        id: result.id
      });
      
      // Test the characters function
      console.log('\n🧪 Testing characters function...');
      const testUrl = `https://selira.ai/.netlify/functions/characters`;
      const testResponse = await fetch(testUrl);
      
      if (testResponse.ok) {
        const data = await testResponse.json();
        console.log(`✅ Characters function works: Found ${data.characters?.length || 0} characters`);
      } else {
        console.log('❌ Characters function test failed');
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ Failed to add character:', response.status);
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

addTestCharacter();